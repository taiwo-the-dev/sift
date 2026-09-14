-- Give Sift Score v2 a fair, bounded path to repeated evidence. Potentially
-- publishable agents receive their second and third scheduled observations
-- before the queue returns to broad never-checked coverage. Unknown outcomes
-- do not receive this priority because they are not scoring evidence.

begin;

create or replace function public.health_check_candidates(
  p_limit integer default 20,
  p_stale_before timestamptz default now()
)
returns table (agent_db_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  with bounds as (
    select least(greatest(coalesce(p_limit, 20), 1), 50) as row_limit
  ),
  eligible_agents as materialized (
    select distinct svc.agent_db_id
    from public.agent_services as svc
    where svc.endpoint is not null
      and svc.endpoint ~* '^https://'
      and position('?' in svc.endpoint) = 0
      and lower(trim(svc.service_type)) in ('health', 'a2a')
  )
  select eligible.agent_db_id
  from eligible_agents as eligible
  join public.agents as agent on agent.id = eligible.agent_db_id
  left join public.agent_health as health
    on health.agent_db_id = eligible.agent_db_id
  where agent.metadata_status = 'valid'
    and (
      health.last_checked_at is null
      or health.last_checked_at <= p_stale_before
    )
  order by
    (
      health.check_count between 1 and 2
      and health.status in ('online', 'degraded', 'offline')
    ) desc,
    exists (
      select 1
      from public.agent_category_shortlist as shortlist
      where shortlist.agent_db_id = eligible.agent_db_id
    ) desc,
    health.last_checked_at asc nulls first,
    agent.registered_at desc nulls last,
    agent.id
  limit (select row_limit from bounds);
$$;

create or replace function public.score_recalculation_candidates(
  p_limit integer default 200,
  p_score_version text default 'sift-evidence-v2.0.0'
)
returns table (agent_db_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  with bounds as (
    select least(greatest(coalesce(p_limit, 200), 1), 500) as row_limit
  ),
  current_signals as materialized (
    select health.agent_db_id
    from public.agent_health as health
    where health.last_checked_at > now() - interval '24 hours'
      and health.status in ('online', 'degraded', 'offline')
    union
    select reputation.agent_db_id
    from public.agent_reputation as reputation
    where reputation.source is not null
      and length(trim(reputation.source)) > 0
      and reputation.source_observed_at > now() - interval '180 days'
      and (
        reputation.reputation_score is not null
        or coalesce(reputation.successful_jobs, 0)
          + coalesce(reputation.failed_jobs, 0) > 0
      )
  ),
  version_mismatch as (
    select score.agent_db_id, 0 as priority
    from public.agent_scores as score
    inner join current_signals as signal
      on signal.agent_db_id = score.agent_db_id
    where score.score_version <> p_score_version
    order by score.calculated_at, score.agent_db_id
    limit (select row_limit from bounds)
  ),
  actionable_missing as (
    select signal.agent_db_id, 1 as priority
    from current_signals as signal
    inner join public.agents as agent on agent.id = signal.agent_db_id
    left join public.agent_scores as score
      on score.agent_db_id = signal.agent_db_id
    where score.agent_db_id is null
    order by agent.registered_at desc nulls last, signal.agent_db_id
    limit (select row_limit from bounds)
  ),
  changed_inputs as (
    select score.agent_db_id, 2 as priority
    from public.agent_scores as score
    inner join public.agents as agent on agent.id = score.agent_db_id
    where score.score_version = p_score_version
      and (
        agent.updated_at > score.calculated_at
        or (
          agent.metadata_verified_at <= now() - interval '30 days'
          and (
            score.capability_component is not null
            or score.metadata_component is not null
          )
        )
        or exists (
          select 1
          from public.agent_health as health
          where health.agent_db_id = score.agent_db_id
            and (
              health.updated_at > score.calculated_at
              or (
                health.last_checked_at <= now() - interval '24 hours'
                and (
                  score.availability_component is not null
                  or score.reliability_component is not null
                )
              )
            )
        )
        or exists (
          select 1
          from public.agent_reputation as reputation
          where reputation.agent_db_id = score.agent_db_id
            and (
              reputation.updated_at > score.calculated_at
              or (
                reputation.source_observed_at <= now() - interval '180 days'
                and (
                  score.reputation_component is not null
                  or score.track_record_component is not null
                )
              )
            )
        )
        or exists (
          select 1
          from public.agent_services as service
          where service.agent_db_id = score.agent_db_id
            and service.updated_at > score.calculated_at
        )
      )
    order by score.calculated_at
    limit (select row_limit from bounds)
  ),
  queued as (
    select distinct on (agent_db_id) agent_db_id, priority
    from (
      select agent_db_id, priority from version_mismatch
      union all
      select agent_db_id, priority from actionable_missing
      union all
      select agent_db_id, priority from changed_inputs
    ) as combined
    order by agent_db_id, priority
  )
  select agent_db_id
  from queued
  order by priority, agent_db_id
  limit (select row_limit from bounds);
$$;

revoke all on function public.health_check_candidates(integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.health_check_candidates(integer, timestamptz)
  to service_role;

revoke all on function public.score_recalculation_candidates(integer, text)
  from public, anon, authenticated;
grant execute on function public.score_recalculation_candidates(integer, text)
  to service_role;

comment on function public.health_check_candidates(integer, timestamptz) is
  'Bounded health queue that prioritizes due second and third conclusive observations, then resumes broad fair coverage.';
comment on function public.score_recalculation_candidates(integer, text) is
  'Bounded Sift Score v2 queue that prioritizes current independent evidence and ignores retired scores until their source evidence changes.';

commit;

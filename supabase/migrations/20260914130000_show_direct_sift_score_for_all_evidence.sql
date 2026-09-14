-- Sift Score v2.2 always exposes the direct sum of earned criterion points.
-- A missing criterion contributes zero and remains visible through the stored
-- component columns and confidence; no missing value is fabricated.

begin;

create or replace function public.enforce_current_discovery_sift_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_current_score numeric(5, 2);
begin
  select round((
    coalesce(score.reputation_component, 0) * 15
    + coalesce(score.reliability_component, 0) * 25
    + coalesce(score.availability_component, 0) * 20
    + coalesce(score.capability_component, 0) * 10
    + coalesce(score.track_record_component, 0) * 20
    + coalesce(score.metadata_component, 0) * 10
  ) / 100, 2)
  into v_current_score
  from public.agent_scores as score
  where score.agent_db_id = new.agent_db_id
    and score.score_version in (
      'sift-evidence-v2.1.0',
      'sift-evidence-v2.2.0'
    );

  new.sift_score := v_current_score;
  return new;
end;
$function$;

revoke all on function public.enforce_current_discovery_sift_score()
  from public, anon, authenticated;

-- Existing v2.1 components use the same direct-sum weights. Project their
-- earned total immediately, including assessments whose old publication gate
-- stored a null final score.
update public.agent_discovery_documents as document
set sift_score = round((
  coalesce(score.reputation_component, 0) * 15
  + coalesce(score.reliability_component, 0) * 25
  + coalesce(score.availability_component, 0) * 20
  + coalesce(score.capability_component, 0) * 10
  + coalesce(score.track_record_component, 0) * 20
  + coalesce(score.metadata_component, 0) * 10
) / 100, 2)
from public.agent_scores as score
where score.agent_db_id = document.agent_db_id
  and score.score_version in (
    'sift-evidence-v2.1.0',
    'sift-evidence-v2.2.0'
  );

update public.agent_discovery_documents as document
set sift_score = null
where document.sift_score is not null
  and not exists (
    select 1
    from public.agent_scores as score
    where score.agent_db_id = document.agent_db_id
      and score.score_version in (
        'sift-evidence-v2.1.0',
        'sift-evidence-v2.2.0'
      )
  );

create or replace function public.score_recalculation_candidates(
  p_limit integer default 200,
  p_score_version text default 'sift-evidence-v2.2.0'
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

revoke all on function public.score_recalculation_candidates(integer, text)
  from public, anon, authenticated;
grant execute on function public.score_recalculation_candidates(integer, text)
  to service_role;

analyze public.agent_discovery_documents;

comment on function public.enforce_current_discovery_sift_score() is
  'Projects the direct sum of stored Sift Score v2.1 or v2.2 component points.';
comment on function public.score_recalculation_candidates(integer, text) is
  'Bounded score queue that upgrades every retired stored assessment before processing current changed evidence.';

commit;

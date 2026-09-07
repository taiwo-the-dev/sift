begin;

-- The original score_recalculation_candidates plan combined a five-way outer
-- join with a per-row correlated aggregate over agent_services and a computed
-- sort key over several timestamps. Postgres had to materialise and sort every
-- agent in the catalogue before `limit` could apply, so the hosted run timed
-- out and almost no agent was ever scored. This rewrite keeps the exact same
-- contract but expresses the queue as two independently bounded,
-- index-friendly branches: first agents that have no current-version score row
-- at all, then a bounded set of agents whose real source rows changed after the
-- last calculation.

create index if not exists agent_scores_calculated_at_idx
  on public.agent_scores (calculated_at);

create index if not exists agent_services_agent_updated_at_idx
  on public.agent_services (agent_db_id, updated_at desc);

comment on index public.agent_scores_calculated_at_idx is
  'Supports the bounded changed-input branch of the score recalculation queue.';
comment on index public.agent_services_agent_updated_at_idx is
  'Detects service declarations that changed after the last score calculation.';

create or replace function public.score_recalculation_candidates(
  p_limit integer default 200,
  p_score_version text default 'sift-evidence-v1.0.0'
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
  missing_or_stale as (
    select a.id as agent_db_id, 0 as priority
    from public.agents as a
    left join public.agent_scores as sc on sc.agent_db_id = a.id
    where sc.agent_db_id is null
      or sc.score_version <> p_score_version
    order by a.id
    limit (select row_limit from bounds)
  ),
  changed_inputs as (
    select sc.agent_db_id, 1 as priority
    from public.agent_scores as sc
    join public.agents as a on a.id = sc.agent_db_id
    where sc.score_version = p_score_version
      and (
        a.updated_at > sc.calculated_at
        or (
          a.metadata_verified_at <= now() - interval '30 days'
          and (
            sc.capability_component is not null
            or sc.metadata_component is not null
          )
        )
        or exists (
          select 1
          from public.agent_health as h
          where h.agent_db_id = sc.agent_db_id
            and (
              h.updated_at > sc.calculated_at
              or (
                h.last_checked_at <= now() - interval '24 hours'
                and (
                  sc.availability_component is not null
                  or sc.reliability_component is not null
                )
              )
            )
        )
        or exists (
          select 1
          from public.agent_reputation as r
          where r.agent_db_id = sc.agent_db_id
            and (
              r.updated_at > sc.calculated_at
              or (
                r.source_observed_at <= now() - interval '180 days'
                and (
                  sc.reputation_component is not null
                  or sc.track_record_component is not null
                )
              )
            )
        )
        or exists (
          select 1
          from public.agent_services as svc
          where svc.agent_db_id = sc.agent_db_id
            and svc.updated_at > sc.calculated_at
        )
      )
    order by sc.calculated_at
    limit (select row_limit from bounds)
  ),
  queued as (
    select distinct on (agent_db_id) agent_db_id, priority
    from (
      select agent_db_id, priority from missing_or_stale
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

comment on function public.score_recalculation_candidates(integer, text) is
  'Bounded server-only queue of agents that have no current-version score row or whose real score inputs changed, expressed as two independently limited index-friendly branches.';

commit;

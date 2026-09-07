begin;

-- The original health queue only surfaced an agent when it declared a service
-- literally typed `health`, or an `a2a` service whose endpoint path already
-- ended in `/.well-known/agent-card.json`. Real ERC-8004 agents almost always
-- declare an `a2a` service that points at a base URL, so nearly every agent
-- stayed `unknown` and was never probed. The health checker now derives the
-- standard A2A discovery document (`<origin>/.well-known/agent-card.json`) for
-- any `a2a` service with a safe HTTPS endpoint, so the queue is widened to
-- match. The bounded probe contract is unchanged: GET only, HTTPS on 443, no
-- body, no query, no credentials, at most two validated redirects, and an
-- A2A response must still be a JSON object. The queue is driven by an indexed
-- subset of service declarations so catalogue growth does not force a full
-- agents-table scan on every scheduled run.

create index if not exists agent_services_health_candidate_idx
  on public.agent_services ((lower(trim(service_type))), agent_db_id)
  where endpoint is not null;

create index if not exists agent_health_last_checked_at_idx
  on public.agent_health (last_checked_at, agent_db_id);

comment on index public.agent_services_health_candidate_idx is
  'Supports bounded selection of agents declaring health-checkable service types.';
comment on index public.agent_health_last_checked_at_idx is
  'Supports fair oldest-first scheduling of due endpoint observations.';

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
  join public.agents as a on a.id = eligible.agent_db_id
  left join public.agent_health as h on h.agent_db_id = eligible.agent_db_id
  where a.metadata_status = 'valid'
    and (h.last_checked_at is null or h.last_checked_at <= p_stale_before)
  order by
    exists (
      select 1
      from public.agent_category_shortlist as shortlist
      where shortlist.agent_db_id = eligible.agent_db_id
    ) desc,
    h.last_checked_at asc nulls first,
    a.registered_at desc nulls last,
    a.id
  limit (select row_limit from bounds);
$$;

comment on function public.health_check_candidates(integer, timestamptz) is
  'Indexed, bounded server-only health queue for valid agents with a query-free HTTPS health or A2A declaration; shortlist members are considered first and the checker independently revalidates every target.';

commit;

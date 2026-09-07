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
-- A2A response must still be a JSON object.

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
  select a.id as agent_db_id
  from public.agents as a
  left join public.agent_health as h on h.agent_db_id = a.id
  where a.metadata_status = 'valid'
    and (
      h.last_checked_at is null
      or h.last_checked_at <= p_stale_before
    )
    and exists (
      select 1
      from public.agent_services as svc
      where svc.agent_db_id = a.id
        and svc.endpoint is not null
        and svc.endpoint ~* '^https://'
        and (
          (
            lower(trim(svc.service_type)) = 'health'
            and position('?' in svc.endpoint) = 0
          )
          or lower(trim(svc.service_type)) = 'a2a'
        )
    )
  order by
    h.last_checked_at asc nulls first,
    a.registered_at desc nulls last,
    a.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

comment on function public.health_check_candidates(integer, timestamptz) is
  'Bounded server-only health queue for agents with a probe-safe health or A2A HTTPS declaration; the checker independently revalidates and derives the A2A discovery document.';

commit;

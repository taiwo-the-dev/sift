-- M23: a successfully inspected MCP tool list is usable even when tools do not
-- declare readOnlyHint. Non-read-only tools remain confirmation-gated in the
-- application and any returned EVM request still requires wallet simulation
-- and approval. Also keep the checker fair across networks and methods.

begin;

update public.agent_services
set
  availability_status = 'available',
  availability_last_success_at = availability_checked_at,
  availability_failure_code = null,
  activation_validation_version = 'sift-activation-v1.1.0',
  updated_at = now()
where activation_method = 'mcp'
  and availability_status = 'unsupported'
  and availability_failure_code = 'no-read-only-tools'
  and availability_checked_at is not null
  and jsonb_typeof(capability_summary -> 'tools') = 'array'
  and jsonb_array_length(capability_summary -> 'tools') > 0;

create or replace function public.activation_check_candidates(
  p_limit integer default 25,
  p_stale_before timestamptz default now() - interval '6 hours'
)
returns table (
  service_id uuid,
  agent_db_id uuid,
  agent_id text,
  chain_id bigint,
  owner_address text,
  service_type text,
  endpoint text,
  version text,
  activation_method text,
  availability_status text,
  availability_failure_count integer,
  availability_last_success_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with eligible as materialized (
    select
      service.id as service_id,
      service.agent_db_id,
      agent.agent_id,
      agent.chain_id,
      agent.owner_address,
      service.service_type,
      service.endpoint,
      service.version,
      service.activation_method,
      service.availability_status,
      service.availability_failure_count,
      service.availability_last_success_at,
      service.availability_checked_at,
      case
        when service.availability_status = 'unchecked' then 0
        when service.availability_status in ('available', 'degraded') then 1
        else 2
      end as queue_priority,
      row_number() over (
        partition by agent.chain_id, service.activation_method
        order by
          case
            when service.availability_status = 'unchecked' then 0
            when service.availability_status in ('available', 'degraded') then 1
            else 2
          end,
          service.availability_checked_at asc nulls first,
          service.id
      ) as lane_rank
    from public.agent_services as service
    join public.agents as agent on agent.id = service.agent_db_id
    where service.activation_method is not null
      and service.endpoint is not null
      and agent.metadata_status = 'valid'
      and agent.active is not false
      and (
        service.availability_checked_at is null
        or service.availability_checked_at < p_stale_before
      )
  )
  select
    eligible.service_id,
    eligible.agent_db_id,
    eligible.agent_id,
    eligible.chain_id,
    eligible.owner_address,
    eligible.service_type,
    eligible.endpoint,
    eligible.version,
    eligible.activation_method,
    eligible.availability_status,
    eligible.availability_failure_count,
    eligible.availability_last_success_at
  from eligible
  order by
    eligible.queue_priority,
    eligible.lane_rank,
    eligible.chain_id,
    eligible.activation_method,
    eligible.availability_checked_at asc nulls first,
    eligible.service_id
  limit greatest(0, least(coalesce(p_limit, 25), 100));
$$;

revoke all on function public.activation_check_candidates(integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.activation_check_candidates(integer, timestamptz)
  to service_role;

comment on function public.activation_check_candidates(integer, timestamptz) is
  'Fair bounded activation queue across BNB networks and supported service methods.';

commit;

begin;

create table public.mcp_action_authorizations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  wallet_address text not null check (
    wallet_address = lower(wallet_address)
    and wallet_address ~ '^0x[0-9a-f]{40}$'
  ),
  chain_id bigint not null check (chain_id in (56, 97)),
  agent_id text not null check (agent_id ~ '^(0|[1-9][0-9]*)$'),
  service_id uuid not null references public.agent_services(id) on delete cascade,
  tool_name text not null check (
    length(tool_name) between 1 and 128
    and tool_name !~ '[[:cntrl:]]'
  ),
  arguments_hash text not null check (arguments_hash ~ '^[0-9a-f]{64}$'),
  request_origin text not null check (
    request_origin ~ '^https?://[^/]+$'
    and length(request_origin) <= 300
  ),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint mcp_action_authorizations_time_check check (
    expires_at > issued_at
    and expires_at <= issued_at + interval '10 minutes'
    and (consumed_at is null or consumed_at >= issued_at)
  )
);

create index mcp_action_authorizations_expiry_idx
  on public.mcp_action_authorizations (expires_at);
create index mcp_action_authorizations_wallet_idx
  on public.mcp_action_authorizations (wallet_address, chain_id, expires_at desc);

alter table public.mcp_action_authorizations enable row level security;
revoke all on table public.mcp_action_authorizations from public, anon, authenticated;
grant select, insert, update, delete on table public.mcp_action_authorizations
  to service_role;

comment on table public.mcp_action_authorizations is
  'Short-lived, single-use wallet approvals bound to one non-read-only MCP tool request.';

commit;

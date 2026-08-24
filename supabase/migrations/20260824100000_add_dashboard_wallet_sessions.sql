begin;

create table public.dashboard_wallet_challenges (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  wallet_address text not null check (
    wallet_address = lower(wallet_address)
    and wallet_address ~ '^0x[0-9a-f]{40}$'
  ),
  chain_id bigint not null check (chain_id = 97),
  request_origin text not null check (
    request_origin ~ '^https?://[^/]+$'
    and length(request_origin) <= 300
  ),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint dashboard_wallet_challenges_time_check check (
    expires_at > issued_at
    and expires_at <= issued_at + interval '10 minutes'
    and (consumed_at is null or consumed_at >= issued_at)
  )
);

create index dashboard_wallet_challenges_expiry_idx
  on public.dashboard_wallet_challenges (expires_at);

create table public.dashboard_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  wallet_address text not null check (
    wallet_address = lower(wallet_address)
    and wallet_address ~ '^0x[0-9a-f]{40}$'
  ),
  chain_id bigint not null check (chain_id = 97),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  constraint dashboard_sessions_expiry_check check (
    expires_at > created_at
    and expires_at <= created_at + interval '24 hours'
  )
);

create index dashboard_sessions_wallet_idx
  on public.dashboard_sessions (wallet_address, chain_id, expires_at desc);
create index dashboard_sessions_expiry_idx
  on public.dashboard_sessions (expires_at);

alter table public.dashboard_wallet_challenges enable row level security;
alter table public.dashboard_sessions enable row level security;

revoke all on table public.dashboard_wallet_challenges from anon, authenticated;
revoke all on table public.dashboard_sessions from anon, authenticated;

grant all on table public.dashboard_wallet_challenges to service_role;
grant all on table public.dashboard_sessions to service_role;

comment on table public.dashboard_wallet_challenges is
  'Short-lived, single-use challenges for proving dashboard wallet ownership.';
comment on table public.dashboard_sessions is
  'Opaque, expiring server sessions scoped to one verified wallet and chain.';

commit;

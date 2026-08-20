begin;

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  chain_id bigint not null check (chain_id > 0),
  agent_id text not null check (
    agent_id ~ '^(0|[1-9][0-9]{0,77})$'
  ),
  registry_address text not null check (
    registry_address = lower(registry_address)
    and registry_address ~ '^0x[0-9a-f]{40}$'
  ),
  owner_address text check (
    owner_address is null
    or (
      owner_address = lower(owner_address)
      and owner_address ~ '^0x[0-9a-f]{40}$'
    )
  ),
  agent_uri text,
  name text,
  description text,
  image_url text,
  category text check (
    category is null
    or category in (
      'yield-optimisation',
      'grid-trading',
      'health-factor-monitoring',
      'liquidity-rebalancing'
    )
  ),
  active boolean,
  x402_supported boolean,
  metadata_status text not null default 'pending' check (
    metadata_status in ('pending', 'valid', 'invalid', 'unavailable')
  ),
  registered_block bigint check (
    registered_block is null or registered_block >= 0
  ),
  registered_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agents_chain_registry_agent_key unique (
    chain_id,
    registry_address,
    agent_id
  )
);

create table public.agent_services (
  id uuid primary key default gen_random_uuid(),
  agent_db_id uuid not null references public.agents(id) on delete cascade,
  service_type text not null check (length(trim(service_type)) > 0),
  endpoint text,
  version text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agent_health (
  agent_db_id uuid primary key references public.agents(id) on delete cascade,
  status text not null check (
    status in ('online', 'degraded', 'offline', 'unknown')
  ),
  response_time_ms integer check (
    response_time_ms is null or response_time_ms >= 0
  ),
  last_checked_at timestamptz not null,
  last_success_at timestamptz,
  failure_count bigint not null check (failure_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agent_reputation (
  agent_db_id uuid primary key references public.agents(id) on delete cascade,
  feedback_count bigint check (
    feedback_count is null or feedback_count >= 0
  ),
  reputation_score numeric,
  successful_jobs bigint check (
    successful_jobs is null or successful_jobs >= 0
  ),
  failed_jobs bigint check (
    failed_jobs is null or failed_jobs >= 0
  ),
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agent_scores (
  agent_db_id uuid primary key references public.agents(id) on delete cascade,
  sift_score numeric(5, 2) not null check (
    sift_score >= 0 and sift_score <= 100
  ),
  confidence numeric(5, 4) not null check (
    confidence >= 0 and confidence <= 1
  ),
  reputation_component numeric(5, 2) check (
    reputation_component is null
    or reputation_component between 0 and 100
  ),
  reliability_component numeric(5, 2) check (
    reliability_component is null
    or reliability_component between 0 and 100
  ),
  availability_component numeric(5, 2) check (
    availability_component is null
    or availability_component between 0 and 100
  ),
  capability_component numeric(5, 2) check (
    capability_component is null
    or capability_component between 0 and 100
  ),
  track_record_component numeric(5, 2) check (
    track_record_component is null
    or track_record_component between 0 and 100
  ),
  metadata_component numeric(5, 2) check (
    metadata_component is null
    or metadata_component between 0 and 100
  ),
  score_version text not null check (length(trim(score_version)) > 0),
  calculated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sync_state (
  chain_id bigint not null check (chain_id > 0),
  registry_address text not null check (
    registry_address = lower(registry_address)
    and registry_address ~ '^0x[0-9a-f]{40}$'
  ),
  last_synced_block bigint not null check (last_synced_block >= 0),
  updated_at timestamptz not null default now(),
  primary key (chain_id, registry_address)
);

create index agents_chain_agent_idx
  on public.agents (chain_id, agent_id);
create index agents_registry_address_idx
  on public.agents (registry_address);
create index agents_category_idx
  on public.agents (category)
  where category is not null;
create index agents_registered_at_idx
  on public.agents (registered_at desc)
  where registered_at is not null;
create index agents_metadata_status_idx
  on public.agents (metadata_status);
create index agents_search_idx
  on public.agents using gin (
    to_tsvector(
      'simple'::regconfig,
      coalesce(name, '') || ' ' || coalesce(description, '')
    )
  );

create index agent_services_agent_db_id_idx
  on public.agent_services (agent_db_id);
create index agent_services_type_idx
  on public.agent_services (service_type);
create unique index agent_services_identity_key
  on public.agent_services (
    agent_db_id,
    service_type,
    coalesce(endpoint, ''),
    coalesce(version, '')
  );

create index agent_health_status_idx
  on public.agent_health (status);
create index agent_reputation_score_idx
  on public.agent_reputation (reputation_score desc)
  where reputation_score is not null;
create index agent_scores_sift_score_idx
  on public.agent_scores (sift_score desc);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger agents_set_updated_at
before update on public.agents
for each row execute function public.set_updated_at();

create trigger agent_services_set_updated_at
before update on public.agent_services
for each row execute function public.set_updated_at();

create trigger agent_health_set_updated_at
before update on public.agent_health
for each row execute function public.set_updated_at();

create trigger agent_reputation_set_updated_at
before update on public.agent_reputation
for each row execute function public.set_updated_at();

create trigger agent_scores_set_updated_at
before update on public.agent_scores
for each row execute function public.set_updated_at();

create trigger sync_state_set_updated_at
before update on public.sync_state
for each row execute function public.set_updated_at();

alter table public.agents enable row level security;
alter table public.agent_services enable row level security;
alter table public.agent_health enable row level security;
alter table public.agent_reputation enable row level security;
alter table public.agent_scores enable row level security;
alter table public.sync_state enable row level security;

revoke all on table public.agents from anon, authenticated;
revoke all on table public.agent_services from anon, authenticated;
revoke all on table public.agent_health from anon, authenticated;
revoke all on table public.agent_reputation from anon, authenticated;
revoke all on table public.agent_scores from anon, authenticated;
revoke all on table public.sync_state from anon, authenticated;

grant all on table public.agents to service_role;
grant all on table public.agent_services to service_role;
grant all on table public.agent_health to service_role;
grant all on table public.agent_reputation to service_role;
grant all on table public.agent_scores to service_role;
grant all on table public.sync_state to service_role;

revoke execute on function public.set_updated_at() from public;

comment on table public.agents is
  'Normalized ERC-8004 agent identities and last verified metadata.';
comment on table public.agent_services is
  'Normalized service declarations belonging to an indexed agent.';
comment on table public.agent_health is
  'Latest real health observation for an agent; never synthetic.';
comment on table public.agent_reputation is
  'Latest reputation values derived from verifiable sources.';
comment on table public.agent_scores is
  'Versioned Sift Score output derived only from available real inputs.';
comment on table public.sync_state is
  'Last successfully persisted block per chain and registry deployment.';

commit;

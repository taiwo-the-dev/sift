begin;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  resume_token_hash text not null check (
    resume_token_hash ~ '^[0-9a-f]{64}$'
  ),
  agent_db_id uuid not null references public.agents(id) on delete restrict,
  chain_id bigint not null check (chain_id = 97),
  agent_id text not null check (agent_id ~ '^(0|[1-9][0-9]{0,77})$'),
  registry_address text not null check (
    registry_address = lower(registry_address)
    and registry_address ~ '^0x[0-9a-f]{40}$'
  ),
  wallet_address text not null check (
    wallet_address = lower(wallet_address)
    and wallet_address ~ '^0x[0-9a-f]{40}$'
  ),
  provider_address text not null check (
    provider_address = lower(provider_address)
    and provider_address ~ '^0x[0-9a-f]{40}$'
  ),
  commerce_address text not null check (
    commerce_address = lower(commerce_address)
    and commerce_address ~ '^0x[0-9a-f]{40}$'
  ),
  router_address text not null check (
    router_address = lower(router_address)
    and router_address ~ '^0x[0-9a-f]{40}$'
  ),
  policy_address text not null check (
    policy_address = lower(policy_address)
    and policy_address ~ '^0x[0-9a-f]{40}$'
  ),
  payment_token_address text not null check (
    payment_token_address = lower(payment_token_address)
    and payment_token_address ~ '^0x[0-9a-f]{40}$'
  ),
  payment_token_symbol text not null check (
    length(payment_token_symbol) between 1 and 20
  ),
  payment_token_decimals smallint not null check (
    payment_token_decimals between 0 and 255
  ),
  mission text not null check (length(mission) between 20 and 1500),
  deliverables text not null check (length(deliverables) between 10 and 700),
  quality_standards text not null check (
    length(quality_standards) between 10 and 700
  ),
  onchain_description text not null check (
    octet_length(onchain_description) between 1 and 4096
  ),
  negotiation_hash text not null check (
    negotiation_hash = lower(negotiation_hash)
    and negotiation_hash ~ '^0x[0-9a-f]{64}$'
  ),
  maximum_spend_base_units text not null check (
    maximum_spend_base_units ~ '^(0|[1-9][0-9]{0,77})$'
  ),
  budget_base_units text not null check (
    budget_base_units ~ '^(0|[1-9][0-9]{0,77})$'
    and budget_base_units::numeric <= maximum_spend_base_units::numeric
  ),
  quote_expires_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'draft' check (
    status in (
      'draft',
      'awaiting_wallet',
      'submitted',
      'confirmed',
      'failed',
      'cancelled',
      'replaced'
    )
  ),
  current_step text check (
    current_step is null
    or current_step in (
      'create_job',
      'register_job',
      'set_budget',
      'approve_token',
      'fund_job'
    )
  ),
  onchain_job_id text check (
    onchain_job_id is null
    or onchain_job_id ~ '^(0|[1-9][0-9]{0,77})$'
  ),
  transaction_hash text check (
    transaction_hash is null
    or (
      transaction_hash = lower(transaction_hash)
      and transaction_hash ~ '^0x[0-9a-f]{64}$'
    )
  ),
  block_number bigint check (block_number is null or block_number >= 0),
  failure_code text check (
    failure_code is null or length(failure_code) between 1 and 80
  ),
  failure_message text check (
    failure_message is null or length(failure_message) between 1 and 300
  ),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_time_order_check check (
    quote_expires_at > created_at
    and expires_at > created_at
  )
);

create unique index jobs_chain_contract_job_key
  on public.jobs (chain_id, commerce_address, onchain_job_id)
  where onchain_job_id is not null;
create index jobs_wallet_created_idx
  on public.jobs (wallet_address, created_at desc);
create index jobs_agent_created_idx
  on public.jobs (agent_db_id, created_at desc);
create index jobs_status_idx on public.jobs (status);

create table public.job_transactions (
  id uuid primary key default gen_random_uuid(),
  job_db_id uuid not null references public.jobs(id) on delete cascade,
  step text not null check (
    step in (
      'create_job',
      'register_job',
      'set_budget',
      'approve_token',
      'fund_job'
    )
  ),
  transaction_hash text not null check (
    transaction_hash = lower(transaction_hash)
    and transaction_hash ~ '^0x[0-9a-f]{64}$'
  ),
  replaced_transaction_hash text check (
    replaced_transaction_hash is null
    or (
      replaced_transaction_hash = lower(replaced_transaction_hash)
      and replaced_transaction_hash ~ '^0x[0-9a-f]{64}$'
    )
  ),
  from_address text not null check (
    from_address = lower(from_address)
    and from_address ~ '^0x[0-9a-f]{40}$'
  ),
  to_address text not null check (
    to_address = lower(to_address)
    and to_address ~ '^0x[0-9a-f]{40}$'
  ),
  status text not null check (
    status in ('submitted', 'confirmed', 'failed', 'cancelled', 'replaced')
  ),
  block_number bigint check (block_number is null or block_number >= 0),
  block_hash text check (
    block_hash is null
    or (
      block_hash = lower(block_hash)
      and block_hash ~ '^0x[0-9a-f]{64}$'
    )
  ),
  submitted_at timestamptz not null default now(),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_transactions_step_key unique (job_db_id, step),
  constraint job_transactions_hash_key unique (transaction_hash)
);

create index job_transactions_job_status_idx
  on public.job_transactions (job_db_id, status);

create table public.job_activity (
  id bigint generated by default as identity primary key,
  job_db_id uuid not null references public.jobs(id) on delete cascade,
  activity_type text not null check (
    activity_type in (
      'intent_created',
      'wallet_awaiting',
      'transaction_submitted',
      'transaction_confirmed',
      'transaction_replaced',
      'transaction_failed',
      'wallet_cancelled',
      'job_confirmed'
    )
  ),
  transaction_hash text check (
    transaction_hash is null
    or (
      transaction_hash = lower(transaction_hash)
      and transaction_hash ~ '^0x[0-9a-f]{64}$'
    )
  ),
  details jsonb not null default '{}'::jsonb check (
    jsonb_typeof(details) = 'object'
  ),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index job_activity_transaction_type_key
  on public.job_activity (job_db_id, activity_type, transaction_hash)
  where transaction_hash is not null;
create unique index job_activity_singleton_type_key
  on public.job_activity (job_db_id, activity_type)
  where transaction_hash is null
    and activity_type in ('intent_created', 'wallet_awaiting', 'job_confirmed');
create index job_activity_job_time_idx
  on public.job_activity (job_db_id, occurred_at, id);

create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

create trigger job_transactions_set_updated_at
before update on public.job_transactions
for each row execute function public.set_updated_at();

create function public.record_hiring_verification(
  p_job_id uuid,
  p_step text,
  p_transaction_hash text,
  p_replaced_transaction_hash text,
  p_from_address text,
  p_to_address text,
  p_transaction_status text,
  p_block_number bigint,
  p_block_hash text,
  p_transaction_confirmed_at timestamptz,
  p_job_status text,
  p_current_step text,
  p_onchain_job_id text,
  p_final_transaction_hash text,
  p_final_block_number bigint,
  p_failure_code text,
  p_failure_message text,
  p_job_confirmed_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_activity_type text;
begin
  update public.jobs
  set
    block_number = p_final_block_number,
    confirmed_at = p_job_confirmed_at,
    current_step = p_current_step,
    failure_code = p_failure_code,
    failure_message = p_failure_message,
    onchain_job_id = p_onchain_job_id,
    status = p_job_status,
    transaction_hash = p_final_transaction_hash
  where id = p_job_id;

  if not found then
    raise exception 'Hiring intent not found';
  end if;

  insert into public.job_transactions (
    block_hash,
    block_number,
    confirmed_at,
    from_address,
    job_db_id,
    replaced_transaction_hash,
    status,
    step,
    to_address,
    transaction_hash
  ) values (
    p_block_hash,
    p_block_number,
    p_transaction_confirmed_at,
    p_from_address,
    p_job_id,
    p_replaced_transaction_hash,
    p_transaction_status,
    p_step,
    p_to_address,
    p_transaction_hash
  )
  on conflict (job_db_id, step) do update set
    block_hash = excluded.block_hash,
    block_number = excluded.block_number,
    confirmed_at = excluded.confirmed_at,
    from_address = excluded.from_address,
    replaced_transaction_hash = excluded.replaced_transaction_hash,
    status = excluded.status,
    to_address = excluded.to_address,
    transaction_hash = excluded.transaction_hash;

  v_activity_type := case p_transaction_status
    when 'confirmed' then 'transaction_confirmed'
    when 'replaced' then 'transaction_replaced'
    when 'failed' then 'transaction_failed'
    when 'cancelled' then 'wallet_cancelled'
    else 'transaction_submitted'
  end;

  insert into public.job_activity (
    activity_type,
    details,
    job_db_id,
    transaction_hash
  ) values (
    v_activity_type,
    jsonb_build_object('step', p_step),
    p_job_id,
    p_transaction_hash
  ) on conflict do nothing;

  if p_job_status = 'confirmed' then
    insert into public.job_activity (
      activity_type,
      details,
      job_db_id,
      transaction_hash
    ) values (
      'job_confirmed',
      jsonb_build_object('onchainJobId', p_onchain_job_id),
      p_job_id,
      p_transaction_hash
    ) on conflict do nothing;
  end if;
end;
$$;

alter table public.jobs enable row level security;
alter table public.job_transactions enable row level security;
alter table public.job_activity enable row level security;

revoke all on table public.jobs from anon, authenticated;
revoke all on table public.job_transactions from anon, authenticated;
revoke all on table public.job_activity from anon, authenticated;

grant all on table public.jobs to service_role;
grant all on table public.job_transactions to service_role;
grant all on table public.job_activity to service_role;

revoke all on function public.record_hiring_verification(
  uuid, text, text, text, text, text, text, bigint, text, timestamptz,
  text, text, text, text, bigint, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.record_hiring_verification(
  uuid, text, text, text, text, text, text, bigint, text, timestamptz,
  text, text, text, text, bigint, text, text, timestamptz
) to service_role;

comment on table public.jobs is
  'Sift ERC-8183 hiring intents and jobs. Confirmed rows require independently verified BSC Testnet evidence.';
comment on table public.job_transactions is
  'One canonical wallet transaction per hiring step, including replacement and receipt state.';
comment on table public.job_activity is
  'Minimal append-only hiring state evidence; M10 presentation is intentionally deferred.';
comment on column public.jobs.resume_token_hash is
  'SHA-256 of the browser-held resume capability. The raw token is never persisted.';
comment on column public.jobs.onchain_description is
  'Byte-exact signed ERC-8183 negotiation description submitted to AgenticCommerce.';

commit;

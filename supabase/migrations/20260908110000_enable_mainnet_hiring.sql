begin;

alter table public.jobs
  drop constraint if exists jobs_chain_id_check;
alter table public.jobs
  add constraint jobs_chain_id_check check (chain_id in (56, 97));

alter table public.dashboard_wallet_challenges
  drop constraint if exists dashboard_wallet_challenges_chain_id_check;
alter table public.dashboard_wallet_challenges
  add constraint dashboard_wallet_challenges_chain_id_check
  check (chain_id in (56, 97));

alter table public.dashboard_sessions
  drop constraint if exists dashboard_sessions_chain_id_check;
alter table public.dashboard_sessions
  add constraint dashboard_sessions_chain_id_check
  check (chain_id in (56, 97));

create index if not exists jobs_wallet_chain_created_idx
  on public.jobs (wallet_address, chain_id, created_at desc);

comment on constraint jobs_chain_id_check on public.jobs is
  'Sift hiring records are limited to the reviewed BSC Mainnet and BSC Testnet deployments.';
comment on constraint dashboard_wallet_challenges_chain_id_check
  on public.dashboard_wallet_challenges is
  'Wallet ownership challenges are scoped to BSC Mainnet or BSC Testnet.';
comment on constraint dashboard_sessions_chain_id_check
  on public.dashboard_sessions is
  'Dashboard sessions are scoped to BSC Mainnet or BSC Testnet.';

commit;

begin;

alter table public.agents
add column metadata_verified_at timestamptz;

update public.agents
set metadata_verified_at = last_synced_at
where metadata_status = 'valid'
  and last_synced_at is not null;

comment on column public.agents.metadata_verified_at is
  'Most recent successful metadata validation by the Sift Indexer; preserved when a later refresh fails.';

commit;

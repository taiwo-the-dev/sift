-- The compact catalogue migration dropped agents_chain_registered_block_idx
-- and agents_chain_metadata_registered_block_idx as "duplicated" indexes,
-- but they are the only indexes with chain_id as a leading column ordered by
-- registered_block. Without them, the plain "recent agents" listing used by
-- the default discovery view (search-repository.ts searchRecentAgents, the
-- primary path for /discover and /api/v1/agents) falls back to a near-full
-- scan of the agents table, which now exceeds the platform's API statement
-- timeout at this table size.

begin;

create index agents_chain_registered_block_idx
  on public.agents (chain_id, registered_block desc nulls last, id);

create index agents_chain_metadata_registered_block_idx
  on public.agents (
    chain_id,
    metadata_status,
    registered_block desc nulls last,
    id
  );

comment on index public.agents_chain_registered_block_idx is
  'Supports the default recent-agents listing (chain_id filter, registered_block ordering) without a full scan.';
comment on index public.agents_chain_metadata_registered_block_idx is
  'Supports the recent-agents listing when a metadata_status filter is also applied.';

commit;

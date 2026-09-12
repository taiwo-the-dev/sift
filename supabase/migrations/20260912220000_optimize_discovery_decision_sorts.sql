-- Make the two decision-oriented sorts follow indexable evidence columns.
-- A newer successful access check is necessarily ahead of stale or absent
-- evidence, so it preserves "Available first" without sorting a full-catalogue
-- CASE expression. The profile index exactly matches the reviewed valid-first
-- ordering.

begin;

create index if not exists agent_discovery_chain_access_recent_idx
  on public.agent_discovery_documents (
    chain_id,
    access_last_success_at desc nulls last,
    registered_block desc nulls last,
    registry_address,
    (length(agent_id)),
    agent_id
  )
  include (agent_db_id);

create index if not exists agent_discovery_chain_valid_profile_idx
  on public.agent_discovery_documents (
    chain_id,
    ((metadata_status = 'valid')) desc,
    registered_block desc nulls last,
    registry_address,
    (length(agent_id)),
    agent_id
  )
  include (agent_db_id);

do $migration$
declare
  v_function regprocedure := to_regprocedure(
    'public.search_agent_discovery_keys(text[],text[],text[],text,integer,integer,bigint[],text[],text[],text,boolean)'
  );
  v_source text;
  v_updated_source text;
begin
  if v_function is null then
    raise exception 'search_agent_discovery_keys must exist before optimizing decision sorts';
  end if;

  select proc.prosrc
  into v_source
  from pg_catalog.pg_proc as proc
  where proc.oid = v_function;

  if position('when ''available-first'' then' in v_source) = 0
    or position('when document.erc8183_success_at >= now()' in v_source) = 0 then
    raise exception 'search_agent_discovery_keys no longer matches the reviewed sort shape';
  end if;

  v_updated_source := replace(
    v_source,
    'when ''available-first'' then
      ''case
         when document.erc8183_success_at >= now() - interval ''''24 hours'''' then 0
         when document.a2a_success_at >= now() - interval ''''24 hours'''' then 1
         when document.mcp_success_at >= now() - interval ''''24 hours'''' then 2
         when document.x402_success_at >= now() - interval ''''24 hours'''' then 3
         else null
       end asc nulls last,
       document.registered_block desc nulls last''',
    'when ''available-first'' then
      ''document.access_last_success_at desc nulls last,
       document.registered_block desc nulls last'''
  );

  if v_updated_source = v_source
    or position('document.access_last_success_at desc nulls last' in v_updated_source) = 0
    or position('when document.erc8183_success_at >= now()' in v_updated_source) > 0 then
    raise exception 'decision-sort optimization could not be applied safely';
  end if;

  execute format(
    $definition$
      create or replace function public.search_agent_discovery_keys(
        p_search_terms text[] default array[]::text[],
        p_categories text[] default array[]::text[],
        p_metadata_statuses text[] default array[]::text[],
        p_sort text default 'recent',
        p_page integer default 1,
        p_page_size integer default 12,
        p_chain_ids bigint[] default array[56]::bigint[],
        p_health_statuses text[] default array[]::text[],
        p_score_bands text[] default array[]::text[],
        p_registration_period text default null,
        p_ready_only boolean default false
      )
      returns table (
        agent_db_id uuid,
        has_more boolean,
        result_page integer
      )
      language plpgsql
      stable
      security invoker
      set search_path = ''
      set plan_cache_mode = 'force_custom_plan'
      as %L
    $definition$,
    v_updated_source
  );
end;
$migration$;

revoke all on function public.search_agent_discovery_keys(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) from public, anon, authenticated;
grant execute on function public.search_agent_discovery_keys(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) to service_role;

analyze public.agent_discovery_documents;

commit;

-- Keep rating requests index-backed even when the catalogue contains hundreds
-- of thousands of agents. The function still accepts only validated values;
-- this migration narrows its intermediate rows and gives PostgreSQL a covering
-- recent-registration path that includes the displayed rating.

begin;

create index if not exists agent_discovery_chain_recent_rating_cover_idx
  on public.agent_discovery_documents (
    chain_id,
    registered_block desc nulls last,
    agent_db_id
  )
  include (display_rating);

do $migration$
declare
  v_function regprocedure := to_regprocedure(
    'public.search_agent_rating_keys(text[],text[],text[],text,integer,integer,bigint[],text[],text[],text,boolean)'
  );
  v_source text;
  v_updated_source text;
begin
  if v_function is null then
    raise exception 'search_agent_rating_keys must exist before optimizing it';
  end if;

  select proc.prosrc
  into v_source
  from pg_catalog.pg_proc as proc
  where proc.oid = v_function;

  if position('select document.*' in v_source) = 0
    or position('''document.chain_id = any($1)''' in v_source) = 0 then
    raise exception 'search_agent_rating_keys no longer matches the reviewed query shape';
  end if;

  v_updated_source := replace(
    v_source,
    'v_predicates := array_append(
    v_predicates,
    ''document.chain_id = any($1)''
  );',
    'if v_chain_ids = array[56]::bigint[] then
    v_predicates := array_append(v_predicates, ''document.chain_id = 56'');
  elsif v_chain_ids = array[97]::bigint[] then
    v_predicates := array_append(v_predicates, ''document.chain_id = 97'');
  else
    v_predicates := array_append(v_predicates, ''document.chain_id in (56, 97)'');
  end if;'
  );

  v_updated_source := replace(
    v_updated_source,
    'select document.*',
    'select
          document.agent_db_id,
          document.chain_id,
          document.registry_address,
          document.agent_id,
          document.registered_block,
          document.normalized_name,
          document.sift_score,
          document.metadata_status,
          document.erc8183_success_at,
          document.a2a_success_at,
          document.mcp_success_at,
          document.x402_success_at,
          document.health_checked_at,
          document.service_count,
          document.search_document'
  );

  if v_updated_source = v_source
    or position('document.chain_id = 56' in v_updated_source) = 0
    or position('document.search_document' in v_updated_source) = 0
    or position('select document.*' in v_updated_source) > 0 then
    raise exception 'bounded rating-key optimization could not be applied safely';
  end if;

  execute format(
    $definition$
      create or replace function public.search_agent_rating_keys(
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

revoke all on function public.search_agent_rating_keys(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) from public, anon, authenticated;
grant execute on function public.search_agent_rating_keys(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) to service_role;

analyze public.agent_discovery_documents;

comment on function public.search_agent_rating_keys(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) is
  'Returns one bounded, ordered page of canonical agent IDs using narrow index-backed rating candidates.';

commit;

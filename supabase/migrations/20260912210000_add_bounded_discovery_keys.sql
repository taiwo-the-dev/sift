-- Reuse the reviewed, allowlisted key-selection plan for every advanced
-- discovery combination. Returning IDs first prevents filtering, sorting and
-- page enrichment from becoming one large statement at catalogue scale.

begin;

do $migration$
declare
  v_function regprocedure := to_regprocedure(
    'public.search_agent_rating_keys(text[],text[],text[],text,integer,integer,bigint[],text[],text[],text,boolean)'
  );
  v_source text;
  v_updated_source text;
begin
  if v_function is null then
    raise exception 'search_agent_rating_keys must exist before adding general discovery keys';
  end if;

  select proc.prosrc
  into v_source
  from pg_catalog.pg_proc as proc
  where proc.oid = v_function;

  if position('if cardinality(v_score_bands) = 0 then' in v_source) = 0
    or position('if ''excellent'' = any(v_score_bands) then' in v_source) = 0
    or position('select document.*' in v_source) > 0
    or position('document.chain_id = 56' in v_source) = 0 then
    raise exception 'search_agent_rating_keys no longer matches the optimized reviewed shape';
  end if;

  v_updated_source := replace(
    v_source,
    '  -- This is deliberately a rating-only boundary. Invalid or empty bands do
  -- not broaden into an unfiltered catalogue request.
  if cardinality(v_score_bands) = 0 then
    return;
  end if;

',
    ''
  );

  v_updated_source := replace(
    v_updated_source,
    '  if ''excellent'' = any(v_score_bands) then',
    '  if cardinality(v_score_bands) > 0 then
  if ''excellent'' = any(v_score_bands) then'
  );

  v_updated_source := replace(
    v_updated_source,
    '  v_predicates := array_append(
    v_predicates,
    ''('' || array_to_string(v_rating_predicates, '' or '') || '')''
  );

  if v_registration_period = ''day'' then',
    '  v_predicates := array_append(
    v_predicates,
    ''('' || array_to_string(v_rating_predicates, '' or '') || '')''
  );
  end if;

  if v_registration_period = ''day'' then'
  );

  if v_updated_source = v_source
    or position('if cardinality(v_score_bands) = 0 then' in v_updated_source) > 0
    or position('if cardinality(v_score_bands) > 0 then' in v_updated_source) = 0
    or position('select document.*' in v_updated_source) > 0 then
    raise exception 'general bounded discovery-key function could not be created safely';
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

comment on function public.search_agent_discovery_keys(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) is
  'Returns one bounded, ordered page of canonical agent IDs for advanced discovery filters and sorts.';

commit;

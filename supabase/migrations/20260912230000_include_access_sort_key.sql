-- The bounded key function orders its outer page by the selected evidence key.
-- Include the aggregate access timestamp in its narrow candidate row so the
-- optimized Available-first order is available at both query levels.

begin;

do $migration$
declare
  v_function regprocedure := to_regprocedure(
    'public.search_agent_discovery_keys(text[],text[],text[],text,integer,integer,bigint[],text[],text[],text,boolean)'
  );
  v_source text;
  v_updated_source text;
begin
  if v_function is null then
    raise exception 'search_agent_discovery_keys must exist before adding its access sort key';
  end if;

  select proc.prosrc
  into v_source
  from pg_catalog.pg_proc as proc
  where proc.oid = v_function;

  if position('document.metadata_status,
          document.erc8183_success_at' in v_source) = 0
    or position('document.access_last_success_at desc nulls last' in v_source) = 0 then
    raise exception 'search_agent_discovery_keys no longer matches the reviewed candidate shape';
  end if;

  v_updated_source := replace(
    v_source,
    'document.metadata_status,
          document.erc8183_success_at',
    'document.metadata_status,
          document.access_last_success_at,
          document.erc8183_success_at'
  );

  if v_updated_source = v_source
    or position('document.access_last_success_at,
          document.erc8183_success_at' in v_updated_source) = 0 then
    raise exception 'access sort key could not be added safely';
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

commit;

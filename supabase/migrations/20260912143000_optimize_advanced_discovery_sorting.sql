-- Let PostgreSQL plan evidence-backed catalogue sorts around the selected
-- order and stop once the requested page is known. The previous materialized
-- candidate CTEs evaluated the complete 300k+ agent catalogue before LIMIT,
-- which exceeded the hosted API statement timeout.

begin;

create index if not exists agent_health_discovery_checked_desc_idx
  on public.agent_health (last_checked_at desc nulls last, agent_db_id);

create index if not exists agent_services_discovery_availability_idx
  on public.agent_services (
    availability_status,
    availability_last_success_at desc nulls last,
    activation_method,
    agent_db_id
  )
  where endpoint is not null;

do $migration$
declare
  v_function regprocedure := to_regprocedure(
    'public.search_agents_advanced(text[],text[],text[],text,integer,integer,bigint[],text[],text[],text,boolean)'
  );
  v_source text;
  v_optimized_source text;
begin
  if v_function is null then
    raise exception 'search_agents_advanced must exist before applying its performance migration';
  end if;

  select proc.prosrc
  into v_source
  from pg_catalog.pg_proc as proc
  where proc.oid = v_function;

  if position('matching as materialized (' in v_source) = 0
    or position('page_candidates as materialized (' in v_source) = 0
    or position('page_keys as materialized (' in v_source) = 0 then
    raise exception 'search_agents_advanced no longer matches the reviewed query shape';
  end if;

  v_optimized_source := replace(
    replace(
      replace(
        v_source,
        'matching as materialized (',
        'matching as not materialized ('
      ),
      'page_candidates as materialized (',
      'page_candidates as not materialized ('
    ),
    'page_keys as materialized (',
    'page_keys as not materialized ('
  );

  execute format(
    $definition$
      create or replace function public.search_agents_advanced(
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
        chain_id bigint,
        agent_id text,
        registry_address text,
        owner_address text,
        name text,
        description text,
        image_url text,
        resolved_categories text[],
        category_source text,
        category_evidence jsonb,
        active boolean,
        x402_supported boolean,
        metadata_status text,
        registered_block bigint,
        registered_at timestamptz,
        last_synced_at timestamptz,
        services jsonb,
        relevance real,
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
    v_optimized_source
  );
end;
$migration$;

revoke all on function public.search_agents_advanced(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) from public, anon, authenticated;
grant execute on function public.search_agents_advanced(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) to service_role;

comment on function public.search_agents_advanced(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) is
  'Bounded evidence-backed discovery with custom, limit-aware sorting plans.';

commit;

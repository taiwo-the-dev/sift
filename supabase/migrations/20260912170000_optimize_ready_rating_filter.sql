-- Avoid scanning every service in the catalogue when advanced discovery is
-- narrowed to agents with a recently verified action route. Resolve the small
-- ready-agent set first, then calculate service/profile rating evidence only
-- for those candidates.

begin;

do $migration$
declare
  v_function regprocedure := to_regprocedure(
    'public.search_agents_advanced(text[],text[],text[],text,integer,integer,bigint[],text[],text[],text,boolean)'
  );
  v_source text;
  v_updated_source text;
begin
  if v_function is null then
    raise exception 'search_agents_advanced must exist before optimizing combined ready/rating filters';
  end if;

  select proc.prosrc
  into v_source
  from pg_catalog.pg_proc as proc
  where proc.oid = v_function;

  if position('with service_stats as (' in v_source) = 0
    or position('or cardinality(v_score_bands) > 0' in v_source) = 0
    or position('public.discovery_display_rating(agent, score' in v_source) = 0
    or position('ready_agent_ids as materialized (' in v_source) > 0 then
    raise exception 'search_agents_advanced no longer matches the reviewed ready/rating query shape';
  end if;

  v_updated_source := replace(
    v_source,
    'with service_stats as (',
    'with ready_agent_ids as materialized (
    select ready_service.agent_db_id
    from public.agent_services as ready_service
    inner join public.agents as ready_agent
      on ready_agent.id = ready_service.agent_db_id
    where v_ready_only
      and ready_agent.chain_id = any(v_chain_ids)
      and ready_agent.metadata_status = ''valid''
      and ready_agent.active is not false
      and ready_service.endpoint is not null
      and ready_service.availability_status = ''available''
      and ready_service.availability_last_success_at >= now() - interval ''24 hours''
      and ready_service.activation_method in (''erc8183'', ''a2a'', ''mcp'', ''x402'')
    group by ready_service.agent_db_id
  ),
  service_stats as ('
  );

  v_updated_source := replace(
    v_updated_source,
    'and service_agent.chain_id = any(v_chain_ids)
    group by service.agent_db_id',
    'and service_agent.chain_id = any(v_chain_ids)
      and (
        not v_ready_only
        or service.agent_db_id in (
          select ready_agent_ids.agent_db_id
          from ready_agent_ids
        )
      )
    group by service.agent_db_id'
  );

  if v_updated_source = v_source
    or position('ready_agent_ids as materialized (' in v_updated_source) = 0
    or position('select ready_agent_ids.agent_db_id' in v_updated_source) = 0 then
    raise exception 'ready/rating optimization could not be applied safely';
  end if;

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
    v_updated_source
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
  'Bounded evidence-backed discovery that narrows verified action routes before combined availability and rating evaluation.';

commit;

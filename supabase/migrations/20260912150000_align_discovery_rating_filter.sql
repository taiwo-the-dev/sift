-- Keep rating filters aligned with the rating presented on agent cards. A
-- persisted Sift Score remains the preferred value. When that
-- is unavailable, the same evidence-bounded provisional/profile calculation
-- used by the application is used for discovery only.

begin;

create or replace function public.discovery_display_rating(
  p_agent public.agents,
  p_score public.agent_scores,
  p_service_count bigint,
  p_unique_service_types bigint,
  p_has_endpoint boolean,
  p_has_version boolean
)
returns numeric
language sql
immutable
security invoker
set search_path = ''
as $function$
  select case
    when (p_score).sift_score is not null then
      (p_score).sift_score
    when (
      (p_score).reputation_component is not null
      or (p_score).reliability_component is not null
      or (p_score).availability_component is not null
      or (p_score).track_record_component is not null
    ) then
      round(
        (
          coalesce((p_score).reputation_component, 0) * 25
          + coalesce((p_score).reliability_component, 0) * 20
          + coalesce((p_score).availability_component, 0) * 20
          + coalesce((p_score).capability_component, 0) * 15
          + coalesce((p_score).track_record_component, 0) * 15
          + coalesce((p_score).metadata_component, 0) * 5
        ) / nullif(
          (case when (p_score).reputation_component is not null then 25 else 0 end)
          + (case when (p_score).reliability_component is not null then 20 else 0 end)
          + (case when (p_score).availability_component is not null then 20 else 0 end)
          + (case when (p_score).capability_component is not null then 15 else 0 end)
          + (case when (p_score).track_record_component is not null then 15 else 0 end)
          + (case when (p_score).metadata_component is not null then 5 else 0 end),
          0
        ),
        2
      )
    when (p_agent).metadata_status <> 'valid' then
      0::numeric
    else
      round(
        (
          (
            (case when nullif(btrim((p_agent).name), '') is not null then 25 else 0 end)
            + (case when nullif(btrim((p_agent).description), '') is not null then 30 else 0 end)
            + (case when nullif(btrim((p_agent).image_url), '') is not null then 10 else 0 end)
            + (case when (p_agent).owner_address is not null then 10 else 0 end)
            + (case when (p_agent).active is not null then 5 else 0 end)
            + (case when (p_agent).x402_supported is not null then 5 else 0 end)
            + (case when (p_agent).last_synced_at is not null then 15 else 0 end)
          ) * 5
          + (
            case when coalesce(p_service_count, 0) = 0 then 0
            else least(
              100,
              40
              + case when coalesce(p_unique_service_types, 0) >= 2 then 20 else 0 end
              + case when coalesce(p_unique_service_types, 0) >= 3 then 10 else 0 end
              + case when coalesce(p_has_endpoint, false) then 15 else 0 end
              + case when coalesce(p_has_version, false) then 10 else 0 end
            )
            end
          ) * 15
        ) / 20.0,
        2
      )
  end;
$function$;

revoke all on function public.discovery_display_rating(
  public.agents, public.agent_scores, bigint, bigint, boolean, boolean
) from public, anon, authenticated;
grant execute on function public.discovery_display_rating(
  public.agents, public.agent_scores, bigint, bigint, boolean, boolean
) to service_role;

do $migration$
declare
  v_function regprocedure := to_regprocedure(
    'public.search_agents_advanced(text[],text[],text[],text,integer,integer,bigint[],text[],text[],text,boolean)'
  );
  v_source text;
  v_updated_source text;
  v_rating_expression text := 'public.discovery_display_rating(agent, score, coalesce(service_stats.service_count, 0), coalesce(service_stats.unique_service_types, 0), coalesce(service_stats.has_endpoint, false), coalesce(service_stats.has_version, false))';
begin
  if v_function is null then
    raise exception 'search_agents_advanced must exist before aligning discovery ratings';
  end if;

  select proc.prosrc
  into v_source
  from pg_catalog.pg_proc as proc
  where proc.oid = v_function;

  if position('count(*)::bigint as service_count,' in v_source) = 0
    or position('score.sift_score,' in v_source) = 0
    or position('score.sift_score is not null' in v_source) = 0
    or position(
      'where (v_sort in (''available-first'', ''services-desc'') or v_ready_only)'
      in v_source
    ) = 0 then
    raise exception 'search_agents_advanced no longer matches the reviewed rating query shape';
  end if;

  v_updated_source := replace(
    v_source,
    'count(*)::bigint as service_count,',
    'count(*)::bigint as service_count,
      count(distinct lower(btrim(service.service_type)))::bigint as unique_service_types,
      bool_or(nullif(btrim(service.endpoint), '''') is not null) as has_endpoint,
      bool_or(nullif(btrim(service.version), '''') is not null) as has_version,'
  );

  v_updated_source := replace(
    v_updated_source,
    'where (v_sort in (''available-first'', ''services-desc'') or v_ready_only)',
    'where (
      v_sort in (''available-first'', ''services-desc'')
      or v_ready_only
      or cardinality(v_score_bands) > 0
    )'
  );

  v_updated_source := replace(
    v_updated_source,
    'score.sift_score,',
    '__sift_persisted_score__,'
  );
  v_updated_source := replace(
    v_updated_source,
    'score.sift_score',
    v_rating_expression
  );
  v_updated_source := replace(
    v_updated_source,
    '__sift_persisted_score__,',
    'score.sift_score,'
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

comment on function public.discovery_display_rating(
  public.agents, public.agent_scores, bigint, bigint, boolean, boolean
) is
  'Returns the evidence-bounded rating displayed on Sift agent cards; does not persist or promote fallback ratings to Sift Scores.';

comment on function public.search_agents_advanced(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) is
  'Bounded evidence-backed discovery whose rating filters match the rating displayed on agent cards.';

commit;

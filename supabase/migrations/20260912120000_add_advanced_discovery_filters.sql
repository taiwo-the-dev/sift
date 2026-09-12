-- Add evidence-backed rating/registration filters and decision-oriented sorts.
-- The function returns only persisted catalogue data; missing evidence remains null.

begin;

create index if not exists agents_chain_registered_at_discovery_idx
  on public.agents (chain_id, registered_at desc nulls last, id)
  where registered_at is not null;

create index if not exists agent_scores_sift_score_agent_idx
  on public.agent_scores (sift_score desc nulls last, agent_db_id)
  where sift_score is not null;

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
as $function$
declare
  v_categories text[];
  v_chain_ids bigint[];
  v_health_statuses text[];
  v_metadata_statuses text[];
  v_page integer := greatest(1, least(coalesce(p_page, 1), 10000));
  v_page_size integer := greatest(1, least(coalesce(p_page_size, 12), 36));
  v_ready_only boolean := coalesce(p_ready_only, false);
  v_registration_period text := case
    when p_registration_period in ('day', 'week', 'month', 'older')
      then p_registration_period
    else null
  end;
  v_score_bands text[];
  v_search_query tsquery;
  v_search_terms text[];
  v_sort text := case
    when p_sort in (
      'relevance', 'recent', 'oldest', 'profile-first',
      'name-asc', 'name-desc', 'score-desc', 'score-asc',
      'available-first', 'health-recent', 'services-desc'
    ) then p_sort
    else 'recent'
  end;
begin
  select coalesce(array(
    select distinct supplied.chain_id
    from unnest(coalesce(p_chain_ids, array[]::bigint[])) as supplied(chain_id)
    where supplied.chain_id in (56, 97)
    order by supplied.chain_id
    limit 2
  ), array[]::bigint[]) into v_chain_ids;
  if cardinality(v_chain_ids) = 0 then
    v_chain_ids := array[56]::bigint[];
  end if;

  select coalesce(array(
    select distinct supplied.category
    from unnest(coalesce(p_categories, array[]::text[])) as supplied(category)
    where supplied.category in (
      'yield-optimisation', 'grid-trading',
      'health-factor-monitoring', 'liquidity-rebalancing'
    )
    order by supplied.category
    limit 4
  ), array[]::text[]) into v_categories;

  select coalesce(array(
    select distinct supplied.metadata_status
    from unnest(coalesce(p_metadata_statuses, array[]::text[]))
      as supplied(metadata_status)
    where supplied.metadata_status in ('pending', 'valid', 'invalid', 'unavailable')
    order by supplied.metadata_status
    limit 4
  ), array[]::text[]) into v_metadata_statuses;

  select coalesce(array(
    select distinct supplied.health_status
    from unnest(coalesce(p_health_statuses, array[]::text[]))
      as supplied(health_status)
    where supplied.health_status in ('online', 'degraded', 'offline', 'unknown')
    order by supplied.health_status
    limit 4
  ), array[]::text[]) into v_health_statuses;

  select coalesce(array(
    select distinct supplied.score_band
    from unnest(coalesce(p_score_bands, array[]::text[]))
      as supplied(score_band)
    where supplied.score_band in ('excellent', 'good', 'fair', 'weak')
    order by supplied.score_band
    limit 4
  ), array[]::text[]) into v_score_bands;

  select coalesce(array(
    select distinct lower(trim(supplied.term))
    from unnest(coalesce(p_search_terms, array[]::text[])) as supplied(term)
    where length(trim(supplied.term)) between 2 and 64
      and trim(supplied.term) ~ '[[:alnum:]]'
    order by lower(trim(supplied.term))
    limit 12
  ), array[]::text[]) into v_search_terms;

  if cardinality(v_search_terms) > 0 then
    select websearch_to_tsquery(
      'simple'::regconfig,
      array_to_string(v_search_terms, ' OR ')
    ) into v_search_query;
  end if;

  return query
  with service_stats as (
    select
      service.agent_db_id,
      count(*)::bigint as service_count,
      min(
        case
          when service.endpoint is not null
            and service_agent.metadata_status = 'valid'
            and service_agent.active is not false
            and service.availability_status = 'available'
            and service.availability_last_success_at >= now() - interval '24 hours'
          then case service.activation_method
            when 'erc8183' then 0
            when 'a2a' then 1
            when 'mcp' then 2
            when 'x402' then 3
            else null
          end
          else null
        end
      ) as access_priority
    from public.agent_services as service
    inner join public.agents as service_agent
      on service_agent.id = service.agent_db_id
    where (v_sort in ('available-first', 'services-desc') or v_ready_only)
      and service_agent.chain_id = any(v_chain_ids)
    group by service.agent_db_id
  ),
  matching as materialized (
    select
      agent.id,
      agent.chain_id,
      agent.agent_id,
      agent.registry_address,
      agent.registered_block,
      agent.metadata_status,
      lower(agent.name) as normalized_name,
      score.sift_score,
      health.last_checked_at as health_checked_at,
      coalesce(service_stats.service_count, 0) as service_count,
      service_stats.access_priority,
      case
        when v_search_query is null then 0::real
        else ts_rank_cd(
          to_tsvector(
            'simple'::regconfig,
            concat_ws(' ', agent.name, agent.description)
          ),
          v_search_query
        )::real
      end as search_relevance
    from public.agents as agent
    left join public.agent_scores as score on score.agent_db_id = agent.id
    left join public.agent_health as health on health.agent_db_id = agent.id
    left join service_stats on service_stats.agent_db_id = agent.id
    where agent.chain_id = any(v_chain_ids)
      and (
        cardinality(v_metadata_statuses) = 0
        or agent.metadata_status = any(v_metadata_statuses)
      )
      and (
        cardinality(v_categories) = 0
        or exists (
          select 1
          from public.agent_category_evidence as matched_category
          where matched_category.agent_db_id = agent.id
            and matched_category.category = any(v_categories)
        )
      )
      and (
        cardinality(v_health_statuses) = 0
        or coalesce(health.status, 'unknown') = any(v_health_statuses)
      )
      and (
        cardinality(v_score_bands) = 0
        or (
          score.sift_score is not null
          and (
            ('excellent' = any(v_score_bands) and score.sift_score >= 80)
            or ('good' = any(v_score_bands) and score.sift_score >= 60 and score.sift_score < 80)
            or ('fair' = any(v_score_bands) and score.sift_score >= 40 and score.sift_score < 60)
            or ('weak' = any(v_score_bands) and score.sift_score < 40)
          )
        )
      )
      and (
        v_registration_period is null
        or (
          agent.registered_at is not null
          and case v_registration_period
            when 'day' then agent.registered_at >= now() - interval '1 day'
            when 'week' then agent.registered_at >= now() - interval '7 days'
            when 'month' then agent.registered_at >= now() - interval '30 days'
            when 'older' then agent.registered_at < now() - interval '30 days'
            else true
          end
        )
      )
      and (
        not v_ready_only
        or (
          agent.metadata_status = 'valid'
          and agent.active is not false
          and service_stats.access_priority is not null
        )
      )
      and (
        v_search_query is null
        or to_tsvector(
          'simple'::regconfig,
          concat_ws(' ', agent.name, agent.description)
        ) @@ v_search_query
        or exists (
          select 1
          from public.agent_services as searchable_service
          where searchable_service.agent_db_id = agent.id
            and to_tsvector(
              'simple'::regconfig,
              concat_ws(
                ' ',
                searchable_service.service_type,
                searchable_service.endpoint,
                searchable_service.metadata::text
              )
            ) @@ v_search_query
        )
      )
  ),
  page_candidates as materialized (
    select matching.*
    from matching
    order by
      case when v_sort = 'relevance' then matching.search_relevance end desc nulls last,
      case when v_sort = 'score-desc' then matching.sift_score end desc nulls last,
      case when v_sort = 'score-asc' then matching.sift_score end asc nulls last,
      case when v_sort = 'available-first' then matching.access_priority end asc nulls last,
      case when v_sort = 'health-recent' then matching.health_checked_at end desc nulls last,
      case when v_sort = 'services-desc' then matching.service_count end desc nulls last,
      case when v_sort = 'profile-first' then matching.metadata_status = 'valid' end desc nulls last,
      case when v_sort in (
        'relevance', 'recent', 'profile-first', 'score-desc', 'score-asc',
        'available-first', 'health-recent', 'services-desc'
      ) then matching.registered_block end desc nulls last,
      case when v_sort = 'oldest' then matching.registered_block end asc nulls last,
      case when v_sort = 'name-asc' then matching.normalized_name end asc nulls last,
      case when v_sort = 'name-desc' then matching.normalized_name end desc nulls last,
      matching.chain_id,
      matching.registry_address,
      length(matching.agent_id),
      matching.agent_id
    limit v_page_size + 1
    offset (v_page - 1) * v_page_size
  ),
  page_keys as materialized (
    select
      page_candidates.*,
      count(*) over () > v_page_size as page_has_more
    from page_candidates
    limit v_page_size
  )
  select
    agent.id,
    agent.chain_id,
    agent.agent_id,
    agent.registry_address,
    agent.owner_address,
    agent.name,
    agent.description,
    agent.image_url,
    coalesce(categories.resolved_categories, array[]::text[]),
    categories.primary_source,
    coalesce(categories.category_evidence, '[]'::jsonb),
    agent.active,
    agent.x402_supported,
    agent.metadata_status,
    agent.registered_block,
    agent.registered_at,
    agent.last_synced_at,
    coalesce(services.service_list, '[]'::jsonb),
    page_keys.search_relevance,
    page_keys.page_has_more,
    v_page
  from page_keys
  inner join public.agents as agent on agent.id = page_keys.id
  left join lateral (
    select
      array_agg(
        evidence.category
        order by array_position(
          array[
            'yield-optimisation', 'grid-trading',
            'health-factor-monitoring', 'liquidity-rebalancing'
          ],
          evidence.category
        )
      ) as resolved_categories,
      (array_agg(
        evidence.source
        order by (evidence.source = 'declared-metadata') desc
      ))[1] as primary_source,
      jsonb_agg(
        jsonb_build_object(
          'category', evidence.category,
          'confidence', evidence.confidence,
          'facts', evidence.facts,
          'matchedTerms', coalesce(evidence.evidence->'matchedTerms', '[]'::jsonb),
          'observedAt', evidence.observed_at,
          'ruleVersion', evidence.rule_version,
          'source', evidence.source
        )
        order by evidence.category
      ) as category_evidence
    from public.agent_category_evidence as evidence
    where evidence.agent_db_id = agent.id
  ) as categories on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'serviceType', service.service_type,
        'version', service.version
      )
      order by service.created_at, service.id
    ) as service_list
    from public.agent_services as service
    where service.agent_db_id = agent.id
  ) as services on true
  order by
    case when v_sort = 'relevance' then page_keys.search_relevance end desc nulls last,
    case when v_sort = 'score-desc' then page_keys.sift_score end desc nulls last,
    case when v_sort = 'score-asc' then page_keys.sift_score end asc nulls last,
    case when v_sort = 'available-first' then page_keys.access_priority end asc nulls last,
    case when v_sort = 'health-recent' then page_keys.health_checked_at end desc nulls last,
    case when v_sort = 'services-desc' then page_keys.service_count end desc nulls last,
    case when v_sort = 'profile-first' then page_keys.metadata_status = 'valid' end desc nulls last,
    case when v_sort in (
      'relevance', 'recent', 'profile-first', 'score-desc', 'score-asc',
      'available-first', 'health-recent', 'services-desc'
    ) then page_keys.registered_block end desc nulls last,
    case when v_sort = 'oldest' then page_keys.registered_block end asc nulls last,
    case when v_sort = 'name-asc' then page_keys.normalized_name end asc nulls last,
    case when v_sort = 'name-desc' then page_keys.normalized_name end desc nulls last,
    page_keys.chain_id,
    page_keys.registry_address,
    length(page_keys.agent_id),
    page_keys.agent_id;
end;
$function$;

revoke all on function public.search_agents_advanced(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) from public, anon, authenticated;
grant execute on function public.search_agents_advanced(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) to service_role;

comment on function public.search_agents_advanced(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) is
  'Bounded discovery search for evidence-backed rating, registration, health, availability, and service-count decisions.';

commit;

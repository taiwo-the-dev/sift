begin;

alter function public.search_agents(
  text[], text[], text[], text, integer, integer, bigint[]
) rename to search_agents_general;

revoke execute on function public.search_agents_general(
  text[], text[], text[], text, integer, integer, bigint[]
) from public, anon, authenticated;
grant execute on function public.search_agents_general(
  text[], text[], text[], text, integer, integer, bigint[]
) to service_role;

comment on function public.search_agents_general(
  text[], text[], text[], text, integer, integer, bigint[]
) is
  'Internal indexed discovery plan for requests that do not combine category and text filters.';

create function public.search_agents(
  p_search_terms text[] default array[]::text[],
  p_categories text[] default array[]::text[],
  p_metadata_statuses text[] default array[]::text[],
  p_sort text default 'recent',
  p_page integer default 1,
  p_page_size integer default 12,
  p_chain_ids bigint[] default array[56]::bigint[]
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
  v_metadata_statuses text[];
  v_page integer := greatest(1, least(coalesce(p_page, 1), 10000));
  v_page_size integer := greatest(1, least(coalesce(p_page_size, 12), 36));
  v_search_query tsquery;
  v_search_terms text[];
  v_sort text := case
    when p_sort in ('relevance', 'recent', 'oldest', 'name-asc') then p_sort
    else 'recent'
  end;
begin
  select coalesce(array(
    select distinct supplied.chain_id
    from unnest(coalesce(p_chain_ids, array[]::bigint[])) as supplied(chain_id)
    where supplied.chain_id in (56, 97)
    order by supplied.chain_id
    limit 2
  ), array[]::bigint[])
  into v_chain_ids;
  if cardinality(v_chain_ids) = 0 then
    v_chain_ids := array[56]::bigint[];
  end if;

  select coalesce(array(
    select distinct supplied.category
    from unnest(coalesce(p_categories, array[]::text[])) as supplied(category)
    where supplied.category in (
      'yield-optimisation',
      'grid-trading',
      'health-factor-monitoring',
      'liquidity-rebalancing'
    )
    order by supplied.category
    limit 4
  ), array[]::text[])
  into v_categories;

  select coalesce(array(
    select distinct supplied.metadata_status
    from unnest(coalesce(p_metadata_statuses, array[]::text[]))
      as supplied(metadata_status)
    where supplied.metadata_status in (
      'pending', 'valid', 'invalid', 'unavailable'
    )
    order by supplied.metadata_status
    limit 4
  ), array[]::text[])
  into v_metadata_statuses;

  select coalesce(array(
    select distinct lower(trim(supplied.term))
    from unnest(coalesce(p_search_terms, array[]::text[]))
      as supplied(term)
    where length(trim(supplied.term)) between 2 and 64
      and trim(supplied.term) ~ '[[:alnum:]]'
    order by lower(trim(supplied.term))
    limit 12
  ), array[]::text[])
  into v_search_terms;

  if cardinality(v_categories) = 0 or cardinality(v_search_terms) = 0 then
    return query
    select general_result.*
    from public.search_agents_general(
      p_search_terms,
      p_categories,
      p_metadata_statuses,
      p_sort,
      p_page,
      p_page_size,
      p_chain_ids
    ) as general_result;
    return;
  end if;

  select websearch_to_tsquery(
    'simple'::regconfig,
    array_to_string(v_search_terms, ' OR ')
  )
  into v_search_query;

  return query
  with category_candidates as materialized (
    select distinct evidence.agent_db_id
    from public.agent_category_evidence as evidence
    where evidence.category = any(v_categories)
  ),
  matched_candidates as materialized (
    select
      candidate_agent.id,
      candidate_agent.chain_id,
      candidate_agent.agent_id,
      candidate_agent.registry_address,
      candidate_agent.registered_block,
      lower(candidate_agent.name) as normalized_name,
      ts_rank_cd(
        to_tsvector(
          'simple'::regconfig,
          coalesce(candidate_agent.name, '') || ' ' ||
          coalesce(candidate_agent.description, '')
        ),
        v_search_query
      )::real as search_relevance
    from category_candidates
    inner join public.agents as candidate_agent
      on candidate_agent.id = category_candidates.agent_db_id
    where candidate_agent.chain_id = any(v_chain_ids)
      and (
        cardinality(v_metadata_statuses) = 0
        or candidate_agent.metadata_status = any(v_metadata_statuses)
      )
      and (
        to_tsvector(
          'simple'::regconfig,
          coalesce(candidate_agent.name, '') || ' ' ||
          coalesce(candidate_agent.description, '')
        ) @@ v_search_query
        or exists (
          select 1
          from public.agent_services as searchable_service
          where searchable_service.agent_db_id = candidate_agent.id
            and to_tsvector(
              'simple'::regconfig,
              coalesce(searchable_service.service_type, '') || ' ' ||
              coalesce(searchable_service.endpoint, '') || ' ' ||
              coalesce(searchable_service.metadata::text, '')
            ) @@ v_search_query
        )
      )
  ),
  page_candidates as materialized (
    select matched_candidates.*
    from matched_candidates
    order by
      case when v_sort = 'relevance'
        then matched_candidates.search_relevance end desc nulls last,
      case when v_sort = 'oldest'
        then matched_candidates.registered_block end asc nulls last,
      case when v_sort in ('relevance', 'recent')
        then matched_candidates.registered_block end desc nulls last,
      case when v_sort = 'name-asc'
        then matched_candidates.normalized_name end asc nulls last,
      matched_candidates.chain_id,
      matched_candidates.registry_address,
      length(matched_candidates.agent_id),
      matched_candidates.agent_id
    limit v_page_size + 1
    offset (v_page - 1) * v_page_size
  ),
  page_keys as (
    select
      page_candidates.*,
      count(*) over () > v_page_size as page_has_more
    from page_candidates
    order by
      case when v_sort = 'relevance'
        then page_candidates.search_relevance end desc nulls last,
      case when v_sort = 'oldest'
        then page_candidates.registered_block end asc nulls last,
      case when v_sort in ('relevance', 'recent')
        then page_candidates.registered_block end desc nulls last,
      case when v_sort = 'name-asc'
        then page_candidates.normalized_name end asc nulls last,
      page_candidates.chain_id,
      page_candidates.registry_address,
      length(page_candidates.agent_id),
      page_candidates.agent_id
    limit v_page_size
  )
  select
    selected_agent.id,
    selected_agent.chain_id,
    selected_agent.agent_id,
    selected_agent.registry_address,
    selected_agent.owner_address,
    selected_agent.name,
    selected_agent.description,
    selected_agent.image_url,
    coalesce(categories.resolved_categories, array[]::text[]),
    categories.primary_source,
    coalesce(categories.category_evidence, '[]'::jsonb),
    selected_agent.active,
    selected_agent.x402_supported,
    selected_agent.metadata_status,
    selected_agent.registered_block,
    selected_agent.registered_at,
    selected_agent.last_synced_at,
    coalesce(services.service_list, '[]'::jsonb),
    page_keys.search_relevance,
    page_keys.page_has_more,
    v_page
  from page_keys
  inner join public.agents as selected_agent on selected_agent.id = page_keys.id
  left join lateral (
    select
      array_agg(evidence.category order by
        array_position(
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
          'matchedTerms', coalesce(
            evidence.evidence->'matchedTerms', '[]'::jsonb
          ),
          'observedAt', evidence.observed_at,
          'ruleVersion', evidence.rule_version,
          'source', evidence.source
        )
        order by evidence.category
      ) as category_evidence
    from public.agent_category_evidence as evidence
    where evidence.agent_db_id = selected_agent.id
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
    where service.agent_db_id = selected_agent.id
  ) as services on true
  order by
    case when v_sort = 'relevance'
      then page_keys.search_relevance end desc nulls last,
    case when v_sort = 'oldest'
      then selected_agent.registered_block end asc nulls last,
    case when v_sort in ('relevance', 'recent')
      then selected_agent.registered_block end desc nulls last,
    case when v_sort = 'name-asc'
      then lower(selected_agent.name) end asc nulls last,
    selected_agent.chain_id,
    selected_agent.registry_address,
    length(selected_agent.agent_id),
    selected_agent.agent_id;
end;
$function$;

revoke execute on function public.search_agents(
  text[], text[], text[], text, integer, integer, bigint[]
) from public, anon, authenticated;
grant execute on function public.search_agents(
  text[], text[], text[], text, integer, integer, bigint[]
) to service_role;

comment on function public.search_agents(
  text[], text[], text[], text, integer, integer, bigint[]
) is
  'Bounded discovery query that evaluates combined category and text searches against materialized category candidates first.';

commit;

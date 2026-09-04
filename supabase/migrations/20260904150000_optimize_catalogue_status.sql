begin;

create index agents_catalogue_latest_sync_idx
  on public.agents (
    chain_id,
    registry_address,
    last_synced_at desc nulls last
  )
  where last_synced_at is not null;

create index agents_category_classification_idx
  on public.agents (chain_id, metadata_status, id);

comment on index public.agents_catalogue_latest_sync_idx is
  'Supports bounded catalogue freshness reads without sorting the full network inventory.';

comment on index public.agents_category_classification_idx is
  'Supports resumable validated-metadata classification in stable UUID order.';

create or replace function public.search_agents(
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
  v_candidate_order text;
  v_categories text[];
  v_chain_ids bigint[];
  v_from_sql text := 'from public.agents as a';
  v_metadata_statuses text[];
  v_outer_order text;
  v_page integer := greatest(1, least(coalesce(p_page, 1), 10000));
  v_page_order text;
  v_page_size integer := greatest(1, least(coalesce(p_page_size, 12), 36));
  v_relevance_sql text := '0::real';
  v_search_query tsquery;
  v_search_terms text[];
  v_sort text := case
    when p_sort in ('relevance', 'recent', 'oldest', 'name-asc') then p_sort
    else 'recent'
  end;
  v_where_sql text := 'a.chain_id = any($1)';
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

  if cardinality(v_metadata_statuses) > 0 then
    v_where_sql := v_where_sql || ' and a.metadata_status = any($2)';
  end if;

  if cardinality(v_categories) > 0 then
    v_from_sql := v_from_sql ||
      ' inner join (' ||
      'select distinct category_match.agent_db_id ' ||
      'from public.agent_category_evidence as category_match ' ||
      'where category_match.category = any($3)' ||
      ') as matched_category on matched_category.agent_db_id = a.id';
  end if;

  if cardinality(v_search_terms) > 0 then
    select websearch_to_tsquery(
      'simple'::regconfig,
      array_to_string(v_search_terms, ' OR ')
    )
    into v_search_query;

    v_from_sql := v_from_sql ||
      ' inner join (' ||
      'select searched_agent.id as agent_db_id ' ||
      'from public.agents as searched_agent ' ||
      'where searched_agent.chain_id = any($1) and ' ||
      'to_tsvector(''simple''::regconfig, ' ||
      'coalesce(searched_agent.name, '''') || '' '' || ' ||
      'coalesce(searched_agent.description, '''')) @@ $4 ' ||
      'union ' ||
      'select searchable_service.agent_db_id ' ||
      'from public.agent_services as searchable_service ' ||
      'inner join public.agents as service_agent ' ||
      'on service_agent.id = searchable_service.agent_db_id ' ||
      'where service_agent.chain_id = any($1) and ' ||
      'to_tsvector(''simple''::regconfig, ' ||
      'coalesce(searchable_service.service_type, '''') || '' '' || ' ||
      'coalesce(searchable_service.endpoint, '''') || '' '' || ' ||
      'coalesce(searchable_service.metadata::text, '''')) @@ $4' ||
      ') as matched_search on matched_search.agent_db_id = a.id';
    v_relevance_sql :=
      'ts_rank_cd(' ||
      'to_tsvector(''simple''::regconfig, ' ||
      'concat_ws('' '', a.name, a.description)), $4)::real';
  end if;

  if v_sort = 'relevance' then
    v_candidate_order :=
      'search_relevance desc, a.registered_block desc nulls last, ' ||
      'a.chain_id, a.registry_address, length(a.agent_id), a.agent_id';
    v_page_order :=
      'page_candidates.search_relevance desc, ' ||
      'page_candidates.registered_block desc nulls last, ' ||
      'page_candidates.chain_id, page_candidates.registry_address, ' ||
      'length(page_candidates.agent_id), page_candidates.agent_id';
    v_outer_order :=
      'page_keys.search_relevance desc, a.registered_block desc nulls last, ' ||
      'a.chain_id, a.registry_address, length(a.agent_id), a.agent_id';
  elsif v_sort = 'oldest' then
    v_candidate_order :=
      'a.registered_block asc nulls last, a.chain_id, a.registry_address, ' ||
      'length(a.agent_id), a.agent_id';
    v_page_order :=
      'page_candidates.registered_block asc nulls last, ' ||
      'page_candidates.chain_id, page_candidates.registry_address, ' ||
      'length(page_candidates.agent_id), page_candidates.agent_id';
    v_outer_order :=
      'a.registered_block asc nulls last, a.chain_id, a.registry_address, ' ||
      'length(a.agent_id), a.agent_id';
  elsif v_sort = 'name-asc' then
    v_candidate_order :=
      'lower(a.name) asc nulls last, a.chain_id, a.registry_address, ' ||
      'length(a.agent_id), a.agent_id';
    v_page_order :=
      'page_candidates.normalized_name asc nulls last, ' ||
      'page_candidates.chain_id, page_candidates.registry_address, ' ||
      'length(page_candidates.agent_id), page_candidates.agent_id';
    v_outer_order :=
      'lower(a.name) asc nulls last, a.chain_id, a.registry_address, ' ||
      'length(a.agent_id), a.agent_id';
  else
    v_candidate_order :=
      'a.registered_block desc nulls last, a.chain_id, a.registry_address, ' ||
      'length(a.agent_id), a.agent_id';
    v_page_order :=
      'page_candidates.registered_block desc nulls last, ' ||
      'page_candidates.chain_id, page_candidates.registry_address, ' ||
      'length(page_candidates.agent_id), page_candidates.agent_id';
    v_outer_order :=
      'a.registered_block desc nulls last, a.chain_id, a.registry_address, ' ||
      'length(a.agent_id), a.agent_id';
  end if;

  return query execute format(
    $query$
      with page_candidates as materialized (
        select
          a.id,
          a.chain_id,
          a.agent_id,
          a.registry_address,
          a.registered_block,
          lower(a.name) as normalized_name,
          %s as search_relevance
        %s
        where %s
        order by %s
        limit $5 + 1
        offset ($6 - 1) * $5
      ),
      page_keys as (
        select
          page_candidates.*,
          count(*) over () > $5 as has_more
        from page_candidates
        order by %s
        limit $5
      )
      select
        a.id,
        a.chain_id,
        a.agent_id,
        a.registry_address,
        a.owner_address,
        a.name,
        a.description,
        a.image_url,
        coalesce(categories.resolved_categories, array[]::text[]),
        categories.primary_source,
        coalesce(categories.category_evidence, '[]'::jsonb),
        a.active,
        a.x402_supported,
        a.metadata_status,
        a.registered_block,
        a.registered_at,
        a.last_synced_at,
        coalesce(services.service_list, '[]'::jsonb),
        page_keys.search_relevance,
        page_keys.has_more,
        $6::integer
      from page_keys
      inner join public.agents as a on a.id = page_keys.id
      left join lateral (
        select
          array_agg(e.category order by
            array_position(
              array[
                'yield-optimisation', 'grid-trading',
                'health-factor-monitoring', 'liquidity-rebalancing'
              ],
              e.category
            )
          ) as resolved_categories,
          (array_agg(
            e.source order by (e.source = 'declared-metadata') desc
          ))[1] as primary_source,
          jsonb_agg(
            jsonb_build_object(
              'category', e.category,
              'confidence', e.confidence,
              'facts', e.facts,
              'matchedTerms', coalesce(
                e.evidence->'matchedTerms', '[]'::jsonb
              ),
              'observedAt', e.observed_at,
              'ruleVersion', e.rule_version,
              'source', e.source
            )
            order by e.category
          ) as category_evidence
        from public.agent_category_evidence as e
        where e.agent_db_id = a.id
      ) as categories on true
      left join lateral (
        select jsonb_agg(
          jsonb_build_object(
            'serviceType', svc.service_type,
            'version', svc.version
          )
          order by svc.created_at, svc.id
        ) as service_list
        from public.agent_services as svc
        where svc.agent_db_id = a.id
      ) as services on true
      order by %s
    $query$,
    v_relevance_sql,
    v_from_sql,
    v_where_sql,
    v_candidate_order,
    v_page_order,
    v_outer_order
  ) using
    v_chain_ids,
    v_metadata_statuses,
    v_categories,
    v_search_query,
    v_page_size,
    v_page;
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
  'Bounded indexed discovery query with allowlisted dynamic plans for recent, category, metadata, and full-text paths.';

commit;

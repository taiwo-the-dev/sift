begin;

create index agent_services_search_idx
  on public.agent_services using gin (
    to_tsvector(
      'simple'::regconfig,
      coalesce(service_type, '') || ' ' ||
      coalesce(endpoint, '') || ' ' ||
      coalesce(metadata::text, '')
    )
  );

create function public.search_agents(
  p_search_terms text[] default array[]::text[],
  p_categories text[] default array[]::text[],
  p_metadata_statuses text[] default array[]::text[],
  p_sort text default 'recent',
  p_page integer default 1,
  p_page_size integer default 12
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
  active boolean,
  x402_supported boolean,
  metadata_status text,
  registered_block bigint,
  registered_at timestamptz,
  last_synced_at timestamptz,
  services jsonb,
  relevance real,
  total_count bigint,
  result_page integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with recursive
  request as (
    select
      greatest(1, least(coalesce(p_page, 1), 10000)) as requested_page,
      greatest(1, least(coalesce(p_page_size, 12), 36)) as page_size,
      case
        when p_sort in ('relevance', 'recent', 'oldest', 'name-asc')
          then p_sort
        else 'recent'
      end as sort_key,
      array(
        select distinct category
        from unnest(coalesce(p_categories, array[]::text[])) as category
        where category in (
          'yield-optimisation',
          'grid-trading',
          'health-factor-monitoring',
          'liquidity-rebalancing'
        )
        limit 4
      ) as categories,
      array(
        select distinct metadata_status
        from unnest(coalesce(p_metadata_statuses, array[]::text[])) as metadata_status
        where metadata_status in ('pending', 'valid', 'invalid', 'unavailable')
        limit 4
      ) as metadata_statuses
  ),
  terms as (
    select lower(trim(term)) as term
    from unnest(coalesce(p_search_terms, array[]::text[]))
      with ordinality as supplied(term, position)
    where length(trim(term)) between 2 and 64
    order by position
    limit 12
  ),
  assembled as (
    select
      a.*,
      lower(
        concat_ws(
          ' ',
          a.name,
          a.description,
          service_data.classification_text
        )
      ) as classification_document,
      to_tsvector(
        'simple'::regconfig,
        concat_ws(
          ' ',
          a.name,
          a.description,
          a.category,
          service_data.search_text
        )
      ) as search_document,
      coalesce(service_data.services, '[]'::jsonb) as service_list
    from public.agents as a
    left join lateral (
      select
        string_agg(
          concat_ws(' ', service.service_type, service.metadata::text),
          ' '
        ) as classification_text,
        string_agg(
          concat_ws(
            ' ',
            service.service_type,
            service.endpoint,
            service.metadata::text
          ),
          ' '
        ) as search_text,
        jsonb_agg(
          jsonb_build_object(
            'serviceType', service.service_type,
            'version', service.version
          )
          order by service.created_at, service.id
        ) as services
      from public.agent_services as service
      where service.agent_db_id = a.id
    ) as service_data on true
  ),
  classified as (
    select
      assembled.*,
      case
        when assembled.category is not null then array[assembled.category]
        else array_remove(
          array[
            case
              when assembled.classification_document ~
                '(^|[^a-z0-9])(yield|apy|apr|staking|stake|farming|farm|vault)([^a-z0-9]|$)'
                then 'yield-optimisation'
            end,
            case
              when assembled.classification_document ~
                '(^|[^a-z0-9])(grid|trading|trader|trade|buy|sell|market[ -]?making)([^a-z0-9]|$)'
                then 'grid-trading'
            end,
            case
              when assembled.classification_document ~
                '(^|[^a-z0-9])(health factor|liquidation|liquidate|lending|borrowing|borrow|collateral|loan)([^a-z0-9]|$)'
                then 'health-factor-monitoring'
            end,
            case
              when assembled.classification_document ~
                '(^|[^a-z0-9])(liquidity|rebalance|rebalancing|lp|pool|concentrated liquidity)([^a-z0-9]|$)'
                then 'liquidity-rebalancing'
            end
          ]::text[],
          null
        )
      end as discovery_categories
    from assembled
  ),
  ranked as (
    select
      classified.*,
      coalesce(
        (
          select sum(
            ts_rank_cd(
              classified.search_document,
              plainto_tsquery('simple'::regconfig, terms.term)
            )
          )
          from terms
        ),
        0
      )::real as search_relevance
    from classified
  ),
  filtered as (
    select ranked.*
    from ranked
    cross join request
    where
      (
        cardinality(request.categories) = 0
        or ranked.discovery_categories && request.categories
      )
      and (
        cardinality(request.metadata_statuses) = 0
        or ranked.metadata_status = any(request.metadata_statuses)
      )
      and (
        not exists (select 1 from terms)
        or exists (
          select 1
          from terms
          where
            to_tsvector(
              'simple'::regconfig,
              coalesce(ranked.name, '') || ' ' ||
              coalesce(ranked.description, '')
            ) @@ plainto_tsquery('simple'::regconfig, terms.term)
            or exists (
              select 1
              from public.agent_services as searchable_service
              where
                searchable_service.agent_db_id = ranked.id
                and to_tsvector(
                  'simple'::regconfig,
                  coalesce(searchable_service.service_type, '') || ' ' ||
                  coalesce(searchable_service.endpoint, '') || ' ' ||
                  coalesce(searchable_service.metadata::text, '')
                ) @@ plainto_tsquery('simple'::regconfig, terms.term)
            )
        )
      )
  ),
  result_bounds as (
    select
      count(*)::bigint as matching_count,
      case
        when count(*) = 0 then 1
        else least(
          request.requested_page,
          ceil(count(*)::numeric / request.page_size)::integer
        )
      end as bounded_page
    from filtered
    cross join request
    group by request.requested_page, request.page_size
  )
  select
    filtered.id as agent_db_id,
    filtered.chain_id,
    filtered.agent_id,
    filtered.registry_address,
    filtered.owner_address,
    filtered.name,
    filtered.description,
    filtered.image_url,
    filtered.discovery_categories as resolved_categories,
    case
      when filtered.category is not null then 'indexed-metadata'
      when cardinality(filtered.discovery_categories) > 0
        then 'deterministic-keyword'
      else null
    end as category_source,
    filtered.active,
    filtered.x402_supported,
    filtered.metadata_status,
    filtered.registered_block,
    filtered.registered_at,
    filtered.last_synced_at,
    filtered.service_list as services,
    filtered.search_relevance as relevance,
    result_bounds.matching_count as total_count,
    result_bounds.bounded_page as result_page
  from filtered
  cross join request
  cross join result_bounds
  order by
    case
      when request.sort_key = 'relevance' then filtered.search_relevance
    end desc,
    case
      when request.sort_key = 'name-asc' then lower(filtered.name)
    end asc nulls last,
    case
      when request.sort_key = 'oldest' then filtered.registered_block
    end asc nulls last,
    case
      when request.sort_key in ('recent', 'relevance')
        then filtered.registered_block
    end desc nulls last,
    filtered.chain_id asc,
    filtered.registry_address asc,
    length(filtered.agent_id) asc,
    filtered.agent_id asc
  limit (select page_size from request)
  offset (
    (select bounded_page from result_bounds) - 1
  ) * (select page_size from request);
$$;

revoke execute on function public.search_agents(
  text[], text[], text[], text, integer, integer
) from public, anon, authenticated;

grant execute on function public.search_agents(
  text[], text[], text[], text, integer, integer
) to service_role;

comment on function public.search_agents(
  text[], text[], text[], text, integer, integer
) is
  'Bounded M4 discovery query over indexed ERC-8004 identities and service metadata.';

commit;

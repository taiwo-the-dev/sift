-- Make Available mean a real, recently verified action route. Keep working
-- services fresh and rank protected hiring and direct tasks before other routes.

begin;

create or replace function public.activation_check_candidates(
  p_limit integer default 25,
  p_stale_before timestamptz default now() - interval '6 hours'
)
returns table (
  service_id uuid,
  agent_db_id uuid,
  agent_id text,
  chain_id bigint,
  owner_address text,
  service_type text,
  endpoint text,
  version text,
  activation_method text,
  availability_status text,
  availability_failure_count integer,
  availability_last_success_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with eligible as materialized (
    select
      service.id as service_id,
      service.agent_db_id,
      agent.agent_id,
      agent.chain_id,
      agent.owner_address,
      service.service_type,
      service.endpoint,
      service.version,
      service.activation_method,
      service.availability_status,
      service.availability_failure_count,
      service.availability_last_success_at,
      service.availability_checked_at,
      case
        when service.availability_status in ('available', 'degraded') then 0
        when service.availability_status = 'unchecked' then 1
        else 2
      end as queue_priority,
      row_number() over (
        partition by service.activation_method
        order by
          case
            when service.availability_status in ('available', 'degraded') then 0
            when service.availability_status = 'unchecked' then 1
            else 2
          end,
          service.availability_checked_at asc nulls first,
          service.id
      ) as method_rank
    from public.agent_services as service
    join public.agents as agent on agent.id = service.agent_db_id
    where service.activation_method is not null
      and service.endpoint is not null
      and agent.metadata_status = 'valid'
      and agent.active is not false
      and (
        service.availability_checked_at is null
        or service.availability_checked_at < p_stale_before
      )
  )
  select
    eligible.service_id,
    eligible.agent_db_id,
    eligible.agent_id,
    eligible.chain_id,
    eligible.owner_address,
    eligible.service_type,
    eligible.endpoint,
    eligible.version,
    eligible.activation_method,
    eligible.availability_status,
    eligible.availability_failure_count,
    eligible.availability_last_success_at
  from eligible
  order by
    eligible.queue_priority,
    eligible.method_rank,
    eligible.activation_method,
    eligible.availability_checked_at asc nulls first,
    eligible.service_id
  limit greatest(0, least(coalesce(p_limit, 25), 100));
$$;

revoke all on function public.activation_check_candidates(integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.activation_check_candidates(integer, timestamptz)
  to service_role;

comment on function public.activation_check_candidates(integer, timestamptz) is
  'Refreshes proven services first and rotates new checks across every supported access method.';

create or replace function public.search_ready_agents(
  p_search_terms text[] default array[]::text[],
  p_categories text[] default array[]::text[],
  p_metadata_statuses text[] default array[]::text[],
  p_sort text default 'recent',
  p_page integer default 1,
  p_page_size integer default 12,
  p_chain_ids bigint[] default array[56]::bigint[],
  p_health_statuses text[] default array[]::text[]
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
  v_search_query tsquery;
  v_search_terms text[];
  v_sort text := case
    when p_sort in (
      'relevance', 'recent', 'oldest', 'profile-first',
      'name-asc', 'name-desc'
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
  with matching as materialized (
    select
      a.*,
      case when v_search_query is null then 0::real else
        ts_rank_cd(
          to_tsvector('simple'::regconfig, concat_ws(' ', a.name, a.description)),
          v_search_query
        )::real
      end as search_relevance,
      (
        select min(
          case action_service.activation_method
            when 'erc8183' then 0
            when 'a2a' then 1
            when 'mcp' then 2
            when 'x402' then 3
            else 4
          end
        )
        from public.agent_services as action_service
        where action_service.agent_db_id = a.id
          and action_service.endpoint is not null
          and action_service.availability_status = 'available'
          and action_service.availability_last_success_at
            >= now() - interval '24 hours'
      ) as access_priority
    from public.agents as a
    where a.chain_id = any(v_chain_ids)
      and a.metadata_status = 'valid'
      and a.active is not false
      and (
        cardinality(v_metadata_statuses) = 0
        or a.metadata_status = any(v_metadata_statuses)
      )
      and (
        cardinality(v_categories) = 0
        or exists (
          select 1
          from public.agent_category_evidence as matched_category
          where matched_category.agent_db_id = a.id
            and matched_category.category = any(v_categories)
        )
      )
      and (
        cardinality(v_health_statuses) = 0
        or coalesce(
          (select h.status from public.agent_health as h where h.agent_db_id = a.id),
          'unknown'
        ) = any(v_health_statuses)
      )
      and (
        v_search_query is null
        or to_tsvector(
          'simple'::regconfig,
          concat_ws(' ', a.name, a.description)
        ) @@ v_search_query
        or exists (
          select 1
          from public.agent_services as searchable_service
          where searchable_service.agent_db_id = a.id
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
      and exists (
        select 1
        from public.agent_services as available_service
        where available_service.agent_db_id = a.id
          and available_service.endpoint is not null
          and available_service.activation_method in ('erc8183', 'a2a', 'mcp', 'x402')
          and available_service.availability_status = 'available'
          and available_service.availability_last_success_at >= now() - interval '24 hours'
      )
  ),
  page_candidates as materialized (
    select matching.*
    from matching
    order by
      matching.access_priority,
      case when v_sort = 'relevance' then matching.search_relevance end desc nulls last,
      case when v_sort = 'profile-first' then matching.metadata_status = 'valid' end desc nulls last,
      case when v_sort in ('recent', 'profile-first', 'relevance') then matching.registered_block end desc nulls last,
      case when v_sort = 'oldest' then matching.registered_block end asc nulls last,
      case when v_sort = 'name-asc' then lower(matching.name) end asc nulls last,
      case when v_sort = 'name-desc' then lower(matching.name) end desc nulls last,
      matching.chain_id,
      matching.registry_address,
      length(matching.agent_id),
      matching.agent_id
    limit v_page_size + 1
    offset (v_page - 1) * v_page_size
  ),
  page_keys as materialized (
    select page_candidates.*, count(*) over () > v_page_size as page_has_more
    from page_candidates
    limit v_page_size
  )
  select
    page_keys.id,
    page_keys.chain_id,
    page_keys.agent_id,
    page_keys.registry_address,
    page_keys.owner_address,
    page_keys.name,
    page_keys.description,
    page_keys.image_url,
    coalesce(categories.resolved_categories, array[]::text[]),
    categories.primary_source,
    coalesce(categories.category_evidence, '[]'::jsonb),
    page_keys.active,
    page_keys.x402_supported,
    page_keys.metadata_status,
    page_keys.registered_block,
    page_keys.registered_at,
    page_keys.last_synced_at,
    coalesce(services.service_list, '[]'::jsonb),
    page_keys.search_relevance,
    page_keys.page_has_more,
    v_page
  from page_keys
  left join lateral (
    select
      array_agg(e.category order by e.category) as resolved_categories,
      (array_agg(e.source order by (e.source = 'declared-metadata') desc))[1]
        as primary_source,
      jsonb_agg(
        jsonb_build_object(
          'category', e.category,
          'confidence', e.confidence,
          'facts', e.facts,
          'matchedTerms', coalesce(e.evidence->'matchedTerms', '[]'::jsonb),
          'observedAt', e.observed_at,
          'ruleVersion', e.rule_version,
          'source', e.source
        ) order by e.category
      ) as category_evidence
    from public.agent_category_evidence as e
    where e.agent_db_id = page_keys.id
  ) as categories on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'serviceType', svc.service_type,
        'version', svc.version
      ) order by svc.created_at, svc.id
    ) as service_list
    from public.agent_services as svc
    where svc.agent_db_id = page_keys.id
  ) as services on true
  order by
    page_keys.access_priority,
    case when v_sort = 'relevance' then page_keys.search_relevance end desc nulls last,
    case when v_sort = 'profile-first' then page_keys.metadata_status = 'valid' end desc nulls last,
    case when v_sort in ('recent', 'profile-first', 'relevance') then page_keys.registered_block end desc nulls last,
    case when v_sort = 'oldest' then page_keys.registered_block end asc nulls last,
    case when v_sort = 'name-asc' then lower(page_keys.name) end asc nulls last,
    case when v_sort = 'name-desc' then lower(page_keys.name) end desc nulls last,
    page_keys.chain_id,
    page_keys.registry_address,
    length(page_keys.agent_id),
    page_keys.agent_id;
end;
$function$;

revoke all on function public.search_ready_agents(
  text[], text[], text[], text, integer, integer, bigint[], text[]
) from public, anon, authenticated;
grant execute on function public.search_ready_agents(
  text[], text[], text[], text, integer, integer, bigint[], text[]
) to service_role;

comment on function public.search_ready_agents(
  text[], text[], text[], text, integer, integer, bigint[], text[]
) is
  'Returns only recently verified actionable agents, ordered by protected hiring, A2A tasks, read-only MCP tools, then x402 payment flows.';

commit;


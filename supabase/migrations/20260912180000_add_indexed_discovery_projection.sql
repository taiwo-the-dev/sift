-- Serve discovery from a compact, incrementally maintained projection instead
-- of rebuilding service/category/health/score aggregates for every request.
-- Every value is derived from the canonical Sift evidence tables.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '10min';

create table public.agent_discovery_documents (
  agent_db_id uuid primary key references public.agents(id) on delete cascade,
  chain_id bigint not null check (chain_id in (56, 97)),
  agent_id text not null,
  registry_address text not null,
  metadata_status text not null check (
    metadata_status in ('pending', 'valid', 'invalid', 'unavailable')
  ),
  active boolean,
  registered_block bigint,
  registered_at timestamptz,
  normalized_name text,
  categories text[] not null default array[]::text[],
  health_status text not null default 'unknown' check (
    health_status in ('online', 'degraded', 'offline', 'unknown')
  ),
  health_checked_at timestamptz,
  sift_score numeric(5, 2) check (
    sift_score is null or sift_score between 0 and 100
  ),
  display_rating numeric(5, 2) not null check (
    display_rating between 0 and 100
  ),
  service_count integer not null default 0 check (service_count >= 0),
  erc8183_success_at timestamptz,
  a2a_success_at timestamptz,
  mcp_success_at timestamptz,
  x402_success_at timestamptz,
  access_last_success_at timestamptz,
  search_document tsvector not null,
  updated_at timestamptz not null default now()
);

alter table public.agent_discovery_documents enable row level security;
revoke all on table public.agent_discovery_documents
  from public, anon, authenticated;
grant select, insert, update, delete on table public.agent_discovery_documents
  to service_role;

create or replace function public.refresh_agent_discovery_documents(
  p_agent_ids uuid[] default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_refreshed bigint;
begin
  if p_agent_ids is not null and cardinality(p_agent_ids) = 0 then
    return 0;
  end if;

  if p_agent_ids is not null then
    delete from public.agent_discovery_documents as document
    where document.agent_db_id = any(p_agent_ids)
      and not exists (
        select 1
        from public.agents as existing_agent
        where existing_agent.id = document.agent_db_id
      );
  end if;

  with service_stats as materialized (
    select
      service.agent_db_id,
      count(*)::integer as service_count,
      count(distinct lower(btrim(service.service_type)))::bigint
        as unique_service_types,
      bool_or(nullif(btrim(service.endpoint), '') is not null)
        as has_endpoint,
      bool_or(nullif(btrim(service.version), '') is not null)
        as has_version,
      string_agg(
        left(
          concat_ws(
            ' ',
            service.service_type,
            service.endpoint,
            service.metadata::text
          ),
          4096
        ),
        ' '
        order by service.created_at, service.id
      ) as search_text,
      max(service.availability_last_success_at) filter (
        where service.endpoint is not null
          and service.availability_status = 'available'
          and service.activation_method = 'erc8183'
      ) as erc8183_success_at,
      max(service.availability_last_success_at) filter (
        where service.endpoint is not null
          and service.availability_status = 'available'
          and service.activation_method = 'a2a'
      ) as a2a_success_at,
      max(service.availability_last_success_at) filter (
        where service.endpoint is not null
          and service.availability_status = 'available'
          and service.activation_method = 'mcp'
      ) as mcp_success_at,
      max(service.availability_last_success_at) filter (
        where service.endpoint is not null
          and service.availability_status = 'available'
          and service.activation_method = 'x402'
      ) as x402_success_at
    from public.agent_services as service
    where p_agent_ids is null or service.agent_db_id = any(p_agent_ids)
    group by service.agent_db_id
  ),
  category_stats as materialized (
    select
      evidence.agent_db_id,
      array_agg(
        evidence.category
        order by array_position(
          array[
            'yield-optimisation',
            'grid-trading',
            'health-factor-monitoring',
            'liquidity-rebalancing'
          ],
          evidence.category
        )
      ) as categories
    from public.agent_category_evidence as evidence
    where p_agent_ids is null or evidence.agent_db_id = any(p_agent_ids)
    group by evidence.agent_db_id
  )
  insert into public.agent_discovery_documents (
    agent_db_id,
    chain_id,
    agent_id,
    registry_address,
    metadata_status,
    active,
    registered_block,
    registered_at,
    normalized_name,
    categories,
    health_status,
    health_checked_at,
    sift_score,
    display_rating,
    service_count,
    erc8183_success_at,
    a2a_success_at,
    mcp_success_at,
    x402_success_at,
    access_last_success_at,
    search_document,
    updated_at
  )
  select
    agent.id,
    agent.chain_id,
    agent.agent_id,
    agent.registry_address,
    agent.metadata_status,
    agent.active,
    agent.registered_block,
    agent.registered_at,
    lower(agent.name),
    coalesce(category_stats.categories, array[]::text[]),
    coalesce(health.status, 'unknown'),
    health.last_checked_at,
    score.sift_score,
    public.discovery_display_rating(
      agent,
      score,
      coalesce(service_stats.service_count, 0),
      coalesce(service_stats.unique_service_types, 0),
      coalesce(service_stats.has_endpoint, false),
      coalesce(service_stats.has_version, false)
    ),
    coalesce(service_stats.service_count, 0),
    service_stats.erc8183_success_at,
    service_stats.a2a_success_at,
    service_stats.mcp_success_at,
    service_stats.x402_success_at,
    greatest(
      service_stats.erc8183_success_at,
      service_stats.a2a_success_at,
      service_stats.mcp_success_at,
      service_stats.x402_success_at
    ),
    to_tsvector(
      'simple'::regconfig,
      concat_ws(
        ' ',
        agent.name,
        agent.description,
        array_to_string(category_stats.categories, ' '),
        left(service_stats.search_text, 262144)
      )
    ),
    now()
  from public.agents as agent
  left join public.agent_scores as score
    on score.agent_db_id = agent.id
  left join public.agent_health as health
    on health.agent_db_id = agent.id
  left join service_stats
    on service_stats.agent_db_id = agent.id
  left join category_stats
    on category_stats.agent_db_id = agent.id
  where p_agent_ids is null or agent.id = any(p_agent_ids)
  on conflict (agent_db_id) do update set
    chain_id = excluded.chain_id,
    agent_id = excluded.agent_id,
    registry_address = excluded.registry_address,
    metadata_status = excluded.metadata_status,
    active = excluded.active,
    registered_block = excluded.registered_block,
    registered_at = excluded.registered_at,
    normalized_name = excluded.normalized_name,
    categories = excluded.categories,
    health_status = excluded.health_status,
    health_checked_at = excluded.health_checked_at,
    sift_score = excluded.sift_score,
    display_rating = excluded.display_rating,
    service_count = excluded.service_count,
    erc8183_success_at = excluded.erc8183_success_at,
    a2a_success_at = excluded.a2a_success_at,
    mcp_success_at = excluded.mcp_success_at,
    x402_success_at = excluded.x402_success_at,
    access_last_success_at = excluded.access_last_success_at,
    search_document = excluded.search_document,
    updated_at = excluded.updated_at;

  get diagnostics v_refreshed = row_count;
  return v_refreshed;
end;
$function$;

revoke all on function public.refresh_agent_discovery_documents(uuid[])
  from public, anon, authenticated;
grant execute on function public.refresh_agent_discovery_documents(uuid[])
  to service_role;

comment on function public.refresh_agent_discovery_documents(uuid[]) is
  'Refreshes bounded, derived discovery documents from canonical agent evidence; null refreshes the complete catalogue for controlled migrations.';

-- Build the initial projection before adding its indexes and maintenance
-- triggers. This is a data derivation only; no source evidence is changed.
lock table
  public.agents,
  public.agent_services,
  public.agent_category_evidence,
  public.agent_health,
  public.agent_scores
in share mode;
select public.refresh_agent_discovery_documents(null);

create index agent_discovery_chain_recent_idx
  on public.agent_discovery_documents (
    chain_id,
    registered_block desc nulls last,
    agent_db_id
  );
create index agent_discovery_chain_oldest_idx
  on public.agent_discovery_documents (
    chain_id,
    registered_block asc nulls last,
    agent_db_id
  );
create index agent_discovery_chain_name_idx
  on public.agent_discovery_documents (
    chain_id,
    normalized_name asc nulls last,
    agent_db_id
  );
create index agent_discovery_chain_name_desc_idx
  on public.agent_discovery_documents (
    chain_id,
    normalized_name desc nulls last,
    agent_db_id
  );
create index agent_discovery_chain_rating_idx
  on public.agent_discovery_documents (
    chain_id,
    display_rating desc,
    registered_block desc nulls last,
    agent_db_id
  );
create index agent_discovery_chain_sift_score_desc_idx
  on public.agent_discovery_documents (
    chain_id,
    sift_score desc nulls last,
    registered_block desc nulls last,
    agent_db_id
  );
create index agent_discovery_chain_sift_score_asc_idx
  on public.agent_discovery_documents (
    chain_id,
    sift_score asc nulls last,
    registered_block desc nulls last,
    agent_db_id
  );
create index agent_discovery_chain_services_idx
  on public.agent_discovery_documents (
    chain_id,
    service_count desc,
    registered_block desc nulls last,
    agent_db_id
  );
create index agent_discovery_chain_health_idx
  on public.agent_discovery_documents (
    chain_id,
    health_status,
    health_checked_at desc nulls last,
    agent_db_id
  );
create index agent_discovery_chain_profile_idx
  on public.agent_discovery_documents (
    chain_id,
    metadata_status,
    registered_block desc nulls last,
    agent_db_id
  );
create index agent_discovery_chain_access_idx
  on public.agent_discovery_documents (
    chain_id,
    access_last_success_at desc nulls last,
    registered_block desc nulls last,
    agent_db_id
  )
  where metadata_status = 'valid' and active is not false;
create index agent_discovery_categories_idx
  on public.agent_discovery_documents using gin (categories);
create index agent_discovery_search_idx
  on public.agent_discovery_documents using gin (search_document);

alter table public.agent_discovery_documents set (
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_analyze_threshold = 500
);
analyze public.agent_discovery_documents;

create or replace function public.refresh_discovery_document_from_agent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform public.refresh_agent_discovery_documents(array[new.id]);
  return null;
end;
$function$;

create or replace function public.refresh_discovery_document_from_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_new_agent_id uuid;
  v_old_agent_id uuid;
begin
  if tg_op <> 'DELETE' then
    v_new_agent_id := new.agent_db_id;
  end if;
  if tg_op <> 'INSERT' then
    v_old_agent_id := old.agent_db_id;
  end if;

  if v_new_agent_id is not null then
    perform public.refresh_agent_discovery_documents(array[v_new_agent_id]);
  end if;
  if v_old_agent_id is not null and v_old_agent_id is distinct from v_new_agent_id then
    perform public.refresh_agent_discovery_documents(array[v_old_agent_id]);
  end if;
  return null;
end;
$function$;

revoke all on function public.refresh_discovery_document_from_agent()
  from public, anon, authenticated;
revoke all on function public.refresh_discovery_document_from_evidence()
  from public, anon, authenticated;

create trigger refresh_discovery_after_agent_write
after insert or update of
  chain_id,
  agent_id,
  registry_address,
  metadata_status,
  active,
  registered_block,
  registered_at,
  name,
  description,
  last_synced_at,
  image_url,
  owner_address,
  x402_supported
on public.agents
for each row execute function public.refresh_discovery_document_from_agent();

create trigger refresh_discovery_after_service_write
after insert or update or delete on public.agent_services
for each row execute function public.refresh_discovery_document_from_evidence();

create trigger refresh_discovery_after_category_write
after insert or update or delete on public.agent_category_evidence
for each row execute function public.refresh_discovery_document_from_evidence();

create trigger refresh_discovery_after_health_write
after insert or update or delete on public.agent_health
for each row execute function public.refresh_discovery_document_from_evidence();

create trigger refresh_discovery_after_score_write
after insert or update or delete on public.agent_scores
for each row execute function public.refresh_discovery_document_from_evidence();

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
  with matching as not materialized (
    select
      document.*,
      case
        when v_search_query is null then 0::real
        else ts_rank_cd(document.search_document, v_search_query)::real
      end as search_relevance,
      case
        when document.erc8183_success_at >= now() - interval '24 hours' then 0
        when document.a2a_success_at >= now() - interval '24 hours' then 1
        when document.mcp_success_at >= now() - interval '24 hours' then 2
        when document.x402_success_at >= now() - interval '24 hours' then 3
        else null
      end as access_priority
    from public.agent_discovery_documents as document
    where document.chain_id = any(v_chain_ids)
      and (
        cardinality(v_metadata_statuses) = 0
        or document.metadata_status = any(v_metadata_statuses)
      )
      and (
        cardinality(v_categories) = 0
        or document.categories && v_categories
      )
      and (
        cardinality(v_health_statuses) = 0
        or document.health_status = any(v_health_statuses)
      )
      and (
        cardinality(v_score_bands) = 0
        or ('excellent' = any(v_score_bands) and document.display_rating >= 80)
        or ('good' = any(v_score_bands) and document.display_rating >= 60 and document.display_rating < 80)
        or ('fair' = any(v_score_bands) and document.display_rating >= 40 and document.display_rating < 60)
        or ('weak' = any(v_score_bands) and document.display_rating < 40)
      )
      and (
        v_registration_period is null
        or (
          document.registered_at is not null
          and case v_registration_period
            when 'day' then document.registered_at >= now() - interval '1 day'
            when 'week' then document.registered_at >= now() - interval '7 days'
            when 'month' then document.registered_at >= now() - interval '30 days'
            when 'older' then document.registered_at < now() - interval '30 days'
            else true
          end
        )
      )
      and (
        not v_ready_only
        or (
          document.metadata_status = 'valid'
          and document.active is not false
          and document.access_last_success_at >= now() - interval '24 hours'
        )
      )
      and (
        v_search_query is null
        or document.search_document @@ v_search_query
      )
  ),
  page_candidates as not materialized (
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
  page_keys as not materialized (
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
  inner join public.agents as agent on agent.id = page_keys.agent_db_id
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
language sql
stable
security invoker
set search_path = ''
as $function$
  select *
  from public.search_agents_advanced(
    p_search_terms,
    p_categories,
    p_metadata_statuses,
    p_sort,
    p_page,
    p_page_size,
    p_chain_ids,
    array[]::text[],
    array[]::text[],
    null,
    false
  );
$function$;

create or replace function public.search_agents_with_health(
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
language sql
stable
security invoker
set search_path = ''
as $function$
  select *
  from public.search_agents_advanced(
    p_search_terms,
    p_categories,
    p_metadata_statuses,
    p_sort,
    p_page,
    p_page_size,
    p_chain_ids,
    p_health_statuses,
    array[]::text[],
    null,
    false
  );
$function$;

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
language sql
stable
security invoker
set search_path = ''
as $function$
  select *
  from public.search_agents_advanced(
    p_search_terms,
    p_categories,
    p_metadata_statuses,
    p_sort,
    p_page,
    p_page_size,
    p_chain_ids,
    p_health_statuses,
    array[]::text[],
    null,
    true
  );
$function$;

revoke all on function public.search_agents_advanced(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) from public, anon, authenticated;
grant execute on function public.search_agents_advanced(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) to service_role;

revoke all on function public.search_agents(
  text[], text[], text[], text, integer, integer, bigint[]
) from public, anon, authenticated;
grant execute on function public.search_agents(
  text[], text[], text[], text, integer, integer, bigint[]
) to service_role;

revoke all on function public.search_agents_with_health(
  text[], text[], text[], text, integer, integer, bigint[], text[]
) from public, anon, authenticated;
grant execute on function public.search_agents_with_health(
  text[], text[], text[], text, integer, integer, bigint[], text[]
) to service_role;

revoke all on function public.search_ready_agents(
  text[], text[], text[], text, integer, integer, bigint[], text[]
) from public, anon, authenticated;
grant execute on function public.search_ready_agents(
  text[], text[], text[], text, integer, integer, bigint[], text[]
) to service_role;

comment on table public.agent_discovery_documents is
  'Derived, indexed discovery projection maintained from canonical Sift agent evidence.';
comment on function public.search_agents_advanced(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) is
  'Bounded discovery over incrementally maintained search, filter, and sort documents.';

commit;

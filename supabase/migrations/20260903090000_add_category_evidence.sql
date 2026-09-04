begin;

create table public.agent_category_evidence (
  agent_db_id uuid not null references public.agents(id) on delete cascade,
  category text not null,
  source text not null,
  rule_version text not null,
  confidence real not null,
  evidence jsonb not null default '{}'::jsonb,
  facts jsonb not null default '[]'::jsonb,
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (agent_db_id, category),
  constraint agent_category_evidence_category_check check (
    category in (
      'yield-optimisation',
      'grid-trading',
      'health-factor-monitoring',
      'liquidity-rebalancing'
    )
  ),
  constraint agent_category_evidence_source_check check (
    source in ('declared-metadata', 'deterministic-rule')
  ),
  constraint agent_category_evidence_rule_version_check check (
    length(trim(rule_version)) between 1 and 100
  ),
  constraint agent_category_evidence_confidence_check check (
    confidence >= 0 and confidence <= 1
  ),
  constraint agent_category_evidence_evidence_check check (
    jsonb_typeof(evidence) = 'object'
  ),
  constraint agent_category_evidence_facts_check check (
    jsonb_typeof(facts) = 'array'
  )
);

create table public.agent_category_shortlist (
  category text not null,
  shortlist_rank integer not null,
  agent_db_id uuid not null references public.agents(id) on delete cascade,
  selection_version text not null,
  rationale text not null,
  selected_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (category, shortlist_rank),
  unique (category, agent_db_id),
  constraint agent_category_shortlist_category_check check (
    category in (
      'yield-optimisation',
      'grid-trading',
      'health-factor-monitoring',
      'liquidity-rebalancing'
    )
  ),
  constraint agent_category_shortlist_rank_check check (
    shortlist_rank between 1 and 10
  ),
  constraint agent_category_shortlist_version_check check (
    length(trim(selection_version)) between 1 and 100
  ),
  constraint agent_category_shortlist_rationale_check check (
    length(trim(rationale)) between 1 and 500
  )
);

create table public.agent_external_evidence (
  agent_db_id uuid not null references public.agents(id) on delete cascade,
  provider text not null,
  availability text not null,
  source_reference text not null,
  observed_at timestamptz not null,
  expires_at timestamptz not null,
  normalized_evidence jsonb not null default '{}'::jsonb,
  raw_payload jsonb,
  conflict_fields text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (agent_db_id, provider),
  constraint agent_external_evidence_provider_check check (
    provider = '8004scan'
  ),
  constraint agent_external_evidence_availability_check check (
    availability in ('available', 'field-unavailable', 'conflict', 'unavailable')
  ),
  constraint agent_external_evidence_reference_check check (
    source_reference ~ '^https://8004scan\.io/agents/bsc/[0-9]+$'
  ),
  constraint agent_external_evidence_expiry_check check (
    expires_at > observed_at
  ),
  constraint agent_external_evidence_normalized_check check (
    jsonb_typeof(normalized_evidence) = 'object'
  ),
  constraint agent_external_evidence_raw_check check (
    raw_payload is null or jsonb_typeof(raw_payload) = 'object'
  )
);

create index agent_category_evidence_category_idx
  on public.agent_category_evidence (category, agent_db_id);
create index agent_category_shortlist_agent_idx
  on public.agent_category_shortlist (agent_db_id);
create index agent_external_evidence_expiry_idx
  on public.agent_external_evidence (provider, expires_at);
create index agents_chain_registered_block_idx
  on public.agents (chain_id, registered_block desc nulls last, id);
create index agents_chain_metadata_registered_block_idx
  on public.agents (
    chain_id,
    metadata_status,
    registered_block desc nulls last,
    id
  );
create index agents_chain_name_idx
  on public.agents (chain_id, lower(name), id)
  where name is not null;

create trigger agent_category_evidence_set_updated_at
before update on public.agent_category_evidence
for each row execute function public.set_updated_at();

create trigger agent_category_shortlist_set_updated_at
before update on public.agent_category_shortlist
for each row execute function public.set_updated_at();

create trigger agent_external_evidence_set_updated_at
before update on public.agent_external_evidence
for each row execute function public.set_updated_at();

alter table public.agent_category_evidence enable row level security;
alter table public.agent_category_shortlist enable row level security;
alter table public.agent_external_evidence enable row level security;

revoke all on table public.agent_category_evidence from anon, authenticated;
revoke all on table public.agent_category_shortlist from anon, authenticated;
revoke all on table public.agent_external_evidence from anon, authenticated;
grant all on table public.agent_category_evidence to service_role;
grant all on table public.agent_category_shortlist to service_role;
grant all on table public.agent_external_evidence to service_role;

create function public.replace_agent_category_evidence(
  p_agent_ids uuid[],
  p_records jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if cardinality(coalesce(p_agent_ids, array[]::uuid[])) > 500 then
    raise exception 'category evidence replacement exceeds agent limit';
  end if;

  if jsonb_typeof(coalesce(p_records, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_records, '[]'::jsonb)) > 2000 then
    raise exception 'category evidence replacement payload is invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_records, '[]'::jsonb)) as candidate(
      agent_db_id uuid
    )
    where not (candidate.agent_db_id = any(coalesce(p_agent_ids, array[]::uuid[])))
  ) then
    raise exception 'category evidence contains an agent outside the replacement set';
  end if;

  delete from public.agent_category_evidence
  where agent_db_id = any(coalesce(p_agent_ids, array[]::uuid[]));

  insert into public.agent_category_evidence (
    agent_db_id,
    category,
    confidence,
    evidence,
    facts,
    observed_at,
    rule_version,
    source
  )
  select
    record.agent_db_id,
    record.category,
    record.confidence,
    record.evidence,
    record.facts,
    record.observed_at,
    record.rule_version,
    record.source
  from jsonb_to_recordset(coalesce(p_records, '[]'::jsonb)) as record(
    agent_db_id uuid,
    category text,
    confidence real,
    evidence jsonb,
    facts jsonb,
    observed_at timestamptz,
    rule_version text,
    source text
  );
end;
$$;

create function public.replace_agent_category_shortlist(p_records jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(coalesce(p_records, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_records, '[]'::jsonb)) > 40 then
    raise exception 'category shortlist replacement payload is invalid';
  end if;

  delete from public.agent_category_shortlist;

  insert into public.agent_category_shortlist (
    agent_db_id,
    category,
    rationale,
    selected_at,
    selection_version,
    shortlist_rank
  )
  select
    record.agent_db_id,
    record.category,
    record.rationale,
    record.selected_at,
    record.selection_version,
    record.shortlist_rank
  from jsonb_to_recordset(coalesce(p_records, '[]'::jsonb)) as record(
    agent_db_id uuid,
    category text,
    rationale text,
    selected_at timestamptz,
    selection_version text,
    shortlist_rank integer
  );
end;
$$;

create function public.category_classification_candidates(
  p_chain_id bigint default 56,
  p_after uuid default null,
  p_limit integer default 250
)
returns table (
  agent_db_id uuid,
  agent_id text,
  declared_category text,
  name text,
  description text,
  source_observed_at timestamptz,
  services jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    a.id,
    a.agent_id,
    a.category,
    a.name,
    a.description,
    coalesce(a.metadata_verified_at, a.last_synced_at, a.updated_at),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'endpoint', svc.endpoint,
            'metadata', svc.metadata,
            'serviceType', svc.service_type,
            'version', svc.version
          )
          order by svc.created_at, svc.id
        )
        from public.agent_services as svc
        where svc.agent_db_id = a.id
      ),
      '[]'::jsonb
    )
  from public.agents as a
  where a.chain_id = case when p_chain_id in (56, 97) then p_chain_id else 56 end
    and a.metadata_status = 'valid'
    and (p_after is null or a.id > p_after)
  order by a.id
  limit least(greatest(coalesce(p_limit, 250), 1), 500);
$$;

drop function public.search_agents(text[], text[], text[], text, integer, integer, bigint[]);

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
language sql
stable
security invoker
set search_path = ''
as $$
  with
  request_input as (
    select
      greatest(1, least(coalesce(p_page, 1), 10000)) as requested_page,
      greatest(1, least(coalesce(p_page_size, 12), 36)) as page_size,
      case when p_sort in ('relevance', 'recent', 'oldest', 'name-asc')
        then p_sort else 'recent' end as sort_key,
      array(
        select distinct category
        from unnest(coalesce(p_categories, array[]::text[])) as category
        where category in (
          'yield-optimisation', 'grid-trading',
          'health-factor-monitoring', 'liquidity-rebalancing'
        )
        limit 4
      ) as categories,
      array(
        select distinct metadata_status
        from unnest(coalesce(p_metadata_statuses, array[]::text[])) as metadata_status
        where metadata_status in ('pending', 'valid', 'invalid', 'unavailable')
        limit 4
      ) as metadata_statuses,
      array(
        select distinct chain_id
        from unnest(coalesce(p_chain_ids, array[]::bigint[])) as chain_id
        where chain_id in (56, 97)
        order by chain_id
        limit 2
      ) as supplied_chain_ids
  ),
  request as (
    select
      requested_page,
      page_size,
      sort_key,
      categories,
      metadata_statuses,
      case when cardinality(supplied_chain_ids) = 0
        then array[56]::bigint[] else supplied_chain_ids end as chain_ids
    from request_input
  ),
  terms as materialized (
    select
      lower(trim(term)) as term,
      plainto_tsquery('simple'::regconfig, lower(trim(term))) as query
    from unnest(coalesce(p_search_terms, array[]::text[]))
      with ordinality as supplied(term, position)
    where length(trim(term)) between 2 and 64
    order by position
    limit 12
  ),
  text_matches as materialized (
    select a.id as agent_db_id
    from public.agents as a
    cross join request
    cross join terms
    where a.chain_id = any(request.chain_ids)
      and to_tsvector(
        'simple'::regconfig,
        coalesce(a.name, '') || ' ' || coalesce(a.description, '')
      ) @@ terms.query

    union

    select searchable_service.agent_db_id
    from public.agent_services as searchable_service
    inner join public.agents as a
      on a.id = searchable_service.agent_db_id
    cross join request
    cross join terms
    where a.chain_id = any(request.chain_ids)
      and to_tsvector(
        'simple'::regconfig,
        coalesce(searchable_service.service_type, '') || ' ' ||
        coalesce(searchable_service.endpoint, '') || ' ' ||
        coalesce(searchable_service.metadata::text, '')
      ) @@ terms.query
  ),
  category_matches as materialized (
    select distinct category_match.agent_db_id
    from public.agent_category_evidence as category_match
    cross join request
    where category_match.category = any(request.categories)
  ),
  filtered as (
    select
      a.id,
      a.chain_id,
      a.agent_id,
      a.registry_address,
      a.registered_block,
      lower(a.name) as normalized_name,
      case
        when exists (select 1 from terms) then coalesce((
          select sum(
            ts_rank_cd(
              to_tsvector('simple'::regconfig, concat_ws(' ', a.name, a.description)),
              terms.query
            )
          )
          from terms
        ), 0)::real
        else 0::real
      end as search_relevance
    from public.agents as a
    cross join request
    where a.chain_id = any(request.chain_ids)
      and (
        cardinality(request.categories) = 0
        or exists (
          select 1
          from category_matches
          where category_matches.agent_db_id = a.id
        )
      )
      and (
        cardinality(request.metadata_statuses) = 0
        or a.metadata_status = any(request.metadata_statuses)
      )
      and (
        not exists (select 1 from terms)
        or exists (
          select 1
          from text_matches
          where text_matches.agent_db_id = a.id
        )
      )
  ),
  page_candidates as materialized (
    select filtered.*
    from filtered
    cross join request
    order by
      case when request.sort_key = 'relevance' then filtered.search_relevance end desc,
      case when request.sort_key = 'name-asc' then filtered.normalized_name end asc nulls last,
      case when request.sort_key = 'oldest' then filtered.registered_block end asc nulls last,
      case when request.sort_key in ('recent', 'relevance')
        then filtered.registered_block end desc nulls last,
      filtered.chain_id,
      filtered.registry_address,
      length(filtered.agent_id),
      filtered.agent_id
    limit (select page_size + 1 from request)
    offset (select (requested_page - 1) * page_size from request)
  ),
  page_state as (
    select count(*) > request.page_size as has_more
    from page_candidates
    cross join request
    group by request.page_size
  ),
  page_keys as (
    select page_candidates.*
    from page_candidates
    cross join request
    order by
      case when request.sort_key = 'relevance' then page_candidates.search_relevance end desc,
      case when request.sort_key = 'name-asc' then page_candidates.normalized_name end asc nulls last,
      case when request.sort_key = 'oldest' then page_candidates.registered_block end asc nulls last,
      case when request.sort_key in ('recent', 'relevance')
        then page_candidates.registered_block end desc nulls last,
      page_candidates.chain_id,
      page_candidates.registry_address,
      length(page_candidates.agent_id),
      page_candidates.agent_id
    limit (select page_size from request)
  ),
  page_rows as (
    select
      a.*,
      page_keys.search_relevance
    from page_keys
    inner join public.agents as a on a.id = page_keys.id
  )
  select
    p.id,
    p.chain_id,
    p.agent_id,
    p.registry_address,
    p.owner_address,
    p.name,
    p.description,
    p.image_url,
    coalesce(categories.resolved_categories, array[]::text[]),
    categories.primary_source,
    coalesce(categories.category_evidence, '[]'::jsonb),
    p.active,
    p.x402_supported,
    p.metadata_status,
    p.registered_block,
    p.registered_at,
    p.last_synced_at,
    coalesce(services.service_list, '[]'::jsonb),
    p.search_relevance,
    page_state.has_more,
    request.requested_page
  from page_rows as p
  cross join request
  cross join page_state
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
        )
        order by e.category
      ) as category_evidence
    from public.agent_category_evidence as e
    where e.agent_db_id = p.id
  ) as categories on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object('serviceType', svc.service_type, 'version', svc.version)
      order by svc.created_at, svc.id
    ) as service_list
    from public.agent_services as svc
    where svc.agent_db_id = p.id
  ) as services on true
  order by
    case when request.sort_key = 'relevance' then p.search_relevance end desc,
    case when request.sort_key = 'name-asc' then lower(p.name) end asc nulls last,
    case when request.sort_key = 'oldest' then p.registered_block end asc nulls last,
    case when request.sort_key in ('recent', 'relevance')
      then p.registered_block end desc nulls last,
    p.chain_id,
    p.registry_address,
    length(p.agent_id),
    p.agent_id;
$$;

create function public.category_coverage_report(p_chain_id bigint default 56)
returns table (
  category text,
  inventory bigint,
  valid_metadata bigint,
  with_services bigint,
  with_health bigint,
  with_reputation bigint,
  with_score bigint,
  with_image bigint,
  with_endpoint bigint,
  activation_available bigint,
  shortlist_count bigint,
  external_cross_checks bigint,
  latest_observed_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with categories(category) as (
    values
      ('yield-optimisation'),
      ('grid-trading'),
      ('health-factor-monitoring'),
      ('liquidity-rebalancing')
  )
  select
    categories.category,
    count(distinct agent.id),
    count(distinct evidence.agent_db_id) filter (where agent.metadata_status = 'valid'),
    count(distinct evidence.agent_db_id) filter (
      where agent.id is not null
        and exists (select 1 from public.agent_services s where s.agent_db_id = evidence.agent_db_id)
    ),
    count(distinct evidence.agent_db_id) filter (where health.agent_db_id is not null),
    count(distinct evidence.agent_db_id) filter (where reputation.agent_db_id is not null),
    count(distinct evidence.agent_db_id) filter (where score.agent_db_id is not null),
    count(distinct evidence.agent_db_id) filter (where agent.image_url is not null),
    count(distinct evidence.agent_db_id) filter (
      where agent.id is not null and exists (
        select 1 from public.agent_services s
        where s.agent_db_id = evidence.agent_db_id and s.endpoint is not null
      )
    ),
    0::bigint,
    count(distinct shortlist.agent_db_id) filter (
      where agent.metadata_status = 'valid'
        and agent.description is not null
        and exists (
          select 1 from public.agent_services s
          where s.agent_db_id = shortlist.agent_db_id
            and s.endpoint ~* '^https://'
        )
    ),
    count(distinct external.agent_db_id) filter (
      where shortlist.agent_db_id is not null
        and external.expires_at > now()
    ),
    max(evidence.observed_at) filter (where agent.id is not null)
  from categories
  left join public.agent_category_evidence evidence
    on evidence.category = categories.category
  left join public.agents agent
    on agent.id = evidence.agent_db_id
    and agent.chain_id = case when p_chain_id in (56, 97) then p_chain_id else 56 end
  left join public.agent_health health on health.agent_db_id = agent.id
  left join public.agent_reputation reputation on reputation.agent_db_id = agent.id
  left join public.agent_scores score on score.agent_db_id = agent.id
  left join public.agent_category_shortlist shortlist
    on shortlist.agent_db_id = agent.id and shortlist.category = categories.category
  left join public.agent_external_evidence external
    on external.agent_db_id = agent.id and external.provider = '8004scan'
  group by categories.category
  order by array_position(
    array[
      'yield-optimisation', 'grid-trading',
      'health-factor-monitoring', 'liquidity-rebalancing'
    ],
    categories.category
  );
$$;

create or replace function public.health_check_candidates(
  p_limit integer default 20,
  p_stale_before timestamptz default now()
)
returns table (agent_db_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select a.id
  from public.agents as a
  left join public.agent_health as h on h.agent_db_id = a.id
  left join public.agent_scores as sc on sc.agent_db_id = a.id
  where a.metadata_status = 'valid'
    and (h.last_checked_at is null or h.last_checked_at <= p_stale_before)
    and exists (
      select 1
      from public.agent_services as svc
      where svc.agent_db_id = a.id
        and svc.endpoint is not null
        and svc.endpoint ~* '^https://'
        and position('?' in svc.endpoint) = 0
        and (
          lower(trim(svc.service_type)) = 'health'
          or (
            lower(trim(svc.service_type)) = 'a2a'
            and split_part(svc.endpoint, '#', 1) ~* '/\.well-known/agent-card\.json/?$'
          )
        )
    )
  order by
    exists (
      select 1 from public.agent_category_shortlist shortlist
      where shortlist.agent_db_id = a.id
    ) desc,
    h.last_checked_at asc nulls first,
    (sc.sift_score is not null) desc,
    sc.sift_score desc nulls last,
    a.registered_at desc nulls last,
    a.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke execute on function public.category_classification_candidates(bigint, uuid, integer)
from public, anon, authenticated;
revoke execute on function public.replace_agent_category_evidence(uuid[], jsonb)
from public, anon, authenticated;
revoke execute on function public.replace_agent_category_shortlist(jsonb)
from public, anon, authenticated;
revoke execute on function public.category_coverage_report(bigint)
from public, anon, authenticated;
revoke execute on function public.search_agents(text[], text[], text[], text, integer, integer, bigint[])
from public, anon, authenticated;

grant execute on function public.category_classification_candidates(bigint, uuid, integer)
to service_role;
grant execute on function public.replace_agent_category_evidence(uuid[], jsonb)
to service_role;
grant execute on function public.replace_agent_category_shortlist(jsonb)
to service_role;
grant execute on function public.category_coverage_report(bigint)
to service_role;
grant execute on function public.search_agents(text[], text[], text[], text, integer, integer, bigint[])
to service_role;

comment on table public.agent_category_evidence is
  'Versioned declared or lower-confidence deterministic category evidence derived only from validated indexed metadata.';
comment on table public.agent_category_shortlist is
  'Small source-backed M14 shortlist. Membership is validated by the curation script and is not a performance ranking.';
comment on table public.agent_external_evidence is
  'Bounded server-side 8004scan cross-check cache. Core discovery never depends on this table.';
comment on function public.replace_agent_category_evidence(uuid[], jsonb) is
  'Atomic bounded replacement for category evidence derived from validated metadata.';
comment on function public.replace_agent_category_shortlist(jsonb) is
  'Atomic bounded replacement for the source-validated four-category shortlist.';
comment on function public.category_coverage_report(bigint) is
  'Timestamp-ready aggregate coverage counts for the four required Sift categories. Mainnet activation remains unavailable by policy.';

commit;

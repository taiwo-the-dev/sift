-- Keep the complete ERC-8004 catalogue inside the Supabase free-tier budget.
-- Canonical evidence remains in its source tables. Discovery stores only the
-- small fields needed to choose one bounded page of agent IDs.

begin;

set local lock_timeout = '10s';
set local statement_timeout = '15min';

drop trigger if exists refresh_discovery_after_agent_write
  on public.agents;
drop trigger if exists refresh_discovery_after_service_write
  on public.agent_services;
drop trigger if exists refresh_discovery_after_category_write
  on public.agent_category_evidence;
drop trigger if exists refresh_discovery_after_health_write
  on public.agent_health;
drop trigger if exists refresh_discovery_after_score_write
  on public.agent_scores;

-- The application now uses one ID-only search boundary. Remove the retired
-- full-row search functions before replacing their projection.
do $migration$
declare
  v_function record;
begin
  for v_function in
    select proc.oid::regprocedure as signature
    from pg_catalog.pg_proc as proc
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = proc.pronamespace
    where namespace.nspname = 'public'
      and proc.proname in (
        'search_agent_discovery_keys',
        'search_agent_rating_keys',
        'search_agents',
        'search_agents_advanced',
        'search_agents_general',
        'search_agents_with_health',
        'search_ready_agents'
      )
  loop
    execute format('drop function %s cascade', v_function.signature);
  end loop;
end;
$migration$;

drop table if exists public.agent_discovery_documents cascade;

-- These indexes duplicate the compact discovery projection or index large raw
-- text. The canonical identity and foreign-key indexes are retained.
drop index if exists public.agents_search_idx;
drop index if exists public.agent_services_search_idx;
drop index if exists public.agents_category_idx;
drop index if exists public.agents_registered_at_idx;
drop index if exists public.agents_metadata_status_idx;
drop index if exists public.agents_registry_address_idx;
drop index if exists public.agents_chain_registered_block_idx;
drop index if exists public.agents_chain_metadata_registered_block_idx;
drop index if exists public.agents_chain_name_idx;
drop index if exists public.agent_services_type_idx;

create table public.agent_discovery_documents (
  agent_db_id uuid primary key references public.agents(id) on delete cascade,
  chain_id bigint not null check (chain_id in (56, 97)),
  metadata_status text not null check (
    metadata_status in ('pending', 'valid', 'invalid', 'unavailable')
  ),
  active boolean,
  registered_block bigint,
  registered_at timestamptz,
  normalized_name text not null,
  categories text[] not null default array[]::text[],
  health_status text not null default 'unknown' check (
    health_status in ('online', 'degraded', 'offline', 'unknown')
  ),
  health_checked_at timestamptz,
  sift_score numeric(5, 2) not null default 0 check (
    sift_score between 0 and 100
  ),
  service_count integer not null default 0 check (service_count >= 0),
  access_last_success_at timestamptz,
  search_document tsvector not null,
  updated_at timestamptz not null default now()
);

alter table public.agent_discovery_documents enable row level security;
revoke all on table public.agent_discovery_documents
  from public, anon, authenticated;
grant select, insert, update, delete on table public.agent_discovery_documents
  to service_role;

create or replace function public.discovery_sift_score(
  p_agent public.agents,
  p_health public.agent_health,
  p_reputation public.agent_reputation,
  p_score public.agent_scores,
  p_service_count bigint,
  p_unique_service_types bigint,
  p_has_endpoint boolean,
  p_has_version boolean,
  p_has_structured_metadata boolean
)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $function$
  select round(
    least(
      100::numeric,
      greatest(
        0::numeric,
        case
          when (p_score).score_version in (
            'sift-evidence-v2.1.0',
            'sift-evidence-v2.2.0'
          ) then
            coalesce((p_score).reputation_component, 0) * 0.15
            + coalesce((p_score).reliability_component, 0) * 0.25
            + coalesce((p_score).availability_component, 0) * 0.20
            + coalesce((p_score).capability_component, 0) * 0.10
            + coalesce((p_score).track_record_component, 0) * 0.20
            + coalesce((p_score).metadata_component, 0) * 0.10
          else
            -- Missing evidence earns zero. This is the same six-criterion,
            -- direct-points model used by Sift Score v2.2.
            case
              when (p_reputation).source is not null
                and (p_reputation).source_observed_at between
                  now() - interval '180 days' and now()
                and (p_reputation).reputation_score between 0 and 100
              then (p_reputation).reputation_score * 0.15
              else 0
            end
            + case
              when (p_health).last_checked_at between
                  now() - interval '24 hours' and now()
                and (p_health).check_count >= 3
              then (
                (p_health).success_count::numeric
                / nullif((p_health).check_count, 0)
              ) * 25
              else 0
            end
            + case
              when (p_health).last_checked_at between
                  now() - interval '24 hours' and now()
              then case (p_health).status
                when 'online' then 20
                when 'degraded' then 8
                when 'offline' then 0
                else 0
              end
              else 0
            end
            + case
              when (p_agent).metadata_status = 'valid'
                and coalesce(
                  (p_agent).metadata_verified_at,
                  (p_agent).last_synced_at
                ) between now() - interval '30 days' and now()
                and coalesce(p_service_count, 0) > 0
              then least(
                100,
                40
                + case when coalesce(p_unique_service_types, 0) >= 2 then 20 else 0 end
                + case when coalesce(p_unique_service_types, 0) >= 3 then 10 else 0 end
                + case when coalesce(p_has_endpoint, false) then 15 else 0 end
                + case when coalesce(p_has_version, false) then 10 else 0 end
                + case when coalesce(p_has_structured_metadata, false) then 5 else 0 end
              ) * 0.10
              else 0
            end
            + case
              when (p_reputation).source is not null
                and (p_reputation).source_observed_at between
                  now() - interval '180 days' and now()
                and coalesce((p_reputation).successful_jobs, 0)
                  + coalesce((p_reputation).failed_jobs, 0) > 0
              then (
                coalesce((p_reputation).successful_jobs, 0)::numeric
                / (
                  coalesce((p_reputation).successful_jobs, 0)
                  + coalesce((p_reputation).failed_jobs, 0)
                )
              ) * 20
              else 0
            end
            + case
              when (p_agent).metadata_status = 'valid'
                and coalesce(
                  (p_agent).metadata_verified_at,
                  (p_agent).last_synced_at
                ) between now() - interval '30 days' and now()
              then (
                case when nullif(btrim((p_agent).name), '') is not null then 25 else 0 end
                + case when nullif(btrim((p_agent).description), '') is not null then 30 else 0 end
                + case when nullif(btrim((p_agent).image_url), '') is not null then 10 else 0 end
                + case when (p_agent).owner_address is not null then 10 else 0 end
                + case when (p_agent).active is not null then 5 else 0 end
                + case when (p_agent).x402_supported is not null then 5 else 0 end
                + case
                    when coalesce(
                      (p_agent).metadata_verified_at,
                      (p_agent).last_synced_at
                    ) is not null
                    then 15
                    else 0
                  end
              ) * 0.10
              else 0
            end
        end
      )
    ),
    2
  );
$function$;

revoke all on function public.discovery_sift_score(
  public.agents,
  public.agent_health,
  public.agent_reputation,
  public.agent_scores,
  bigint,
  bigint,
  boolean,
  boolean,
  boolean
) from public, anon, authenticated;
grant execute on function public.discovery_sift_score(
  public.agents,
  public.agent_health,
  public.agent_reputation,
  public.agent_scores,
  bigint,
  bigint,
  boolean,
  boolean,
  boolean
) to service_role;

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
      bool_or(service.metadata is not null)
        as has_structured_metadata,
      string_agg(left(btrim(service.service_type), 128), ' ')
        as search_text,
      max(service.availability_last_success_at) filter (
        where service.endpoint is not null
          and service.availability_status = 'available'
          and service.activation_method is not null
      ) as access_last_success_at
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
    metadata_status,
    active,
    registered_block,
    registered_at,
    normalized_name,
    categories,
    health_status,
    health_checked_at,
    sift_score,
    service_count,
    access_last_success_at,
    search_document,
    updated_at
  )
  select
    agent.id,
    agent.chain_id,
    agent.metadata_status,
    agent.active,
    agent.registered_block,
    agent.registered_at,
    lower(coalesce(nullif(btrim(agent.name), ''), agent.agent_id)),
    coalesce(category_stats.categories, array[]::text[]),
    coalesce(health.status, 'unknown'),
    health.last_checked_at,
    public.discovery_sift_score(
      agent,
      health,
      reputation,
      score,
      coalesce(service_stats.service_count, 0),
      coalesce(service_stats.unique_service_types, 0),
      coalesce(service_stats.has_endpoint, false),
      coalesce(service_stats.has_version, false),
      coalesce(service_stats.has_structured_metadata, false)
    ),
    coalesce(service_stats.service_count, 0),
    service_stats.access_last_success_at,
    to_tsvector(
      'simple'::regconfig,
      left(
        concat_ws(
          ' ',
          agent.agent_id,
          agent.name,
          left(agent.description, 4096),
          array_to_string(category_stats.categories, ' '),
          service_stats.search_text
        ),
        8192
      )
    ),
    now()
  from public.agents as agent
  left join public.agent_health as health
    on health.agent_db_id = agent.id
  left join public.agent_reputation as reputation
    on reputation.agent_db_id = agent.id
  left join public.agent_scores as score
    on score.agent_db_id = agent.id
  left join service_stats
    on service_stats.agent_db_id = agent.id
  left join category_stats
    on category_stats.agent_db_id = agent.id
  where p_agent_ids is null or agent.id = any(p_agent_ids)
  on conflict (agent_db_id) do update set
    chain_id = excluded.chain_id,
    metadata_status = excluded.metadata_status,
    active = excluded.active,
    registered_block = excluded.registered_block,
    registered_at = excluded.registered_at,
    normalized_name = excluded.normalized_name,
    categories = excluded.categories,
    health_status = excluded.health_status,
    health_checked_at = excluded.health_checked_at,
    sift_score = excluded.sift_score,
    service_count = excluded.service_count,
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

-- Populate before indexes so a migration from an existing database does not
-- need space for the old and new search indexes at the same time.
select public.refresh_agent_discovery_documents(null);

create index agent_discovery_recent_idx
  on public.agent_discovery_documents (
    chain_id,
    registered_block desc nulls last,
    agent_db_id
  );
create index agent_discovery_registered_at_idx
  on public.agent_discovery_documents (
    chain_id,
    registered_at desc nulls last,
    agent_db_id
  );
create index agent_discovery_name_idx
  on public.agent_discovery_documents (
    chain_id,
    normalized_name,
    agent_db_id
  );
create index agent_discovery_score_desc_idx
  on public.agent_discovery_documents (
    chain_id,
    sift_score desc,
    registered_block desc nulls last,
    agent_db_id
  );
create index agent_discovery_score_asc_idx
  on public.agent_discovery_documents (
    chain_id,
    sift_score asc,
    registered_block desc nulls last,
    agent_db_id
  );
create index agent_discovery_services_idx
  on public.agent_discovery_documents (
    chain_id,
    service_count desc,
    registered_block desc nulls last,
    agent_db_id
  );
create index agent_discovery_health_status_idx
  on public.agent_discovery_documents (
    chain_id,
    health_status,
    registered_block desc nulls last,
    agent_db_id
  );
create index agent_discovery_health_recent_idx
  on public.agent_discovery_documents (
    chain_id,
    health_checked_at desc nulls last,
    registered_block desc nulls last,
    agent_db_id
  );
create index agent_discovery_profile_idx
  on public.agent_discovery_documents (
    chain_id,
    metadata_status,
    registered_block desc nulls last,
    agent_db_id
  );
create index agent_discovery_access_idx
  on public.agent_discovery_documents (
    chain_id,
    access_last_success_at desc nulls last,
    registered_block desc nulls last,
    agent_db_id
  );
create index agent_discovery_categories_idx
  on public.agent_discovery_documents using gin (categories);
create index agent_discovery_search_idx
  on public.agent_discovery_documents using gin (search_document);

alter table public.agent_discovery_documents set (
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_analyze_threshold = 500
);

drop function if exists public.refresh_discovery_document_from_agent();
drop function if exists public.refresh_discovery_document_from_evidence();

create function public.refresh_discovery_from_agent_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_agent_ids uuid[];
begin
  select coalesce(array_agg(distinct changed.id), array[]::uuid[])
  into v_agent_ids
  from new_rows as changed;

  perform public.refresh_agent_discovery_documents(v_agent_ids);
  return null;
end;
$function$;

create function public.refresh_discovery_from_evidence_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_agent_ids uuid[];
begin
  if tg_op = 'INSERT' then
    select coalesce(array_agg(distinct changed.agent_db_id), array[]::uuid[])
    into v_agent_ids
    from new_rows as changed;
  elsif tg_op = 'DELETE' then
    select coalesce(array_agg(distinct changed.agent_db_id), array[]::uuid[])
    into v_agent_ids
    from old_rows as changed;
  else
    select coalesce(array_agg(distinct changed.agent_db_id), array[]::uuid[])
    into v_agent_ids
    from (
      select current_rows.agent_db_id from new_rows as current_rows
      union
      select previous_rows.agent_db_id from old_rows as previous_rows
    ) as changed;
  end if;

  perform public.refresh_agent_discovery_documents(v_agent_ids);
  return null;
end;
$function$;

revoke all on function public.refresh_discovery_from_agent_rows()
  from public, anon, authenticated;
revoke all on function public.refresh_discovery_from_evidence_rows()
  from public, anon, authenticated;

create trigger refresh_discovery_after_agent_insert
after insert on public.agents
referencing new table as new_rows
for each statement execute function public.refresh_discovery_from_agent_rows();
create trigger refresh_discovery_after_agent_update
after update on public.agents
referencing new table as new_rows
for each statement execute function public.refresh_discovery_from_agent_rows();

create trigger refresh_discovery_after_service_insert
after insert on public.agent_services
referencing new table as new_rows
for each statement execute function public.refresh_discovery_from_evidence_rows();
create trigger refresh_discovery_after_service_update
after update on public.agent_services
referencing old table as old_rows new table as new_rows
for each statement execute function public.refresh_discovery_from_evidence_rows();
create trigger refresh_discovery_after_service_delete
after delete on public.agent_services
referencing old table as old_rows
for each statement execute function public.refresh_discovery_from_evidence_rows();

create trigger refresh_discovery_after_category_insert
after insert on public.agent_category_evidence
referencing new table as new_rows
for each statement execute function public.refresh_discovery_from_evidence_rows();
create trigger refresh_discovery_after_category_update
after update on public.agent_category_evidence
referencing old table as old_rows new table as new_rows
for each statement execute function public.refresh_discovery_from_evidence_rows();
create trigger refresh_discovery_after_category_delete
after delete on public.agent_category_evidence
referencing old table as old_rows
for each statement execute function public.refresh_discovery_from_evidence_rows();

create trigger refresh_discovery_after_health_insert
after insert on public.agent_health
referencing new table as new_rows
for each statement execute function public.refresh_discovery_from_evidence_rows();
create trigger refresh_discovery_after_health_update
after update on public.agent_health
referencing old table as old_rows new table as new_rows
for each statement execute function public.refresh_discovery_from_evidence_rows();
create trigger refresh_discovery_after_health_delete
after delete on public.agent_health
referencing old table as old_rows
for each statement execute function public.refresh_discovery_from_evidence_rows();

create trigger refresh_discovery_after_reputation_insert
after insert on public.agent_reputation
referencing new table as new_rows
for each statement execute function public.refresh_discovery_from_evidence_rows();
create trigger refresh_discovery_after_reputation_update
after update on public.agent_reputation
referencing old table as old_rows new table as new_rows
for each statement execute function public.refresh_discovery_from_evidence_rows();
create trigger refresh_discovery_after_reputation_delete
after delete on public.agent_reputation
referencing old table as old_rows
for each statement execute function public.refresh_discovery_from_evidence_rows();

create trigger refresh_discovery_after_score_insert
after insert on public.agent_scores
referencing new table as new_rows
for each statement execute function public.refresh_discovery_from_evidence_rows();
create trigger refresh_discovery_after_score_update
after update on public.agent_scores
referencing old table as old_rows new table as new_rows
for each statement execute function public.refresh_discovery_from_evidence_rows();
create trigger refresh_discovery_after_score_delete
after delete on public.agent_scores
referencing old table as old_rows
for each statement execute function public.refresh_discovery_from_evidence_rows();

create function public.search_agent_discovery_keys(
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
  v_offset integer;
  v_order_candidate text;
  v_order_document text;
  v_page integer := greatest(1, least(coalesce(p_page, 1), 10000));
  v_page_size integer := greatest(1, least(coalesce(p_page_size, 12), 36));
  v_predicates text[] := array[]::text[];
  v_rating_predicates text[] := array[]::text[];
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
  v_sql text;
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
  elsif v_sort = 'relevance' then
    v_sort := 'recent';
  end if;

  if v_chain_ids = array[56]::bigint[] then
    v_predicates := array_append(v_predicates, 'document.chain_id = 56');
  elsif v_chain_ids = array[97]::bigint[] then
    v_predicates := array_append(v_predicates, 'document.chain_id = 97');
  else
    v_predicates := array_append(v_predicates, 'document.chain_id in (56, 97)');
  end if;

  if cardinality(v_metadata_statuses) > 0 then
    v_predicates := array_append(
      v_predicates,
      'document.metadata_status = any($2)'
    );
  end if;
  if cardinality(v_categories) > 0 then
    v_predicates := array_append(v_predicates, 'document.categories && $3');
  end if;
  if cardinality(v_health_statuses) > 0 then
    v_predicates := array_append(
      v_predicates,
      'document.health_status = any($4)'
    );
  end if;

  if cardinality(v_score_bands) > 0 then
    if 'excellent' = any(v_score_bands) then
      v_rating_predicates := array_append(
        v_rating_predicates,
        'document.sift_score >= 80'
      );
    end if;
    if 'good' = any(v_score_bands) then
      v_rating_predicates := array_append(
        v_rating_predicates,
        '(document.sift_score >= 60 and document.sift_score < 80)'
      );
    end if;
    if 'fair' = any(v_score_bands) then
      v_rating_predicates := array_append(
        v_rating_predicates,
        '(document.sift_score >= 40 and document.sift_score < 60)'
      );
    end if;
    if 'weak' = any(v_score_bands) then
      v_rating_predicates := array_append(
        v_rating_predicates,
        'document.sift_score < 40'
      );
    end if;
    v_predicates := array_append(
      v_predicates,
      '(' || array_to_string(v_rating_predicates, ' or ') || ')'
    );
  end if;

  if v_registration_period = 'day' then
    v_predicates := array_append(
      v_predicates,
      'document.registered_at >= now() - interval ''1 day'''
    );
  elsif v_registration_period = 'week' then
    v_predicates := array_append(
      v_predicates,
      'document.registered_at >= now() - interval ''7 days'''
    );
  elsif v_registration_period = 'month' then
    v_predicates := array_append(
      v_predicates,
      'document.registered_at >= now() - interval ''30 days'''
    );
  elsif v_registration_period = 'older' then
    v_predicates := array_append(
      v_predicates,
      'document.registered_at < now() - interval ''30 days'''
    );
  end if;

  if coalesce(p_ready_only, false) then
    v_predicates := array_append(
      v_predicates,
      'document.metadata_status = ''valid''
       and document.active is not false
       and document.access_last_success_at >= now() - interval ''24 hours'''
    );
  end if;
  if v_search_query is not null then
    v_predicates := array_append(
      v_predicates,
      'document.search_document @@ $5'
    );
  end if;

  v_order_document := case v_sort
    when 'relevance' then
      'ts_rank_cd(document.search_document, $5) desc nulls last,
       document.registered_block desc nulls last'
    when 'oldest' then
      'document.registered_block asc nulls last'
    when 'profile-first' then
      '(document.metadata_status = ''valid'') desc,
       document.registered_block desc nulls last'
    when 'name-asc' then
      'document.normalized_name asc'
    when 'name-desc' then
      'document.normalized_name desc'
    when 'score-desc' then
      'document.sift_score desc,
       document.registered_block desc nulls last'
    when 'score-asc' then
      'document.sift_score asc,
       document.registered_block desc nulls last'
    when 'available-first' then
      'document.access_last_success_at desc nulls last,
       document.registered_block desc nulls last'
    when 'health-recent' then
      'document.health_checked_at desc nulls last,
       document.registered_block desc nulls last'
    when 'services-desc' then
      'document.service_count desc,
       document.registered_block desc nulls last'
    else
      'document.registered_block desc nulls last'
  end;
  v_order_document := v_order_document || ', document.agent_db_id';
  v_order_candidate := replace(v_order_document, 'document.', 'candidate.');
  v_offset := (v_page - 1) * v_page_size;

  v_sql := format(
    $query$
      with candidates as materialized (
        select document.*
        from public.agent_discovery_documents as document
        where %s
        order by %s
        limit $6 + 1
        offset $7
      )
      select
        candidate.agent_db_id,
        (select count(*) from candidates) > $6 as has_more,
        $8::integer as result_page
      from candidates as candidate
      order by %s
      limit $6
    $query$,
    array_to_string(v_predicates, E'\n        and '),
    v_order_document,
    v_order_candidate
  );

  return query execute v_sql using
    v_chain_ids,
    v_metadata_statuses,
    v_categories,
    v_health_statuses,
    v_search_query,
    v_page_size,
    v_offset,
    v_page;
end;
$function$;

revoke all on function public.search_agent_discovery_keys(
  text[], text[], text[], text, integer, integer,
  bigint[], text[], text[], text, boolean
) from public, anon, authenticated;
grant execute on function public.search_agent_discovery_keys(
  text[], text[], text[], text, integer, integer,
  bigint[], text[], text[], text, boolean
) to service_role;

create function public.finalize_compact_catalogue_import()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_agent_count bigint;
  v_document_count bigint;
  v_service_count bigint;
begin
  perform public.refresh_agent_discovery_documents(null);

  select count(*) into v_agent_count from public.agents;
  select count(*) into v_document_count
    from public.agent_discovery_documents;
  select count(*) into v_service_count from public.agent_services;

  if v_agent_count <> v_document_count then
    raise exception
      'compact catalogue projection is incomplete: % agents, % documents',
      v_agent_count,
      v_document_count;
  end if;

  perform setval(
    pg_get_serial_sequence('public.job_activity', 'id'),
    greatest(coalesce((select max(id) from public.job_activity), 1), 1),
    exists(select 1 from public.job_activity)
  );

  analyze public.agents;
  analyze public.agent_services;
  analyze public.agent_discovery_documents;

  return jsonb_build_object(
    'agents', v_agent_count,
    'discoveryDocuments', v_document_count,
    'services', v_service_count
  );
end;
$function$;

revoke all on function public.finalize_compact_catalogue_import()
  from public, anon, authenticated;
grant execute on function public.finalize_compact_catalogue_import()
  to service_role;

create function public.compact_catalogue_storage_report()
returns table (
  relation_name text,
  total_bytes bigint,
  data_bytes bigint,
  index_bytes bigint
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    relation.relname::text,
    pg_total_relation_size(relation.oid),
    pg_relation_size(relation.oid),
    pg_indexes_size(relation.oid)
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind = 'r'
  order by pg_total_relation_size(relation.oid) desc;
$function$;

revoke all on function public.compact_catalogue_storage_report()
  from public, anon, authenticated;
grant execute on function public.compact_catalogue_storage_report()
  to service_role;

analyze public.agent_discovery_documents;

comment on table public.agent_discovery_documents is
  'Compact, derived, ID-only discovery projection. Canonical agent evidence remains in its source tables.';
comment on function public.search_agent_discovery_keys(
  text[], text[], text[], text, integer, integer,
  bigint[], text[], text[], text, boolean
) is
  'Returns one bounded, ordered page of canonical agent IDs for every discovery filter and sort.';
comment on function public.finalize_compact_catalogue_import() is
  'Rebuilds and validates the compact projection after an authorized catalogue transfer.';

commit;

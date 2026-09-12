-- Keep rating-band discovery bounded at full catalogue scale. The general
-- discovery function must support many optional predicates and sort modes,
-- which can prevent PostgreSQL from using the best projection index for a
-- concrete rating request. This function builds only allowlisted predicates
-- and ordering clauses, returns one page of canonical agent IDs, and leaves
-- full evidence loading to the application for that bounded page.

begin;

create or replace function public.search_agent_rating_keys(
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

  -- This is deliberately a rating-only boundary. Invalid or empty bands do
  -- not broaden into an unfiltered catalogue request.
  if cardinality(v_score_bands) = 0 then
    return;
  end if;

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

  v_predicates := array_append(
    v_predicates,
    'document.chain_id = any($1)'
  );

  if cardinality(v_metadata_statuses) > 0 then
    v_predicates := array_append(
      v_predicates,
      'document.metadata_status = any($2)'
    );
  end if;

  if cardinality(v_categories) > 0 then
    v_predicates := array_append(
      v_predicates,
      'document.categories && $3'
    );
  end if;

  if cardinality(v_health_statuses) > 0 then
    v_predicates := array_append(
      v_predicates,
      'document.health_status = any($4)'
    );
  end if;

  if 'excellent' = any(v_score_bands) then
    v_rating_predicates := array_append(
      v_rating_predicates,
      'document.display_rating >= 80'
    );
  end if;
  if 'good' = any(v_score_bands) then
    v_rating_predicates := array_append(
      v_rating_predicates,
      '(document.display_rating >= 60 and document.display_rating < 80)'
    );
  end if;
  if 'fair' = any(v_score_bands) then
    v_rating_predicates := array_append(
      v_rating_predicates,
      '(document.display_rating >= 40 and document.display_rating < 60)'
    );
  end if;
  if 'weak' = any(v_score_bands) then
    v_rating_predicates := array_append(
      v_rating_predicates,
      'document.display_rating < 40'
    );
  end if;
  v_predicates := array_append(
    v_predicates,
    '(' || array_to_string(v_rating_predicates, ' or ') || ')'
  );

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

  if v_ready_only then
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
      'document.normalized_name asc nulls last'
    when 'name-desc' then
      'document.normalized_name desc nulls last'
    when 'score-desc' then
      'document.sift_score desc nulls last,
       document.registered_block desc nulls last'
    when 'score-asc' then
      'document.sift_score asc nulls last,
       document.registered_block desc nulls last'
    when 'available-first' then
      'case
         when document.erc8183_success_at >= now() - interval ''24 hours'' then 0
         when document.a2a_success_at >= now() - interval ''24 hours'' then 1
         when document.mcp_success_at >= now() - interval ''24 hours'' then 2
         when document.x402_success_at >= now() - interval ''24 hours'' then 3
         else null
       end asc nulls last,
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

  v_order_document := v_order_document ||
    ', document.chain_id,
       document.registry_address,
       length(document.agent_id),
       document.agent_id';
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

revoke all on function public.search_agent_rating_keys(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) from public, anon, authenticated;
grant execute on function public.search_agent_rating_keys(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) to service_role;

comment on function public.search_agent_rating_keys(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) is
  'Returns one bounded, ordered page of canonical agent IDs for evidence-backed rating filters.';

commit;

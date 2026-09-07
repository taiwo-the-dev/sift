begin;

-- A coverage report must not present evidence created by an older taxonomy as
-- if it had been assessed by the current rules. Discovery can remain available
-- during the resumable reclassification, while release coverage stays honest.
create or replace function public.category_coverage_report(
  p_chain_id bigint default 56
)
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
    count(distinct evidence.agent_db_id) filter (
      where agent.metadata_status = 'valid'
    ),
    count(distinct evidence.agent_db_id) filter (
      where agent.id is not null
        and exists (
          select 1
          from public.agent_services as service
          where service.agent_db_id = evidence.agent_db_id
        )
    ),
    count(distinct evidence.agent_db_id) filter (
      where health.agent_db_id is not null
    ),
    count(distinct evidence.agent_db_id) filter (
      where reputation.agent_db_id is not null
    ),
    count(distinct evidence.agent_db_id) filter (
      where score.agent_db_id is not null
    ),
    count(distinct evidence.agent_db_id) filter (
      where agent.image_url is not null
    ),
    count(distinct evidence.agent_db_id) filter (
      where agent.id is not null
        and exists (
          select 1
          from public.agent_services as service
          where service.agent_db_id = evidence.agent_db_id
            and service.endpoint is not null
        )
    ),
    0::bigint,
    count(distinct shortlist.agent_db_id) filter (
      where agent.metadata_status = 'valid'
        and agent.description is not null
        and exists (
          select 1
          from public.agent_services as service
          where service.agent_db_id = shortlist.agent_db_id
            and service.endpoint ~* '^https://'
        )
    ),
    count(distinct external.agent_db_id) filter (
      where shortlist.agent_db_id is not null
        and external.expires_at > now()
    ),
    max(evidence.observed_at) filter (where agent.id is not null)
  from categories
  left join public.agent_category_evidence as evidence
    on evidence.category = categories.category
    and evidence.rule_version = 'sift-category-taxonomy-v1.1.0'
  left join public.agents as agent
    on agent.id = evidence.agent_db_id
    and agent.chain_id = case
      when p_chain_id in (56, 97) then p_chain_id
      else 56
    end
  left join public.agent_health as health on health.agent_db_id = agent.id
  left join public.agent_reputation as reputation
    on reputation.agent_db_id = agent.id
  left join public.agent_scores as score on score.agent_db_id = agent.id
  left join public.agent_category_shortlist as shortlist
    on shortlist.agent_db_id = agent.id
    and shortlist.category = categories.category
  left join public.agent_external_evidence as external
    on external.agent_db_id = agent.id
    and external.provider = '8004scan'
  group by categories.category
  order by array_position(
    array[
      'yield-optimisation',
      'grid-trading',
      'health-factor-monitoring',
      'liquidity-rebalancing'
    ],
    categories.category
  );
$$;

comment on function public.category_coverage_report(bigint) is
  'Server-only release coverage for evidence assessed by Sift category taxonomy v1.1.0.';

commit;

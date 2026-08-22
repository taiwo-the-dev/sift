begin;

alter table public.agent_health
add column service_type text,
add column checked_endpoint text,
add column endpoint_hash text,
add column outcome text,
add column check_count bigint not null default 0,
add column success_count bigint not null default 0,
add constraint agent_health_checked_endpoint_check check (
  checked_endpoint is null
  or (
    length(checked_endpoint) <= 2048
    and checked_endpoint ~ '^https://'
  )
),
add constraint agent_health_endpoint_hash_check check (
  endpoint_hash is null or endpoint_hash ~ '^[0-9a-f]{64}$'
),
add constraint agent_health_outcome_check check (
  outcome is null
  or outcome in (
    'success',
    'http-client-error',
    'http-server-error',
    'invalid-response',
    'response-too-large',
    'timeout',
    'network-error',
    'dns-error',
    'redirect-error',
    'invalid-endpoint',
    'unsafe-endpoint',
    'unsupported-service',
    'no-endpoint'
  )
),
add constraint agent_health_check_counts_check check (
  check_count >= 0
  and check_count <= 1000
  and success_count >= 0
  and success_count <= check_count
);

alter table public.agent_scores
alter column sift_score drop not null,
add column evidence_snapshot jsonb not null default '{}'::jsonb,
add column source_freshness jsonb not null default '{}'::jsonb,
add constraint agent_scores_evidence_snapshot_check check (
  jsonb_typeof(evidence_snapshot) = 'object'
),
add constraint agent_scores_source_freshness_check check (
  jsonb_typeof(source_freshness) = 'object'
);

alter table public.agent_reputation
add column source text,
add column source_observed_at timestamptz,
add constraint agent_reputation_source_check check (
  source is null or length(trim(source)) between 1 and 200
),
add constraint agent_reputation_score_range_check check (
  reputation_score is null or reputation_score between 0 and 100
),
add constraint agent_reputation_source_pair_check check (
  (source is null and source_observed_at is null)
  or (source is not null and source_observed_at is not null)
);

create function public.health_check_candidates(
  p_limit integer default 20,
  p_stale_before timestamptz default now()
)
returns table (agent_db_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select a.id as agent_db_id
  from public.agents as a
  left join public.agent_health as h on h.agent_db_id = a.id
  left join public.agent_scores as sc on sc.agent_db_id = a.id
  where a.metadata_status = 'valid'
    and (
      h.last_checked_at is null
      or h.last_checked_at <= p_stale_before
    )
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
            and split_part(svc.endpoint, '#', 1)
              ~* '/\.well-known/agent-card\.json/?$'
          )
        )
    )
  order by
    h.last_checked_at asc nulls first,
    (sc.sift_score is not null) desc,
    sc.sift_score desc nulls last,
    a.registered_at desc nulls last,
    a.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

create function public.score_recalculation_candidates(
  p_limit integer default 200,
  p_score_version text default 'sift-evidence-v1.0.0'
)
returns table (agent_db_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select a.id as agent_db_id
  from public.agents as a
  left join public.agent_health as h on h.agent_db_id = a.id
  left join public.agent_reputation as r on r.agent_db_id = a.id
  left join public.agent_scores as sc on sc.agent_db_id = a.id
  left join lateral (
    select max(svc.updated_at) as services_updated_at
    from public.agent_services as svc
    where svc.agent_db_id = a.id
  ) as service_update on true
  where sc.agent_db_id is null
    or sc.score_version <> p_score_version
    or (
      h.last_checked_at <= now() - interval '24 hours'
      and (
        sc.availability_component is not null
        or sc.reliability_component is not null
      )
    )
    or (
      a.metadata_verified_at <= now() - interval '30 days'
      and (
        sc.capability_component is not null
        or sc.metadata_component is not null
      )
    )
    or (
      r.source_observed_at <= now() - interval '180 days'
      and (
        sc.reputation_component is not null
        or sc.track_record_component is not null
      )
    )
    or greatest(
      a.updated_at,
      coalesce(h.updated_at, '-infinity'::timestamptz),
      coalesce(r.updated_at, '-infinity'::timestamptz),
      coalesce(service_update.services_updated_at, '-infinity'::timestamptz)
    ) > sc.calculated_at
  order by
    (sc.agent_db_id is null) desc,
    greatest(
      a.updated_at,
      coalesce(h.updated_at, '-infinity'::timestamptz),
      coalesce(r.updated_at, '-infinity'::timestamptz),
      coalesce(service_update.services_updated_at, '-infinity'::timestamptz)
    ) desc,
    a.id
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
$$;

create function public.featured_agent_candidates(
  p_limit integer default 3,
  p_score_version text default 'sift-evidence-v1.0.0',
  p_fresh_after timestamptz default now() - interval '24 hours'
)
returns table (agent_db_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select sc.agent_db_id
  from public.agent_scores as sc
  inner join public.agent_health as h on h.agent_db_id = sc.agent_db_id
  where sc.score_version = p_score_version
    and sc.sift_score is not null
    and sc.confidence >= 0.6
    and sc.calculated_at >= p_fresh_after
    and h.status = 'online'
    and h.outcome = 'success'
    and h.last_checked_at >= p_fresh_after
  order by sc.sift_score desc, sc.confidence desc, sc.agent_db_id
  limit least(greatest(coalesce(p_limit, 3), 1), 5);
$$;

revoke execute on function public.health_check_candidates(integer, timestamptz)
from public, anon, authenticated;
revoke execute on function public.score_recalculation_candidates(integer, text)
from public, anon, authenticated;
revoke execute on function public.featured_agent_candidates(
  integer,
  text,
  timestamptz
)
from public, anon, authenticated;

grant execute on function public.health_check_candidates(integer, timestamptz)
to service_role;
grant execute on function public.score_recalculation_candidates(integer, text)
to service_role;
grant execute on function public.featured_agent_candidates(
  integer,
  text,
  timestamptz
)
to service_role;

comment on column public.agent_health.outcome is
  'Latest bounded check outcome; unsupported or unsafe declarations remain unknown and are never probed.';
comment on column public.agent_health.endpoint_hash is
  'SHA-256 fingerprint of the declared endpoint used to reset endpoint-specific history without storing URL secrets.';
comment on column public.agent_health.check_count is
  'Bounded logical probe count for the current endpoint fingerprint.';
comment on column public.agent_health.success_count is
  'Bounded successful probe count for the current endpoint fingerprint.';
comment on column public.agent_scores.evidence_snapshot is
  'Normalized real inputs required to reproduce the versioned score assessment.';
comment on column public.agent_scores.source_freshness is
  'Timestamps for the sources used by the score assessment.';
comment on column public.agent_reputation.source is
  'Explicit provenance for normalized 0-100 reputation or supported job evidence; absent provenance is excluded from Sift Score.';
comment on column public.agent_reputation.source_observed_at is
  'Time the named reputation source was observed, distinct from the database row update time.';
comment on function public.health_check_candidates(integer, timestamptz) is
  'Bounded server-only health queue prioritizing scored and recently registered agents with potentially checkable declarations.';
comment on function public.score_recalculation_candidates(integer, text) is
  'Bounded server-only queue of agents whose real score inputs changed or use an older formula version.';
comment on function public.featured_agent_candidates(integer, text, timestamptz) is
  'Exact unpaid Featured rule requiring a current versioned score, confidence, and successful fresh health observation.';

commit;

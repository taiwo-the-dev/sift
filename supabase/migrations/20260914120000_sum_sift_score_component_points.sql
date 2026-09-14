-- Sift Score v2.1 is the direct sum of the six earned component-point values.
-- Retired v2.0 assessments stay in the canonical table until real evidence
-- makes them eligible for recalculation, but discovery exposes only v2.1.

begin;

create or replace function public.enforce_current_discovery_sift_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_current_score numeric(5, 2);
begin
  select score.sift_score
  into v_current_score
  from public.agent_scores as score
  where score.agent_db_id = new.agent_db_id
    and score.score_version = 'sift-evidence-v2.1.0';

  new.sift_score := v_current_score;
  return new;
end;
$function$;

revoke all on function public.enforce_current_discovery_sift_score()
  from public, anon, authenticated;

-- Clear retired projected values without deleting their canonical evidence.
update public.agent_discovery_documents as document
set sift_score = null
where document.sift_score is not null
  and not exists (
    select 1
    from public.agent_scores as score
    where score.agent_db_id = document.agent_db_id
      and score.score_version = 'sift-evidence-v2.1.0'
      and score.sift_score is not null
  );

update public.agent_discovery_documents as document
set sift_score = score.sift_score
from public.agent_scores as score
where score.agent_db_id = document.agent_db_id
  and score.score_version = 'sift-evidence-v2.1.0'
  and score.sift_score is not null
  and document.sift_score is distinct from score.sift_score;

analyze public.agent_discovery_documents;

comment on function public.enforce_current_discovery_sift_score() is
  'Exposes only direct-sum Sift Score v2.1 assessments through discovery.';

commit;

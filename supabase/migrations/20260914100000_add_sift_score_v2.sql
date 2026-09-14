-- Sift Score v2 publishes only current, evidence-backed assessments. Existing
-- v1 rows remain in the canonical score table for auditability, but they must
-- not be exposed through the discovery projection as current Sift Scores.

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
    and score.score_version = 'sift-evidence-v2.0.0';

  new.sift_score := v_current_score;
  return new;
end;
$function$;

revoke all on function public.enforce_current_discovery_sift_score()
  from public, anon, authenticated;

drop trigger if exists enforce_current_discovery_sift_score
  on public.agent_discovery_documents;
create trigger enforce_current_discovery_sift_score
before insert or update of agent_db_id, sift_score
on public.agent_discovery_documents
for each row execute function public.enforce_current_discovery_sift_score();

-- Remove retired formula values from the derived search document. Canonical
-- v1 assessments are intentionally retained in agent_scores.
update public.agent_discovery_documents as document
set sift_score = null
where document.sift_score is not null
  and not exists (
    select 1
    from public.agent_scores as score
    where score.agent_db_id = document.agent_db_id
      and score.score_version = 'sift-evidence-v2.0.0'
      and score.sift_score is not null
  );

update public.agent_discovery_documents as document
set sift_score = score.sift_score
from public.agent_scores as score
where score.agent_db_id = document.agent_db_id
  and score.score_version = 'sift-evidence-v2.0.0'
  and score.sift_score is not null
  and document.sift_score is distinct from score.sift_score;

-- Keep rating filters and sorts honest: they now operate on publishable Sift
-- Scores only, never the profile-completeness display projection.
do $migration$
declare
  v_arguments text;
  v_function record;
  v_result text;
  v_source text;
  v_updated_source text;
begin
  for v_function in
    select proc.oid, proc.proname
    from pg_catalog.pg_proc as proc
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = proc.pronamespace
    where namespace.nspname = 'public'
      and proc.oid in (
        to_regprocedure(
          'public.search_agents_advanced(text[],text[],text[],text,integer,integer,bigint[],text[],text[],text,boolean)'
        ),
        to_regprocedure(
          'public.search_agent_rating_keys(text[],text[],text[],text,integer,integer,bigint[],text[],text[],text,boolean)'
        ),
        to_regprocedure(
          'public.search_agent_discovery_keys(text[],text[],text[],text,integer,integer,bigint[],text[],text[],text,boolean)'
        )
      )
  loop
    select proc.prosrc,
      pg_catalog.pg_get_function_arguments(proc.oid),
      pg_catalog.pg_get_function_result(proc.oid)
    into v_source, v_arguments, v_result
    from pg_catalog.pg_proc as proc
    where proc.oid = v_function.oid;

    if position('document.display_rating' in v_source) = 0 then
      raise exception '% no longer matches the reviewed rating-filter shape',
        v_function.proname;
    end if;

    v_updated_source := replace(
      v_source,
      'document.display_rating',
      'document.sift_score'
    );

    if v_updated_source = v_source
      or position('document.display_rating' in v_updated_source) > 0
      or position('document.sift_score' in v_updated_source) = 0 then
      raise exception 'Sift Score v2 filtering could not be applied to %',
        v_function.proname;
    end if;

    execute format(
      'create or replace function public.%I(%s)
       returns %s
       language plpgsql
       stable
       security invoker
       set search_path = ''''
       set plan_cache_mode = ''force_custom_plan''
       as %L',
      v_function.proname,
      v_arguments,
      v_result,
      v_updated_source
    );
  end loop;
end;
$migration$;

revoke all on function public.search_agents_advanced(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) from public, anon, authenticated;
grant execute on function public.search_agents_advanced(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) to service_role;

revoke all on function public.search_agent_rating_keys(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) from public, anon, authenticated;
grant execute on function public.search_agent_rating_keys(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) to service_role;

revoke all on function public.search_agent_discovery_keys(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) from public, anon, authenticated;
grant execute on function public.search_agent_discovery_keys(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) to service_role;

create index if not exists agent_discovery_chain_recent_score_cover_idx
  on public.agent_discovery_documents (
    chain_id,
    registered_block desc nulls last,
    agent_db_id
  )
  include (sift_score);

analyze public.agent_discovery_documents;

comment on function public.enforce_current_discovery_sift_score() is
  'Keeps retired score formula versions out of the current discovery projection.';
comment on function public.search_agent_discovery_keys(
  text[], text[], text[], text, integer, integer, bigint[], text[], text[], text, boolean
) is
  'Returns bounded advanced discovery keys; rating bands and score sorts use current publishable Sift Scores only.';

commit;

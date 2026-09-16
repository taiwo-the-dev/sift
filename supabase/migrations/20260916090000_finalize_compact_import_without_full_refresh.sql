-- finalize_compact_catalogue_import() rebuilt the entire discovery
-- projection for every agent in one statement. Against a fully populated
-- catalogue (hundreds of thousands of agents) that single insert/select
-- exceeds the platform statement timeout. The projection is now rebuilt
-- ahead of time in small batches by the caller (see
-- refresh_agent_discovery_documents), so finalize only validates and
-- analyzes.

begin;

create or replace function public.finalize_compact_catalogue_import()
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

comment on function public.finalize_compact_catalogue_import() is
  'Validates and analyzes the compact projection after the caller has '
  'rebuilt it in batches via refresh_agent_discovery_documents.';

commit;

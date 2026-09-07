begin;

create or replace function public.replace_agent_category_shortlist(
  p_records jsonb
)
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

  delete from public.agent_category_shortlist
  where category in (
    'yield-optimisation',
    'grid-trading',
    'health-factor-monitoring',
    'liquidity-rebalancing'
  );

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

revoke execute on function public.replace_agent_category_shortlist(jsonb)
from public, anon, authenticated;
grant execute on function public.replace_agent_category_shortlist(jsonb)
to service_role;

comment on function public.replace_agent_category_shortlist(jsonb) is
  'Atomically replaces the bounded four-category shortlist using a safe-update-compatible filtered delete.';

commit;

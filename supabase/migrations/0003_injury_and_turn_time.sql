-- 1. Stamp each stored turn with the time it was saved (the summary page shows it).
create or replace function public.append_turn(p_session uuid, p_turn jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_index int;
begin
  insert into public.sessions (id) values (p_session) on conflict (id) do nothing;

  update public.sessions
     set transcript = transcript || jsonb_build_array(
           jsonb_set(
             jsonb_set(p_turn, '{index}', to_jsonb(jsonb_array_length(transcript))),
             '{at}', to_jsonb(now())
           )
         )
   where id = p_session and expires_at > now()
  returning jsonb_array_length(transcript) - 1 into v_index;

  if v_index is null then
    raise exception 'session expired or missing';
  end if;
  return jsonb_build_object('index', v_index);
end $$;

-- 2. Write the injury record only if it is newer than what is stored, so slow
--    background extractions can never overwrite a newer record with an older one.
create or replace function public.set_injury_record(p_session uuid, p_record jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int;
begin
  update public.sessions
     set injury_record = p_record
   where id = p_session
     and coalesce((injury_record->>'version')::int, -1) < (p_record->>'version')::int;
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end $$;

revoke all on function public.set_injury_record(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.set_injury_record(uuid, jsonb) to service_role;

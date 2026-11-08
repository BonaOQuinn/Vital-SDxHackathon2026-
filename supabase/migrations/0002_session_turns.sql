-- Atomic turn append: gets the next index and appends in one statement, so two
-- near-simultaneous turns can never overwrite each other.
-- Creates the session row on first use. Refuses to write to expired sessions.
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
           jsonb_set(p_turn, '{index}', to_jsonb(jsonb_array_length(transcript)))
         )
   where id = p_session and expires_at > now()
  returning jsonb_array_length(transcript) - 1 into v_index;

  if v_index is null then
    raise exception 'session expired or missing';
  end if;
  return jsonb_build_object('index', v_index);
end $$;

revoke all on function public.append_turn(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.append_turn(uuid, jsonb) to service_role;

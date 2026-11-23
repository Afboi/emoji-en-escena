-- Fixed interactive scoring: exact answers 3 points; accepted minor variants 1 point.
create or replace function public.record_theatre_answer(
  p_player_id text, p_question_index integer, p_answer text, p_correct boolean, p_points integer
) returns table (accepted boolean, awarded integer)
language plpgsql security definer set search_path = public
as $$
declare inserted_count integer; awarded_points integer;
begin
  awarded_points := case when p_correct then greatest(0, least(p_points, 3)) else 0 end;
  insert into public.theatre_answers(player_id, question_index, answer, correct, points)
  values (p_player_id, p_question_index, left(p_answer, 160), p_correct, awarded_points)
  on conflict (player_id, question_index) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then return query select false, 0; return; end if;
  if p_correct then
    update public.theatre_players set score = score + awarded_points where id = p_player_id;
  end if;
  return query select true, awarded_points;
end $$;
revoke all on function public.record_theatre_answer(text, integer, text, boolean, integer) from public, anon, authenticated;
grant execute on function public.record_theatre_answer(text, integer, text, boolean, integer) to service_role;

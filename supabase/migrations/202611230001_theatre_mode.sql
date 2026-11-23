-- Interactive theatre mode: player identities and one answer per question.
create table if not exists public.theatre_players (
  id text primary key,
  room_code text not null references public.rooms(code) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 24),
  score integer not null default 0,
  joined_at timestamptz not null default now()
);
create index if not exists theatre_players_room_idx on public.theatre_players(room_code, joined_at);
create table if not exists public.theatre_answers (
  player_id text not null references public.theatre_players(id) on delete cascade,
  question_index integer not null,
  answer text not null,
  correct boolean not null default false,
  points integer not null default 0,
  submitted_at timestamptz not null default now(),
  primary key (player_id, question_index)
);
alter table public.theatre_players enable row level security;
alter table public.theatre_answers enable row level security;
revoke all on public.theatre_players, public.theatre_answers from anon, authenticated;

create or replace function public.record_theatre_answer(
  p_player_id text, p_question_index integer, p_answer text, p_correct boolean, p_points integer
) returns table (accepted boolean, awarded integer)
language plpgsql security definer set search_path = public
as $$
declare inserted_count integer;
begin
  insert into public.theatre_answers(player_id, question_index, answer, correct, points)
  values (p_player_id, p_question_index, left(p_answer, 160), p_correct, case when p_correct then greatest(0, least(p_points, 1000)) else 0 end)
  on conflict (player_id, question_index) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then return query select false, 0; return; end if;
  if p_correct then
    update public.theatre_players set score = score + greatest(0, least(p_points, 1000))
    where id = p_player_id;
  end if;
  return query select true, case when p_correct then greatest(0, least(p_points, 1000)) else 0 end;
end $$;
revoke all on function public.record_theatre_answer(text, integer, text, boolean, integer) from public, anon, authenticated;
grant execute on function public.record_theatre_answer(text, integer, text, boolean, integer) to service_role;

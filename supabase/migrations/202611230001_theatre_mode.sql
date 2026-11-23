-- Interactive theatre mode: private player records, accessed only through server functions.
create table if not exists public.theatre_players (
  id text primary key,
  room_code text not null references public.rooms(code) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 24),
  score integer not null default 0,
  joined_at timestamptz not null default now(),
  last_answer text,
  last_answer_at timestamptz
);
create index if not exists theatre_players_room_idx on public.theatre_players(room_code, joined_at);
alter table public.theatre_players enable row level security;
revoke all on public.theatre_players from anon, authenticated;

-- Allow the public projection screen to read the public game state.
-- No private room secret or private_state is exposed by this table.
grant select on table public.rooms to anon, authenticated;

drop policy if exists "Public screen can read room state" on public.rooms;
create policy "Public screen can read room state"
on public.rooms
for select
to anon, authenticated
using (true);

-- Enable realtime UPDATE notifications for public room state.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end
$$;

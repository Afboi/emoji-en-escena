-- Fix server-side game access: the trusted service-role client needs table privileges.
-- This does NOT grant access to anon/authenticated users or disable RLS.
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.rooms to service_role;
grant select, insert, update, delete on table public.room_secrets to service_role;
grant select, insert, update, delete on table public.theatre_players to service_role;
grant select, insert, update, delete on table public.theatre_answers to service_role;
grant execute on function public.record_theatre_answer(text, integer, text, boolean, integer) to service_role;

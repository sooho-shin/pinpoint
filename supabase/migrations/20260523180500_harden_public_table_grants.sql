-- Harden direct Supabase grants for game integrity.
-- Route handlers use the service role for puzzle reads and attempt writes.

revoke select on public.puzzles from anon, authenticated;
grant select (id, locale, category, status, created_at, updated_at) on public.puzzles to anon, authenticated;

revoke insert, update on public.attempts from anon, authenticated;
grant select on public.attempts to authenticated;

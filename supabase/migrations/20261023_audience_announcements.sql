-- PulseDeck audience announcement feed.
-- Run this after 20261014_pulsedeck.sql and the attendance/quiz migrations.
-- Students can read messages only for active events; only owners can insert messages.
drop policy if exists "audience read live announcements" on public.broadcasts;
create policy "audience read live announcements" on public.broadcasts
for select to anon, authenticated
using (public.is_live_event(event_id));

do $$ begin
  alter publication supabase_realtime add table public.broadcasts;
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';

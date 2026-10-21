-- PulseDeck deployment repair. Run this in Supabase SQL Editor.
-- Replaces policies safely and ensures the app roles have table privileges.
begin;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.events to authenticated;
grant select, insert, update on public.questions to anon, authenticated;
grant select, insert, update on public.activities to anon, authenticated;
grant select, insert on public.responses to anon, authenticated;
grant select, insert on public.broadcasts to authenticated;
grant select, insert, update, delete on public.quiz_answer_keys to authenticated;

drop policy if exists "owner create activities" on public.activities;
create policy "owner create activities" on public.activities
for insert to authenticated
with check (exists (select 1 from public.events e where e.id = event_id and e.owner_id = (select auth.uid())));

drop policy if exists "owner manage activities" on public.activities;
create policy "owner manage activities" on public.activities
for update to authenticated
using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = (select auth.uid())))
with check (exists (select 1 from public.events e where e.id = event_id and e.owner_id = (select auth.uid())));

drop policy if exists "owner create announcements" on public.broadcasts;
create policy "owner create announcements" on public.broadcasts
for insert to authenticated
with check (sender_id = (select auth.uid()) and exists (
 select 1 from public.events e where e.id = event_id and e.owner_id = (select auth.uid())
));

drop policy if exists "owner read announcements" on public.broadcasts;
create policy "owner read announcements" on public.broadcasts
for select to authenticated
using (exists (select 1 from public.events e where e.id = event_id and e.owner_id = (select auth.uid())));

drop policy if exists "owner read responses" on public.responses;
create policy "owner read responses" on public.responses
for select to authenticated
using (exists (select 1 from public.activities a join public.events e on e.id = a.event_id
 where a.id = activity_id and e.owner_id = (select auth.uid())));

drop policy if exists "audience submit response" on public.responses;
create policy "audience submit response" on public.responses
for insert to anon, authenticated
with check (participant_token is not null and public.is_live_activity(activity_id, option_text));

drop policy if exists "owner manage quiz answer keys" on public.quiz_answer_keys;
create policy "owner manage quiz answer keys" on public.quiz_answer_keys
for all to authenticated
using (exists (select 1 from public.activities a join public.events e on e.id=a.event_id
 where a.id=quiz_answer_keys.activity_id and e.owner_id=(select auth.uid())))
with check (exists (select 1 from public.activities a join public.events e on e.id=a.event_id
 where a.id=quiz_answer_keys.activity_id and e.owner_id=(select auth.uid())));

notify pgrst, 'reload schema';
commit;

-- PulseDeck: repair quiz RPC signature and add live attendance insights.
-- Run this migration in the Supabase SQL Editor after the existing PulseDeck migrations.

-- 1) Keep the response token column available on existing deployments.
alter table public.responses add column if not exists participant_token uuid;
create unique index if not exists responses_activity_participant_unique
  on public.responses(activity_id, participant_token) where participant_token is not null;

-- Ensure the private answer-key table exists even if an earlier migration was skipped.
create table if not exists public.quiz_answer_keys (
  activity_id uuid primary key references public.activities(id) on delete cascade,
  correct_option text not null check (length(trim(correct_option)) between 1 and 300),
  explanation text not null default '' check (length(explanation) <= 1000),
  created_at timestamptz not null default now()
);
alter table public.quiz_answer_keys enable row level security;
drop policy if exists "owner manage quiz answer keys" on public.quiz_answer_keys;
create policy "owner manage quiz answer keys" on public.quiz_answer_keys
for all to authenticated
using (exists (
  select 1 from public.activities a join public.events e on e.id = a.event_id
  where a.id = quiz_answer_keys.activity_id and e.owner_id = (select auth.uid())
))
with check (exists (
  select 1 from public.activities a join public.events e on e.id = a.event_id
  where a.id = quiz_answer_keys.activity_id and e.owner_id = (select auth.uid())
));
revoke all on public.quiz_answer_keys from anon, authenticated;
grant select, insert, update, delete on public.quiz_answer_keys to authenticated;

-- 2) Recreate the RPC with the exact named arguments sent by StudentApp.jsx.
drop function if exists public.submit_quiz_answer(uuid, text, text, uuid);
drop function if exists public.submit_quiz_answer(uuid, text, text);
create function public.submit_quiz_answer(
  activity_uuid uuid,
  participant_name text,
  participant_token uuid,
  selected_option text
)
returns table(is_correct boolean, explanation text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  correct_value text;
  explanation_value text;
  activity_options jsonb;
  activity_type_value text;
begin
  if selected_option is null or length(trim(selected_option)) = 0 then
    raise exception 'Choose an answer first';
  end if;
  if participant_token is null then
    raise exception 'A participant session token is required';
  end if;

  select a.type, a.options, k.correct_option, k.explanation
    into activity_type_value, activity_options, correct_value, explanation_value
  from public.activities a
  join public.events e on e.id = a.event_id
  join public.quiz_answer_keys k on k.activity_id = a.id
  where a.id = activity_uuid and a.is_active = true and e.status = 'active';

  if not found or activity_type_value <> 'quiz' then
    raise exception 'This quiz is not currently available';
  end if;
  if not (activity_options ? selected_option) then
    raise exception 'Selected answer is not one of the available options';
  end if;

  insert into public.responses(activity_id, option_text, voter_name, user_id, participant_token)
  values (activity_uuid, selected_option,
    left(coalesce(nullif(trim(participant_name), ''), 'Student'), 40), null, participant_token);

  return query select selected_option = correct_value, coalesce(explanation_value, '');
end;
$$;
revoke all on function public.submit_quiz_answer(uuid, text, uuid, text) from public;
grant execute on function public.submit_quiz_answer(uuid, text, uuid, text) to anon, authenticated;

-- 3) Store expected class size on the session. Null means the teacher hasn't entered it.
alter table public.events add column if not exists expected_participants integer;
alter table public.events drop constraint if exists events_expected_participants_check;
alter table public.events add constraint events_expected_participants_check
  check (expected_participants is null or expected_participants between 1 and 10000);

-- A browser/device has joined when it registers here. last_seen_at is refreshed while connected.
create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_token uuid not null,
  participant_name text not null default 'Student' check (length(participant_name) <= 40),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(event_id, participant_token)
);
create index if not exists event_participants_event_seen_idx
  on public.event_participants(event_id, last_seen_at desc);
alter table public.event_participants enable row level security;
revoke all on public.event_participants from anon, authenticated;

-- Safe public heartbeat: participants can only register against an active event.
create or replace function public.touch_event_participant(
  target_event uuid,
  participant_token uuid,
  participant_name text default 'Student'
)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if target_event is null or participant_token is null then
    raise exception 'Event and participant token are required';
  end if;
  if not exists(select 1 from public.events e where e.id = target_event and e.status = 'active') then
    raise exception 'This session is not active';
  end if;
  insert into public.event_participants(event_id, participant_token, participant_name, joined_at, last_seen_at)
  values (target_event, participant_token,
    left(coalesce(nullif(trim(participant_name), ''), 'Student'), 40), now(), now())
  on conflict (event_id, participant_token) do update
    set participant_name = excluded.participant_name, last_seen_at = now();
end;
$$;
revoke all on function public.touch_event_participant(uuid, uuid, text) from public;
grant execute on function public.touch_event_participant(uuid, uuid, text) to anon, authenticated;

-- Only the session owner can retrieve its attendance details.
create or replace function public.event_attendance_summary(target_event uuid)
returns table(expected_count integer, joined_count bigint, present_count bigint, participant_names jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare owner_id_value uuid;
begin
  select e.owner_id into owner_id_value from public.events e where e.id = target_event;
  if owner_id_value is null or owner_id_value <> auth.uid() then
    raise exception 'Not authorized to view this session attendance';
  end if;
  return query
  select e.expected_participants,
    count(p.id),
    count(p.id) filter (where p.last_seen_at >= now() - interval '60 seconds'),
    coalesce(jsonb_agg(jsonb_build_object(
      'name', p.participant_name,
      'joined_at', p.joined_at,
      'is_present', p.last_seen_at >= now() - interval '60 seconds'
    ) order by p.joined_at) filter (where p.id is not null), '[]'::jsonb)
  from public.events e
  left join public.event_participants p on p.event_id = e.id
  where e.id = target_event
  group by e.expected_participants;
end;
$$;
revoke all on function public.event_attendance_summary(uuid) from public;
grant execute on function public.event_attendance_summary(uuid) to authenticated;

notify pgrst, 'reload schema';

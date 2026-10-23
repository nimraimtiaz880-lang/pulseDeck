-- PulseDeck quiz scoring upgrade. Run after 20261014_pulsedeck.sql.
-- Keep answer keys out of the public activities table so students cannot fetch them.
alter table public.responses add column if not exists participant_token uuid;
create unique index if not exists responses_activity_participant_unique
  on public.responses(activity_id, participant_token) where participant_token is not null;

drop policy if exists "audience submit response" on public.responses;
create policy "audience submit response" on public.responses for insert to anon, authenticated
with check (participant_token is not null and public.is_live_activity(activity_id, option_text));
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

drop function if exists public.submit_quiz_answer(uuid, text, text);
create or replace function public.submit_quiz_answer(
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
  values (activity_uuid, selected_option, left(coalesce(nullif(trim(participant_name), ''), 'Student'), 40), null, participant_token);

  return query select selected_option = correct_value, coalesce(explanation_value, '');
end;
$$;

revoke all on function public.submit_quiz_answer(uuid, text, uuid, text) from public;
grant execute on function public.submit_quiz_answer(uuid, text, uuid, text) to anon, authenticated;

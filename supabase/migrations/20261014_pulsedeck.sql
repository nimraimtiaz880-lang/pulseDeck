-- PulseDeck application schema. Run once in the Supabase SQL editor.
create extension if not exists pgcrypto;
create table if not exists public.events (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 120),
 description text not null default '', presentation_url text, join_code text not null unique check(join_code ~ '^[A-Z0-9]{6,12}$'),
 status text not null default 'active' check(status in ('active','closed')),
 created_at timestamptz not null default now()
);
create table if not exists public.questions (
 id uuid primary key default gen_random_uuid(),event_id uuid not null references public.events(id) on delete cascade,
 body text not null check(length(trim(body)) between 1 and 500),author_name text not null default 'Student' check(length(author_name)<=40),
 votes integer not null default 0 check(votes>=0),status text not null default 'pending' check(status in ('pending','approved','dismissed')),
 pinned boolean not null default false, user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create table if not exists public.activities (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 type text not null check(type in ('poll','quiz','survey')),title text not null check(length(trim(title)) between 1 and 120),
 prompt text not null check(length(trim(prompt)) between 1 and 500), options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options) between 2 and 20),
 is_active boolean not null default true, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create table if not exists public.responses (
 id uuid primary key default gen_random_uuid(),activity_id uuid not null references public.activities(id) on delete cascade,
 option_text text not null check(length(option_text) between 1 and 300), voter_name text not null default 'Student' check(length(voter_name)<=40),
 user_id uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.broadcasts (
 id uuid primary key default gen_random_uuid(),event_id uuid not null references public.events(id) on delete cascade,
 message text not null check(length(trim(message)) between 1 and 1000), sender_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists questions_event_idx on public.questions(event_id,created_at desc);
create index if not exists activities_event_idx on public.activities(event_id,created_at desc);
create index if not exists responses_activity_idx on public.responses(activity_id);
create index if not exists broadcasts_event_idx on public.broadcasts(event_id);

alter table public.events enable row level security;
alter table public.questions enable row level security;
alter table public.activities enable row level security;
alter table public.responses enable row level security;
alter table public.broadcasts enable row level security;

create policy "owner read events" on public.events for select to authenticated using (owner_id=(select auth.uid()));
create policy "owner create events" on public.events for insert to authenticated with check (owner_id=(select auth.uid()));
create policy "owner update events" on public.events for update to authenticated using (owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

-- Security-definer predicates avoid anon SELECT access to private join codes.
create or replace function public.is_live_event(event_uuid uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.events e where e.id=event_uuid and e.status='active');
$$;
create or replace function public.is_live_activity(activity_uuid uuid,answer text default null)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.activities a join public.events e on e.id=a.event_id
 where a.id=activity_uuid and a.is_active and e.status='active' and (answer is null or a.options ? answer));
$$;
revoke all on function public.is_live_event(uuid) from public;
revoke all on function public.is_live_activity(uuid,text) from public;
grant execute on function public.is_live_event(uuid) to anon,authenticated;
grant execute on function public.is_live_activity(uuid,text) to anon,authenticated;

-- Public views are deliberately scoped to approved questions or live activities.
create policy "question public approved read" on public.questions for select to anon,authenticated using (
 status='approved' and public.is_live_event(event_id)
 or exists(select 1 from public.events e where e.id=event_id and e.owner_id=(select auth.uid()))
);
create policy "audience submit question" on public.questions for insert to anon,authenticated with check (
 status='pending' and votes=0 and pinned=false and
 public.is_live_event(event_id)
);
create policy "owner moderate question" on public.questions for update to authenticated using (
 exists(select 1 from public.events e where e.id=event_id and e.owner_id=(select auth.uid()))
) with check(exists(select 1 from public.events e where e.id=event_id and e.owner_id=(select auth.uid())));

create policy "public read live activities" on public.activities for select to anon,authenticated using (
 (is_active and public.is_live_event(event_id))
 or exists(select 1 from public.events e where e.id=event_id and e.owner_id=(select auth.uid()))
);
create policy "owner create activities" on public.activities for insert to authenticated with check (
 exists(select 1 from public.events e where e.id=event_id and e.owner_id=(select auth.uid()))
);
create policy "owner manage activities" on public.activities for update to authenticated using (
 exists(select 1 from public.events e where e.id=event_id and e.owner_id=(select auth.uid()))
) with check(exists(select 1 from public.events e where e.id=event_id and e.owner_id=(select auth.uid())));

create policy "owner read responses" on public.responses for select to authenticated using (
 exists(select 1 from public.activities a join public.events e on e.id=a.event_id where a.id=activity_id and e.owner_id=(select auth.uid()))
);
create policy "audience submit response" on public.responses for insert to anon,authenticated with check (
 public.is_live_activity(activity_id,option_text)
);
create policy "owner read announcements" on public.broadcasts for select to authenticated using (
 exists(select 1 from public.events e where e.id=event_id and e.owner_id=(select auth.uid()))
);
create policy "owner create announcements" on public.broadcasts for insert to authenticated with check (
 sender_id=(select auth.uid()) and exists(select 1 from public.events e where e.id=event_id and e.owner_id=(select auth.uid()))
);

-- Code lookup bypasses private event ownership; returns a minimal live event record only.
create or replace function public.join_event_by_code(input_code text)
returns table(id uuid,title text,description text,join_code text,status text)
language sql stable security definer set search_path='' as $$
 select e.id,e.title,e.description,e.join_code,e.status
 from public.events e where e.join_code=upper(trim(input_code)) and e.status='active' limit 1;
$$;
revoke all on function public.join_event_by_code(text) from public;
grant execute on function public.join_event_by_code(text) to anon,authenticated;

-- Atomic upvote: caller cannot directly alter vote totals via RLS.
create or replace function public.upvote_question(question_uuid uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 update public.questions q set votes=q.votes+1
 where q.id=question_uuid and q.status='approved'
 and exists(select 1 from public.events e where e.id=q.event_id and e.status='active');
 if not found then raise exception 'Question is not available'; end if;
end;
$$;
revoke all on function public.upvote_question(uuid) from public;
grant execute on function public.upvote_question(uuid) to anon,authenticated;

-- Aggregated results; hides individual respondents from anonymous clients.
create or replace function public.event_response_counts(target_event uuid)
returns table(activity_id uuid,option_text text,total bigint)
language sql stable security definer set search_path='' as $$
 select r.activity_id,r.option_text,count(*) from public.responses r
 join public.activities a on a.id=r.activity_id
 join public.events e on e.id=a.event_id
 where e.id=target_event and e.status='active' and a.is_active
 group by r.activity_id,r.option_text;
$$;
revoke all on function public.event_response_counts(uuid) from public;
grant execute on function public.event_response_counts(uuid) to anon,authenticated;

-- Realtime: owner updates; participant clients also poll as a fallback.
do $$ begin
 alter publication supabase_realtime add table public.events;
exception when duplicate_object then null; end $$;
do $$ begin
 alter publication supabase_realtime add table public.questions;
exception when duplicate_object then null; end $$;
do $$ begin
 alter publication supabase_realtime add table public.activities;
exception when duplicate_object then null; end $$;
do $$ begin
 alter publication supabase_realtime add table public.responses;
exception when duplicate_object then null; end $$;

-- Optional presentation link associated with each PulseDeck session.
-- Run this migration in Supabase SQL Editor for cloud-backed projects.
alter table public.events add column if not exists presentation_url text;

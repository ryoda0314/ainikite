-- A-Frame Shout Builder: Supabase Schema
-- Run this in the Supabase SQL Editor to set up the database.

-- Projects table
create table if not exists public.projects (
  id text primary key,
  blocks jsonb not null default '[]'::jsonb,
  assignment jsonb not null default '{}'::jsonb,
  template text not null default '{SEQ}',
  youtube_video_id text not null default '',
  youtube_start_sec integer not null default 0,
  member_videos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Index for lookups by ID (primary key already indexed)
-- Index for cleanup of old entries
create index if not exists idx_projects_created_at on public.projects (created_at);

-- Row Level Security
alter table public.projects enable row level security;

-- Policy: Anyone can read any project (public sharing)
create policy "Public read access"
  on public.projects
  for select
  using (true);

-- Policy: Anyone can insert (anonymous write, rate-limited at app level)
create policy "Anonymous insert access"
  on public.projects
  for insert
  with check (true);

-- Optional: Auto-delete old projects (> 90 days)
-- You can set up a cron job or Supabase Edge Function for this:
-- delete from public.projects where created_at < now() - interval '90 days';

-- Project Pilot Sprint 2.2 + 2.3
-- Interactive Flight Plan and redesigned Project Workspace
-- Run this file once in the Supabase SQL Editor before testing the sprint.

create table if not exists public.project_waypoints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stage_key text not null,
  stage_label text not null,
  stage_order integer not null default 0,
  notes text not null default '',
  due_date date,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(project_id, stage_key)
);

alter table public.project_waypoints add column if not exists stage_order integer not null default 0;
alter table public.project_waypoints add column if not exists notes text not null default '';
alter table public.project_waypoints add column if not exists due_date date;
alter table public.project_waypoints add column if not exists completed boolean not null default false;
alter table public.project_waypoints add column if not exists updated_at timestamptz not null default now();

alter table public.project_waypoints enable row level security;

drop policy if exists "Users can view their project waypoints" on public.project_waypoints;
create policy "Users can view their project waypoints"
on public.project_waypoints for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their project waypoints" on public.project_waypoints;
create policy "Users can create their project waypoints"
on public.project_waypoints for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their project waypoints" on public.project_waypoints;
create policy "Users can update their project waypoints"
on public.project_waypoints for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their project waypoints" on public.project_waypoints;
create policy "Users can delete their project waypoints"
on public.project_waypoints for delete
using (auth.uid() = user_id);

create index if not exists project_waypoints_project_id_idx
on public.project_waypoints(project_id);

create index if not exists project_waypoints_user_id_idx
on public.project_waypoints(user_id);

create unique index if not exists project_waypoints_project_stage_unique_idx
on public.project_waypoints(project_id, stage_key);

update public.project_waypoints
set stage_order = case stage_key
  when 'concept' then 0
  when 'planning' then 1
  when 'location' then 2
  when 'permits' then 3
  when 'documents' then 4
  when 'construction' then 5
  when 'inspections' then 6
  when 'completion' then 7
  else stage_order
end;

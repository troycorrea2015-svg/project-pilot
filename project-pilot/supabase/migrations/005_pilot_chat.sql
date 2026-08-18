-- Project Pilot: persistent Pilot chat
-- Safe to run even if the conversations table already exists.

create extension if not exists "pgcrypto";

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists conversations_project_created_idx
on public.conversations (project_id, created_at);

create index if not exists conversations_user_idx
on public.conversations (user_id);

alter table public.conversations enable row level security;

drop policy if exists "Users can view their conversations" on public.conversations;
create policy "Users can view their conversations"
on public.conversations for select
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.projects
    where projects.id = conversations.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can create conversation messages" on public.conversations;
create policy "Users can create conversation messages"
on public.conversations for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.projects
    where projects.id = conversations.project_id
      and projects.user_id = auth.uid()
  )
);

-- Project Pilot Build 2: guided setup, notes, and Project Binder
-- Run once in Supabase SQL Editor.

alter table public.projects add column if not exists project_role text;
alter table public.projects add column if not exists target_timeline text;
alter table public.projects add column if not exists budget numeric;
alter table public.projects add column if not exists notes text;

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

alter table public.project_documents enable row level security;

drop policy if exists "Users can view their project documents" on public.project_documents;
create policy "Users can view their project documents"
on public.project_documents for select using (auth.uid() = user_id);

drop policy if exists "Users can create project documents" on public.project_documents;
create policy "Users can create project documents"
on public.project_documents for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete project documents" on public.project_documents;
create policy "Users can delete project documents"
on public.project_documents for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documents',
  'project-documents',
  false,
  15728640,
  array['application/pdf','image/jpeg','image/png','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their project files" on storage.objects;
create policy "Users can upload their project files"
on storage.objects for insert to authenticated
with check (bucket_id = 'project-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can read their project files" on storage.objects;
create policy "Users can read their project files"
on storage.objects for select to authenticated
using (bucket_id = 'project-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their project files" on storage.objects;
create policy "Users can delete their project files"
on storage.objects for delete to authenticated
using (bucket_id = 'project-documents' and (storage.foldername(name))[1] = auth.uid()::text);

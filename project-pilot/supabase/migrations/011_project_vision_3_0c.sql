-- Project Pilot Sprint 3.0C
-- Project Vision: user-uploaded source photos, AI concept versions, revisions, favorites, and actual completion photos.
-- Run once in Supabase SQL Editor AFTER the 3.0B migration.

create extension if not exists "pgcrypto";

create table if not exists public.project_vision_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_type text not null check (asset_type in ('source','concept','actual_after')),
  source_asset_id uuid references public.project_vision_assets(id) on delete set null,
  storage_path text not null unique,
  mime_type text not null default 'image/jpeg',
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  caption text not null default '',
  generation_prompt text not null default '',
  revision_notes text not null default '',
  version_number integer not null default 1 check (version_number > 0),
  status text not null default 'ready' check (status in ('uploaded','queued','processing','ready','failed')),
  is_favorite boolean not null default false,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint concept_requires_source check (
    asset_type <> 'concept' or source_asset_id is not null
  )
);

create table if not exists public.project_vision_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_asset_id uuid not null references public.project_vision_assets(id) on delete cascade,
  result_asset_id uuid references public.project_vision_assets(id) on delete set null,
  project_description text not null,
  budget_tier text not null default 'Not specified' check (budget_tier in ('Not specified','Under $10,000','$10,000–$25,000','$25,000–$50,000','$50,000+','Premium')),
  style_preferences text not null default '',
  preserve_instructions text not null default 'Preserve the original property, structures, layout, camera angle, and recognizable fixed features. Modify only the requested project elements.',
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','cancelled')),
  provider_request_id text,
  error_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.project_vision_assets enable row level security;
alter table public.project_vision_requests enable row level security;

create or replace function public.owns_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects
    where id = p_project_id and user_id = auth.uid()
  );
$$;

revoke all on function public.owns_project(uuid) from public;
grant execute on function public.owns_project(uuid) to authenticated;

-- Asset metadata policies
drop policy if exists "Project owners can view vision assets" on public.project_vision_assets;

create policy "Project owners can view vision assets"
on public.project_vision_assets for select to authenticated
using (public.owns_project(project_id) or public.is_project_pilot_admin());

drop policy if exists "Project owners can create vision assets" on public.project_vision_assets;

create policy "Project owners can create vision assets"
on public.project_vision_assets for insert to authenticated
with check (user_id = auth.uid() and public.owns_project(project_id));

drop policy if exists "Uploaders can update own vision assets" on public.project_vision_assets;

create policy "Uploaders can update own vision assets"
on public.project_vision_assets for update to authenticated
using ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin())
with check ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin());

drop policy if exists "Uploaders can delete own vision assets" on public.project_vision_assets;

create policy "Uploaders can delete own vision assets"
on public.project_vision_assets for delete to authenticated
using ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin());

-- Generation request policies
drop policy if exists "Project owners can view vision requests" on public.project_vision_requests;

create policy "Project owners can view vision requests"
on public.project_vision_requests for select to authenticated
using (public.owns_project(project_id) or public.is_project_pilot_admin());

drop policy if exists "Project owners can create vision requests" on public.project_vision_requests;

create policy "Project owners can create vision requests"
on public.project_vision_requests for insert to authenticated
with check (user_id = auth.uid() and public.owns_project(project_id));

drop policy if exists "Project owners can cancel vision requests" on public.project_vision_requests;

create policy "Project owners can cancel vision requests"
on public.project_vision_requests for update to authenticated
using ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin())
with check ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin());

create index if not exists project_vision_assets_project_idx on public.project_vision_assets(project_id, created_at desc);
create index if not exists project_vision_assets_source_idx on public.project_vision_assets(source_asset_id, version_number);
create index if not exists project_vision_requests_project_idx on public.project_vision_requests(project_id, created_at desc);
create index if not exists project_vision_requests_status_idx on public.project_vision_requests(status, created_at);

-- Private storage bucket. The app must use signed URLs, not public URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-vision',
  'project-vision',
  false,
  15728640,
  array['image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Required object path: {user_id}/{project_id}/{uuid}.{extension}
drop policy if exists "Users can upload their own project vision images" on storage.objects;

create policy "Users can upload their own project vision images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-vision'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.owns_project(((storage.foldername(name))[2])::uuid)
);

drop policy if exists "Project owners can view project vision images" on storage.objects;

create policy "Project owners can view project vision images"
on storage.objects for select to authenticated
using (
  bucket_id = 'project-vision'
  and (
    ((storage.foldername(name))[1] = auth.uid()::text and public.owns_project(((storage.foldername(name))[2])::uuid))
    or public.is_project_pilot_admin()
  )
);

drop policy if exists "Users can replace their own project vision images" on storage.objects;

create policy "Users can replace their own project vision images"
on storage.objects for update to authenticated
using (
  bucket_id = 'project-vision'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.owns_project(((storage.foldername(name))[2])::uuid)
)
with check (
  bucket_id = 'project-vision'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.owns_project(((storage.foldername(name))[2])::uuid)
);

drop policy if exists "Users can delete their own project vision images" on storage.objects;

create policy "Users can delete their own project vision images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'project-vision'
  and (
    ((storage.foldername(name))[1] = auth.uid()::text and public.owns_project(((storage.foldername(name))[2])::uuid))
    or public.is_project_pilot_admin()
  )
);

comment on table public.project_vision_assets is 'User-uploaded originals, AI-edited concepts anchored to those originals, and user-uploaded actual completion photos.';
comment on table public.project_vision_requests is 'Server-processed Project Vision generation and revision requests.';

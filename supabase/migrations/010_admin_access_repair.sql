-- Project Pilot Sprint 3.0A Admin Access Repair
-- Run this entire file once in Supabase SQL Editor.

alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists last_active_at timestamptz;

create or replace function public.is_project_pilot_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;

revoke all on function public.is_project_pilot_admin() from public;
grant execute on function public.is_project_pilot_admin() to authenticated;

-- Ensure every existing authenticated user has a profile row.
insert into public.profiles (id, full_name, role, created_at, updated_at)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  coalesce(u.raw_user_meta_data ->> 'role', 'Homeowner'),
  coalesce(u.created_at, now()),
  now()
from auth.users u
on conflict (id) do update
set
  full_name = case
    when coalesce(public.profiles.full_name, '') = '' then excluded.full_name
    else public.profiles.full_name
  end,
  role = coalesce(nullif(public.profiles.role, ''), excluded.role),
  updated_at = now();

-- After running this file, run the separate statement below with your real login email:
--
-- update public.profiles p
-- set is_admin = true,
--     updated_at = now()
-- from auth.users u
-- where p.id = u.id
--   and lower(u.email) = lower('YOUR_PROJECT_PILOT_LOGIN_EMAIL');
--
-- Then verify:
--
-- select u.email, p.is_admin
-- from auth.users u
-- join public.profiles p on p.id = u.id
-- where lower(u.email) = lower('YOUR_PROJECT_PILOT_LOGIN_EMAIL');

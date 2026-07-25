-- Project Pilot Sprint 3.0A
-- Guided experience, beta feedback, product activity, and Admin Control Center.
-- Run once in Supabase SQL Editor.

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
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

revoke all on function public.is_project_pilot_admin() from public;
grant execute on function public.is_project_pilot_admin() to authenticated;

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  page_path text not null default '/',
  category text not null default 'Suggestion',
  message text not null,
  rating integer check (rating is null or rating between 1 and 5),
  status text not null default 'New' check (status in ('New','Reviewing','Planned','Fixed','Closed')),
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  page_path text,
  project_id uuid references public.projects(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.beta_feedback enable row level security;
alter table public.product_events enable row level security;

drop policy if exists "Users can submit beta feedback" on public.beta_feedback;
create policy "Users can submit beta feedback"
on public.beta_feedback for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can view their beta feedback" on public.beta_feedback;
create policy "Users can view their beta feedback"
on public.beta_feedback for select to authenticated
using (auth.uid() = user_id or public.is_project_pilot_admin());

drop policy if exists "Admins can update beta feedback" on public.beta_feedback;
create policy "Admins can update beta feedback"
on public.beta_feedback for update to authenticated
using (public.is_project_pilot_admin())
with check (public.is_project_pilot_admin());

drop policy if exists "Users can create product events" on public.product_events;
create policy "Users can create product events"
on public.product_events for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can view their product events" on public.product_events;
create policy "Users can view their product events"
on public.product_events for select to authenticated
using (auth.uid() = user_id or public.is_project_pilot_admin());

create index if not exists beta_feedback_status_idx on public.beta_feedback(status);
create index if not exists beta_feedback_created_at_idx on public.beta_feedback(created_at desc);
create index if not exists product_events_created_at_idx on public.product_events(created_at desc);
create index if not exists product_events_event_name_idx on public.product_events(event_name);

create or replace function public.admin_dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_project_pilot_admin() then
    raise exception 'Admin access required';
  end if;

  select jsonb_build_object(
    'total_accounts', (select count(*) from public.profiles),
    'new_accounts_7d', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'new_accounts_30d', (select count(*) from public.profiles where created_at >= now() - interval '30 days'),
    'active_accounts_30d', (
      select count(distinct user_id) from public.product_events
      where created_at >= now() - interval '30 days' and user_id is not null
    ),
    'total_projects', (select count(*) from public.projects),
    'active_projects', (select count(*) from public.projects where coalesce(progress,0) < 100),
    'completed_projects', (select count(*) from public.projects where coalesce(progress,0) >= 100 or lower(coalesce(status,'')) = 'completed'),
    'total_feedback', (select count(*) from public.beta_feedback),
    'open_feedback', (select count(*) from public.beta_feedback where status in ('New','Reviewing','Planned')),
    'total_events', (select count(*) from public.product_events),
    'account_breakdown', coalesce((
      select jsonb_agg(jsonb_build_object('role', role_name, 'count', role_count) order by role_count desc)
      from (
        select coalesce(nullif(role,''), 'Unspecified') as role_name, count(*) as role_count
        from public.profiles group by 1
      ) roles
    ), '[]'::jsonb),
    'project_type_breakdown', coalesce((
      select jsonb_agg(jsonb_build_object('project_type', project_name, 'count', project_count) order by project_count desc)
      from (
        select coalesce(nullif(project_type,''), 'Other') as project_name, count(*) as project_count
        from public.projects group by 1 order by count(*) desc limit 12
      ) project_types
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_dashboard_summary() from public;
grant execute on function public.admin_dashboard_summary() to authenticated;

comment on table public.beta_feedback is 'User-submitted Project Pilot beta feedback shown in the Admin Control Center.';
comment on table public.product_events is 'First-party product usage events for beta analytics. No advertising tracking.';

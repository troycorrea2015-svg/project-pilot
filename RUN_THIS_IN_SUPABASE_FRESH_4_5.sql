-- PROJECT PILOT 4.5 FRESH DATABASE INSTALL (schema baseline carried forward from 4.4)
-- ONLY use this on a brand-new Supabase project.
-- Existing Project Pilot databases should use RUN_THIS_IN_SUPABASE_4_5_UPGRADE.sql.

-- Project Pilot initial database
-- Run this entire file in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'Homeowner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Home Project',
  description text,
  project_type text,
  status text not null default 'Getting Started',
  progress integer not null default 5 check (progress >= 0 and progress <= 100),
  next_step text not null default 'Describe the project you are planning',
  location_label text not null default 'Location not added',
  address text,
  latitude double precision,
  longitude double precision,
  jurisdiction text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.conversations enable row level security;

drop policy if exists "Users can view their profile" on public.profiles;
create policy "Users can view their profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
on public.profiles for update
using (auth.uid() = id);

drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users can view their projects" on public.projects;
create policy "Users can view their projects"
on public.projects for select
using (auth.uid() = user_id);

drop policy if exists "Users can create projects" on public.projects;
create policy "Users can create projects"
on public.projects for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their projects" on public.projects;
create policy "Users can update their projects"
on public.projects for update
using (auth.uid() = user_id);

drop policy if exists "Users can delete their projects" on public.projects;
create policy "Users can delete their projects"
on public.projects for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view their conversations" on public.conversations;
create policy "Users can view their conversations"
on public.conversations for select
using (auth.uid() = user_id);

drop policy if exists "Users can create conversation messages" on public.conversations;
create policy "Users can create conversation messages"
on public.conversations for insert
with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'Homeowner')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ============================================================================
-- BEGIN 005_pilot_chat.sql
-- ============================================================================
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

-- END 005_pilot_chat.sql

-- ============================================================================
-- BEGIN 006_build_2_workspace.sql
-- ============================================================================
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

-- END 006_build_2_workspace.sql

-- ============================================================================
-- BEGIN 007_sprint_2_2_2_3.sql
-- ============================================================================
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

-- END 007_sprint_2_2_2_3.sql

-- ============================================================================
-- BEGIN 008_sprints_2_4_2_5_beta_release.sql
-- ============================================================================
-- Project Pilot Sprints 2.4 + 2.5
-- Permit Intelligence, location mapping, and beta release support
-- Run once in Supabase SQL Editor before testing this release.

alter table public.projects add column if not exists permit_research jsonb;
alter table public.projects add column if not exists permit_checked_at timestamptz;

create index if not exists projects_permit_checked_at_idx
on public.projects(permit_checked_at);

comment on column public.projects.permit_research is
'Saved Project Pilot permit-preparation lookup result. Governing authorities remain the source of truth.';

comment on column public.projects.permit_checked_at is
'Timestamp of the most recent Permit Intelligence lookup.';

-- END 008_sprints_2_4_2_5_beta_release.sql

-- ============================================================================
-- BEGIN 009_sprint_3_0a_guided_beta.sql
-- ============================================================================
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

-- END 009_sprint_3_0a_guided_beta.sql

-- ============================================================================
-- BEGIN 010_admin_access_repair.sql
-- ============================================================================
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

-- END 010_admin_access_repair.sql

-- ============================================================================
-- BEGIN 010_revenue_launch_marketplace.sql
-- ============================================================================
-- Project Pilot Sprint 3.0B Revenue Launch
-- Best Match contractor marketplace, qualified introductions, payment records,
-- contractor verification, and production admin metrics.
-- Run this entire file once in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.contractor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null default '',
  contact_name text not null default '',
  phone text not null default '',
  website text not null default '',
  description text not null default '',
  specialties text[] not null default '{}'::text[],
  service_counties text[] not null default '{}'::text[],
  service_zip_codes text[] not null default '{}'::text[],
  minimum_project_value integer not null default 0 check (minimum_project_value >= 0),
  maximum_project_value integer check (maximum_project_value is null or maximum_project_value >= minimum_project_value),
  availability text not null default 'Contact for availability',
  license_state text not null default '',
  license_number text not null default '',
  insurance_status text not null default 'Not submitted' check (insurance_status in ('Not submitted','Submitted','Verified','Expired')),
  verification_status text not null default 'Pending' check (verification_status in ('Pending','Verified','Rejected','Suspended')),
  active boolean not null default true,
  rating numeric(3,2) not null default 0 check (rating >= 0 and rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  response_rate numeric(5,2) not null default 0 check (response_rate >= 0 and response_rate <= 100),
  average_response_minutes integer,
  completed_projects integer not null default 0 check (completed_projects >= 0),
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_lead_requests (
  id uuid primary key default gen_random_uuid(),
  homeowner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_title text not null,
  project_type text not null default 'General Project',
  project_summary text not null,
  county text not null default '',
  zip_code text not null default '',
  budget_min integer not null default 0 check (budget_min >= 0),
  budget_max integer check (budget_max is null or budget_max >= budget_min),
  desired_start text not null default '',
  status text not null default 'Open' check (status in ('Open','Matched','Hired','Closed','Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_lead_contacts (
  lead_request_id uuid primary key references public.marketplace_lead_requests(id) on delete cascade,
  homeowner_id uuid not null references auth.users(id) on delete cascade,
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null default '',
  project_address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_lead_matches (
  id uuid primary key default gen_random_uuid(),
  lead_request_id uuid not null references public.marketplace_lead_requests(id) on delete cascade,
  contractor_id uuid not null references auth.users(id) on delete cascade,
  match_score integer not null default 0 check (match_score >= 0 and match_score <= 100),
  match_reasons text[] not null default '{}'::text[],
  status text not null default 'Offered' check (status in ('Offered','Accepted','Declined','Expired','Closed')),
  fee_cents integer not null default 0 check (fee_cents >= 0),
  payment_status text not null default 'Unpaid' check (payment_status in ('Unpaid','Pending','Paid','Waived','Credited','Refunded')),
  paid_amount_cents integer not null default 0 check (paid_amount_cents >= 0),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  offered_at timestamptz not null default now(),
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_request_id, contractor_id)
);

create table if not exists public.marketplace_lead_credits (
  id uuid primary key default gen_random_uuid(),
  lead_match_id uuid not null references public.marketplace_lead_matches(id) on delete cascade,
  contractor_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text not null default '',
  status text not null default 'Requested' check (status in ('Requested','Reviewing','Approved','Denied','Issued')),
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.contractor_profiles enable row level security;
alter table public.marketplace_lead_requests enable row level security;
alter table public.marketplace_lead_contacts enable row level security;
alter table public.marketplace_lead_matches enable row level security;
alter table public.marketplace_lead_credits enable row level security;
alter table public.stripe_webhook_events enable row level security;


create or replace function public.is_marketplace_lead_owner(p_lead_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.marketplace_lead_requests r
    where r.id = p_lead_request_id and r.homeowner_id = auth.uid()
  );
$$;

create or replace function public.is_marketplace_matched_contractor(p_lead_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.marketplace_lead_matches m
    where m.lead_request_id = p_lead_request_id and m.contractor_id = auth.uid()
  );
$$;

create or replace function public.can_view_marketplace_contact(p_lead_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_marketplace_lead_owner(p_lead_request_id)
    or public.is_project_pilot_admin()
    or exists (
      select 1 from public.marketplace_lead_matches m
      where m.lead_request_id = p_lead_request_id
        and m.contractor_id = auth.uid()
        and m.status = 'Accepted'
        and m.payment_status in ('Paid','Waived')
    );
$$;

revoke all on function public.is_marketplace_lead_owner(uuid) from public;
revoke all on function public.is_marketplace_matched_contractor(uuid) from public;
revoke all on function public.can_view_marketplace_contact(uuid) from public;
grant execute on function public.is_marketplace_lead_owner(uuid) to authenticated;
grant execute on function public.is_marketplace_matched_contractor(uuid) to authenticated;
grant execute on function public.can_view_marketplace_contact(uuid) to authenticated;

-- Contractor profiles

drop policy if exists "Contractors can view own profile" on public.contractor_profiles;
create policy "Contractors can view own profile"
on public.contractor_profiles for select to authenticated
using (user_id = auth.uid() or public.is_project_pilot_admin() or (active = true and verification_status = 'Verified'));

drop policy if exists "Contractors can create own profile" on public.contractor_profiles;
create policy "Contractors can create own profile"
on public.contractor_profiles for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Contractors can update own profile" on public.contractor_profiles;
create policy "Contractors can update own profile"
on public.contractor_profiles for update to authenticated
using (user_id = auth.uid() or public.is_project_pilot_admin())
with check (user_id = auth.uid() or public.is_project_pilot_admin());

-- Lead requests contain project details but no direct contact information.

drop policy if exists "Homeowners and matched contractors can view lead requests" on public.marketplace_lead_requests;
create policy "Homeowners and matched contractors can view lead requests"
on public.marketplace_lead_requests for select to authenticated
using (
  homeowner_id = auth.uid()
  or public.is_project_pilot_admin()
  or public.is_marketplace_matched_contractor(id)
);

drop policy if exists "Homeowners can update own lead requests" on public.marketplace_lead_requests;
create policy "Homeowners can update own lead requests"
on public.marketplace_lead_requests for update to authenticated
using (homeowner_id = auth.uid() or public.is_project_pilot_admin())
with check (homeowner_id = auth.uid() or public.is_project_pilot_admin());

-- Contact details are released only after a paid or waived acceptance.

drop policy if exists "Authorized users can view lead contacts" on public.marketplace_lead_contacts;
create policy "Authorized users can view lead contacts"
on public.marketplace_lead_contacts for select to authenticated
using (public.can_view_marketplace_contact(lead_request_id));

-- Lead matches are visible to the homeowner, matched contractor, or admin.

drop policy if exists "Lead participants can view matches" on public.marketplace_lead_matches;
create policy "Lead participants can view matches"
on public.marketplace_lead_matches for select to authenticated
using (
  contractor_id = auth.uid()
  or public.is_project_pilot_admin()
  or public.is_marketplace_lead_owner(lead_request_id)
);

-- Credits/disputes

drop policy if exists "Contractors can view own lead credits" on public.marketplace_lead_credits;
create policy "Contractors can view own lead credits"
on public.marketplace_lead_credits for select to authenticated
using (contractor_id = auth.uid() or public.is_project_pilot_admin());

drop policy if exists "Contractors can request lead credits" on public.marketplace_lead_credits;
create policy "Contractors can request lead credits"
on public.marketplace_lead_credits for insert to authenticated
with check (contractor_id = auth.uid());

drop policy if exists "Admins can update lead credits" on public.marketplace_lead_credits;
create policy "Admins can update lead credits"
on public.marketplace_lead_credits for update to authenticated
using (public.is_project_pilot_admin())
with check (public.is_project_pilot_admin());

-- No authenticated-user policies are created for stripe_webhook_events.
-- Server-side service-role access is required.

create index if not exists contractor_profiles_verification_idx on public.contractor_profiles(verification_status, active);
create index if not exists contractor_profiles_specialties_gin_idx on public.contractor_profiles using gin(specialties);
create index if not exists contractor_profiles_zip_codes_gin_idx on public.contractor_profiles using gin(service_zip_codes);
create index if not exists marketplace_lead_requests_homeowner_idx on public.marketplace_lead_requests(homeowner_id, created_at desc);
create index if not exists marketplace_lead_matches_contractor_idx on public.marketplace_lead_matches(contractor_id, status, created_at desc);
create index if not exists marketplace_lead_matches_payment_idx on public.marketplace_lead_matches(payment_status, created_at desc);

create or replace function public.project_pilot_lead_fee_cents(p_budget_max integer)
returns integer
language sql
immutable
as $$
  select case
    when coalesce(p_budget_max, 0) <= 5000 then 2500
    when p_budget_max <= 15000 then 5000
    when p_budget_max <= 50000 then 10000
    else 15000
  end;
$$;

create or replace function public.calculate_marketplace_match(
  p_contractor_id uuid,
  p_project_type text,
  p_project_title text,
  p_project_description text,
  p_county text,
  p_zip_code text,
  p_budget_max integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  cp public.contractor_profiles%rowtype;
  v_project_text text := lower(trim(concat_ws(' ', p_project_type, p_project_title, p_project_description)));
  v_county text := lower(trim(coalesce(p_county, '')));
  v_zip text := trim(coalesce(p_zip_code, ''));
  v_score integer := 35;
  v_reasons text[] := array['Verified Project Pilot contractor'];
  v_specialty text;
begin
  select * into cp
  from public.contractor_profiles
  where user_id = p_contractor_id
    and active = true
    and verification_status = 'Verified';

  if not found then raise exception 'Selected contractor is no longer available'; end if;

  select specialty into v_specialty
  from unnest(cp.specialties) specialty
  where length(trim(specialty)) > 0
    and (
      v_project_text like '%' || lower(trim(specialty)) || '%'
      or lower(trim(specialty)) like '%' || lower(trim(coalesce(p_project_type, ''))) || '%'
    )
  order by length(specialty) desc
  limit 1;

  if v_specialty is not null then
    v_score := v_score + 35;
    v_reasons := array_append(v_reasons, 'Specializes in ' || v_specialty);
  elsif cardinality(cp.specialties) > 0 then
    v_reasons := array_append(v_reasons, 'Offers related project services');
  end if;

  if v_zip <> '' and v_zip = any(cp.service_zip_codes) then
    v_score := v_score + 20;
    v_reasons := array_append(v_reasons, 'Serves ZIP code ' || v_zip);
  elsif v_county <> '' and exists (
    select 1 from unnest(cp.service_counties) service_county
    where v_county like '%' || lower(trim(service_county)) || '%'
       or lower(trim(service_county)) like '%' || v_county || '%'
  ) then
    v_score := v_score + 15;
    v_reasons := array_append(v_reasons, 'Serves the project county');
  end if;

  if coalesce(p_budget_max, 0) > 0
     and p_budget_max >= cp.minimum_project_value
     and (cp.maximum_project_value is null or p_budget_max <= cp.maximum_project_value) then
    v_score := v_score + 8;
    v_reasons := array_append(v_reasons, 'Project size fits their typical range');
  end if;

  if coalesce(cp.availability, '') <> '' and lower(cp.availability) not like '%paused%' then
    v_score := v_score + 5;
    v_reasons := array_append(v_reasons, cp.availability);
  end if;

  if cp.response_rate >= 80 then
    v_score := v_score + 4;
    v_reasons := array_append(v_reasons, 'Strong response history');
  end if;

  if cp.rating >= 4 then
    v_score := v_score + 3;
    v_reasons := array_append(v_reasons, 'Strong customer rating');
  end if;

  return jsonb_build_object(
    'score', least(99, greatest(50, v_score)),
    'reasons', to_jsonb(v_reasons[1:4])
  );
end;
$$;

revoke all on function public.calculate_marketplace_match(uuid,text,text,text,text,text,integer) from public;
grant execute on function public.calculate_marketplace_match(uuid,text,text,text,text,text,integer) to authenticated;

create or replace function public.create_marketplace_lead(
  p_project_id uuid,
  p_matches jsonb,
  p_project_summary text,
  p_county text,
  p_zip_code text,
  p_budget_min integer,
  p_budget_max integer,
  p_desired_start text,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_project_address text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_project public.projects%rowtype;
  v_request_id uuid;
  v_match jsonb;
  v_contractor_id uuid;
  v_match_count integer;
  v_calculated_match jsonb;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;

  select * into v_project
  from public.projects
  where id = p_project_id and user_id = v_user_id;

  if not found then raise exception 'Project not found'; end if;
  if coalesce(length(trim(p_project_summary)), 0) < 10 then raise exception 'Add a clearer project summary'; end if;
  if coalesce(length(trim(p_contact_name)), 0) = 0 or coalesce(length(trim(p_contact_email)), 0) = 0 then
    raise exception 'Contact name and email are required';
  end if;

  select jsonb_array_length(coalesce(p_matches, '[]'::jsonb)) into v_match_count;
  if v_match_count < 1 or v_match_count > 3 then
    raise exception 'Choose between one and three contractors';
  end if;

  insert into public.marketplace_lead_requests (
    homeowner_id, project_id, project_title, project_type, project_summary,
    county, zip_code, budget_min, budget_max, desired_start, status
  ) values (
    v_user_id, v_project.id, v_project.title, coalesce(nullif(v_project.project_type, ''), 'General Project'),
    trim(p_project_summary), trim(coalesce(p_county, '')), trim(coalesce(p_zip_code, '')),
    greatest(coalesce(p_budget_min, 0), 0), p_budget_max, trim(coalesce(p_desired_start, '')), 'Matched'
  ) returning id into v_request_id;

  insert into public.marketplace_lead_contacts (
    lead_request_id, homeowner_id, contact_name, contact_email, contact_phone, project_address
  ) values (
    v_request_id, v_user_id, trim(p_contact_name), lower(trim(p_contact_email)),
    trim(coalesce(p_contact_phone, '')), trim(coalesce(p_project_address, ''))
  );

  for v_match in select * from jsonb_array_elements(p_matches)
  loop
    v_contractor_id := (v_match ->> 'contractor_id')::uuid;

    v_calculated_match := public.calculate_marketplace_match(
      v_contractor_id,
      v_project.project_type,
      v_project.title,
      v_project.description,
      p_county,
      p_zip_code,
      p_budget_max
    );

    insert into public.marketplace_lead_matches (
      lead_request_id, contractor_id, match_score, match_reasons, fee_cents
    ) values (
      v_request_id,
      v_contractor_id,
      (v_calculated_match ->> 'score')::integer,
      coalesce(array(select jsonb_array_elements_text(v_calculated_match -> 'reasons')), '{}'::text[]),
      public.project_pilot_lead_fee_cents(p_budget_max)
    )
    on conflict (lead_request_id, contractor_id) do nothing;
  end loop;

  return v_request_id;
end;
$$;

revoke all on function public.create_marketplace_lead(uuid,jsonb,text,text,text,integer,integer,text,text,text,text,text) from public;
grant execute on function public.create_marketplace_lead(uuid,jsonb,text,text,text,integer,integer,text,text,text,text,text) to authenticated;

create or replace function public.decline_marketplace_lead(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.marketplace_lead_matches
  set status = 'Declined', declined_at = now(), updated_at = now()
  where id = p_match_id and contractor_id = auth.uid() and status = 'Offered';

  if not found then raise exception 'Lead could not be declined'; end if;
end;
$$;

revoke all on function public.decline_marketplace_lead(uuid) from public;
grant execute on function public.decline_marketplace_lead(uuid) to authenticated;

create or replace function public.request_marketplace_lead_credit(p_match_id uuid, p_reason text, p_details text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_credit_id uuid;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  if coalesce(length(trim(p_reason)),0) < 3 then raise exception 'Add a reason for the lead review'; end if;

  if not exists (
    select 1 from public.marketplace_lead_matches m
    where m.id = p_match_id
      and m.contractor_id = v_user_id
      and m.status = 'Accepted'
      and m.payment_status in ('Paid','Waived')
  ) then
    raise exception 'Only accepted introductions can be reviewed';
  end if;

  if exists (
    select 1 from public.marketplace_lead_credits c
    where c.lead_match_id = p_match_id and c.contractor_id = v_user_id
      and c.status in ('Requested','Reviewing','Approved','Issued')
  ) then
    raise exception 'A lead review already exists for this introduction';
  end if;

  insert into public.marketplace_lead_credits (lead_match_id, contractor_id, reason, details, status)
  values (p_match_id, v_user_id, trim(p_reason), trim(coalesce(p_details,'')), 'Requested')
  returning id into v_credit_id;

  return v_credit_id;
end;
$$;

revoke all on function public.request_marketplace_lead_credit(uuid,text,text) from public;
grant execute on function public.request_marketplace_lead_credit(uuid,text,text) to authenticated;

create or replace function public.admin_set_lead_credit_status(p_credit_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_project_pilot_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('Requested','Reviewing','Approved','Denied','Issued') then raise exception 'Invalid lead review status'; end if;

  update public.marketplace_lead_credits
  set status = p_status, updated_at = now()
  where id = p_credit_id;
end;
$$;

revoke all on function public.admin_set_lead_credit_status(uuid,text) from public;
grant execute on function public.admin_set_lead_credit_status(uuid,text) to authenticated;

create or replace function public.admin_set_contractor_verification(p_contractor_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_project_pilot_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('Pending','Verified','Rejected','Suspended') then raise exception 'Invalid verification status'; end if;

  update public.contractor_profiles
  set verification_status = p_status, updated_at = now()
  where user_id = p_contractor_id;
end;
$$;

revoke all on function public.admin_set_contractor_verification(uuid,text) from public;
grant execute on function public.admin_set_contractor_verification(uuid,text) to authenticated;

create or replace function public.admin_set_contractor_insurance(p_contractor_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_project_pilot_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('Not submitted','Submitted','Verified','Expired') then raise exception 'Invalid insurance status'; end if;

  update public.contractor_profiles
  set insurance_status = p_status, updated_at = now()
  where user_id = p_contractor_id;
end;
$$;

revoke all on function public.admin_set_contractor_insurance(uuid,text) from public;
grant execute on function public.admin_set_contractor_insurance(uuid,text) to authenticated;

create or replace function public.admin_marketplace_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_project_pilot_admin() then raise exception 'Admin access required'; end if;

  select jsonb_build_object(
    'contractor_profiles', (select count(*) from public.contractor_profiles),
    'verified_contractors', (select count(*) from public.contractor_profiles where verification_status = 'Verified' and active = true),
    'pending_contractors', (select count(*) from public.contractor_profiles where verification_status = 'Pending'),
    'lead_requests', (select count(*) from public.marketplace_lead_requests),
    'open_leads', (select count(*) from public.marketplace_lead_requests where status in ('Open','Matched')),
    'lead_offers', (select count(*) from public.marketplace_lead_matches),
    'accepted_leads', (select count(*) from public.marketplace_lead_matches where status = 'Accepted'),
    'paid_leads', (select count(*) from public.marketplace_lead_matches where payment_status = 'Paid'),
    'actual_revenue_cents', (select coalesce(sum(paid_amount_cents),0) from public.marketplace_lead_matches where payment_status = 'Paid'),
    'pending_fee_value_cents', (select coalesce(sum(fee_cents),0) from public.marketplace_lead_matches where status = 'Offered' and payment_status = 'Unpaid'),
    'credit_requests', (select count(*) from public.marketplace_lead_credits where status in ('Requested','Reviewing'))
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_marketplace_summary() from public;
grant execute on function public.admin_marketplace_summary() to authenticated;

comment on table public.contractor_profiles is 'Verified contractor partner profiles used for unbiased Best Match recommendations.';
comment on table public.marketplace_lead_matches is 'Qualified introduction offers. Payment does not affect Best Match ranking.';

-- Repair profile rows and ensure one administrator exists for the owner account.
insert into public.profiles (id, full_name, role, created_at, updated_at)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email,''), '@', 1), 'Project Pilot User'),
  coalesce(u.raw_user_meta_data ->> 'role', 'Homeowner'),
  coalesce(u.created_at, now()),
  now()
from auth.users u
on conflict (id) do nothing;

do $$
declare
  v_admin_exists boolean;
  v_owner_id uuid;
begin
  select exists(select 1 from public.profiles where is_admin = true) into v_admin_exists;
  if not v_admin_exists then
    select id into v_owner_id from auth.users order by created_at asc limit 1;
    if v_owner_id is not null then
      update public.profiles set is_admin = true, updated_at = now() where id = v_owner_id;
    end if;
  end if;
end $$;

-- Protect contractor private details from marketplace browsing.
-- Homeowners use a safe public view; contractors and admins use security-definer RPCs.
drop view if exists public.contractor_public_profiles;
create view public.contractor_public_profiles
with (security_barrier = true)
as
select
  user_id,
  business_name,
  description,
  specialties,
  service_counties,
  service_zip_codes,
  minimum_project_value,
  maximum_project_value,
  availability,
  verification_status,
  active,
  rating,
  review_count,
  response_rate,
  average_response_minutes,
  completed_projects,
  created_at,
  updated_at
from public.contractor_profiles
where active = true and verification_status = 'Verified';

grant select on public.contractor_public_profiles to authenticated, anon;


create or replace function public.list_public_contractors()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', cp.user_id,
        'business_name', cp.business_name,
        'description', cp.description,
        'specialties', cp.specialties,
        'service_counties', cp.service_counties,
        'service_zip_codes', cp.service_zip_codes,
        'minimum_project_value', cp.minimum_project_value,
        'maximum_project_value', cp.maximum_project_value,
        'availability', cp.availability,
        'verification_status', cp.verification_status,
        'active', cp.active,
        'rating', cp.rating,
        'review_count', cp.review_count,
        'response_rate', cp.response_rate,
        'average_response_minutes', cp.average_response_minutes,
        'completed_projects', cp.completed_projects,
        'created_at', cp.created_at,
        'updated_at', cp.updated_at
      ) order by cp.rating desc, cp.completed_projects desc, cp.updated_at desc
    ),
    '[]'::jsonb
  )
  from public.contractor_profiles cp
  where cp.active = true and cp.verification_status = 'Verified';
$$;

revoke all on function public.list_public_contractors() from public;
grant execute on function public.list_public_contractors() to authenticated, anon;

create or replace function public.get_my_marketplace_requests()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'project_id', r.project_id,
        'project_title', r.project_title,
        'project_type', r.project_type,
        'project_summary', r.project_summary,
        'county', r.county,
        'zip_code', r.zip_code,
        'budget_min', r.budget_min,
        'budget_max', r.budget_max,
        'desired_start', r.desired_start,
        'status', r.status,
        'created_at', r.created_at,
        'matches', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', m.id,
              'contractor_id', m.contractor_id,
              'business_name', cp.business_name,
              'match_score', m.match_score,
              'status', m.status,
              'payment_status', m.payment_status,
              'accepted_at', m.accepted_at
            ) order by m.match_score desc, m.offered_at asc
          )
          from public.marketplace_lead_matches m
          left join public.contractor_profiles cp on cp.user_id = m.contractor_id
          where m.lead_request_id = r.id
        ), '[]'::jsonb)
      ) order by r.created_at desc
    ),
    '[]'::jsonb
  )
  from public.marketplace_lead_requests r
  where r.homeowner_id = auth.uid();
$$;

revoke all on function public.get_my_marketplace_requests() from public;
grant execute on function public.get_my_marketplace_requests() to authenticated;

create or replace function public.get_my_contractor_profile()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(cp)
  from public.contractor_profiles cp
  where cp.user_id = auth.uid();
$$;

revoke all on function public.get_my_contractor_profile() from public;
grant execute on function public.get_my_contractor_profile() to authenticated;

create or replace function public.save_my_contractor_profile(p_profile jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  if coalesce(length(trim(p_profile ->> 'business_name')),0) = 0 then raise exception 'Business name is required'; end if;
  if coalesce(length(trim(p_profile ->> 'phone')),0) = 0 then raise exception 'Phone number is required'; end if;
  if coalesce(jsonb_array_length(coalesce(p_profile -> 'specialties','[]'::jsonb)),0) = 0 then raise exception 'Choose at least one specialty'; end if;
  if coalesce(jsonb_array_length(coalesce(p_profile -> 'service_counties','[]'::jsonb)),0) = 0 then raise exception 'Choose at least one service county'; end if;
  if nullif(p_profile ->> 'terms_accepted_at','') is null then raise exception 'Contractor partner terms must be accepted'; end if;

  insert into public.contractor_profiles as current_profile (
    user_id, business_name, contact_name, phone, website, description,
    specialties, service_counties, service_zip_codes,
    minimum_project_value, maximum_project_value, availability,
    license_state, license_number, insurance_status, active, terms_accepted_at, updated_at
  ) values (
    v_user_id,
    trim(p_profile ->> 'business_name'),
    trim(coalesce(p_profile ->> 'contact_name','')),
    trim(p_profile ->> 'phone'),
    trim(coalesce(p_profile ->> 'website','')),
    trim(coalesce(p_profile ->> 'description','')),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_profile -> 'specialties','[]'::jsonb))), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_profile -> 'service_counties','[]'::jsonb))), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_profile -> 'service_zip_codes','[]'::jsonb))), '{}'::text[]),
    greatest(coalesce((p_profile ->> 'minimum_project_value')::integer,0),0),
    nullif(p_profile ->> 'maximum_project_value','')::integer,
    trim(coalesce(p_profile ->> 'availability','Contact for availability')),
    upper(trim(coalesce(p_profile ->> 'license_state',''))),
    trim(coalesce(p_profile ->> 'license_number','')),
    case when p_profile ->> 'insurance_status' in ('Not submitted','Submitted') then p_profile ->> 'insurance_status' else 'Not submitted' end,
    coalesce((p_profile ->> 'active')::boolean,true),
    (p_profile ->> 'terms_accepted_at')::timestamptz,
    now()
  )
  on conflict (user_id) do update set
    business_name = excluded.business_name,
    contact_name = excluded.contact_name,
    phone = excluded.phone,
    website = excluded.website,
    description = excluded.description,
    specialties = excluded.specialties,
    service_counties = excluded.service_counties,
    service_zip_codes = excluded.service_zip_codes,
    minimum_project_value = excluded.minimum_project_value,
    maximum_project_value = excluded.maximum_project_value,
    availability = excluded.availability,
    license_state = excluded.license_state,
    license_number = excluded.license_number,
    insurance_status = case
      when p_profile ->> 'insurance_status' in ('Not submitted','Submitted') then excluded.insurance_status
      else current_profile.insurance_status
    end,
    verification_status = case
      when current_profile.license_state is distinct from excluded.license_state
        or current_profile.license_number is distinct from excluded.license_number
        or (p_profile ->> 'insurance_status' in ('Not submitted','Submitted') and current_profile.insurance_status is distinct from excluded.insurance_status)
      then 'Pending'
      else current_profile.verification_status
    end,
    active = excluded.active,
    terms_accepted_at = excluded.terms_accepted_at,
    updated_at = now();

  update public.profiles set role = 'Contractor', updated_at = now() where id = v_user_id;
  select to_jsonb(cp) into v_result from public.contractor_profiles cp where cp.user_id = v_user_id;
  return v_result;
end;
$$;

revoke all on function public.save_my_contractor_profile(jsonb) from public;
grant execute on function public.save_my_contractor_profile(jsonb) to authenticated;

create or replace function public.admin_contractor_directory()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_project_pilot_admin() then raise exception 'Admin access required'; end if;
  select coalesce(jsonb_agg(to_jsonb(cp) order by cp.created_at desc), '[]'::jsonb)
  into result from public.contractor_profiles cp;
  return result;
end;
$$;

revoke all on function public.admin_contractor_directory() from public;
grant execute on function public.admin_contractor_directory() to authenticated;

-- Explicit API privileges. Row-level security still determines which rows each user can access.
grant select on public.marketplace_lead_requests to authenticated;
grant select on public.marketplace_lead_contacts to authenticated;
grant select on public.marketplace_lead_matches to authenticated;
grant select on public.marketplace_lead_credits to authenticated;
revoke insert, update, delete on public.marketplace_lead_requests from authenticated;
revoke insert, update, delete on public.marketplace_lead_matches from authenticated;
revoke insert, update, delete on public.marketplace_lead_contacts from authenticated;
revoke insert, update, delete on public.marketplace_lead_credits from authenticated;
grant select on public.contractor_public_profiles to authenticated, anon;

-- Direct contractor-table access is blocked. Safe reads and writes use the RPCs above.
revoke all on public.contractor_profiles from authenticated;

-- END 010_revenue_launch_marketplace.sql

-- ============================================================================
-- BEGIN 011_project_vision_3_0c.sql
-- ============================================================================
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

-- END 011_project_vision_3_0c.sql

-- ============================================================================
-- BEGIN 012_permit_autopilot_3_1.sql
-- ============================================================================
-- Project Pilot Sprint 3.1
-- Permit Autopilot: guided permit preparation, authorization, submission tracking,
-- correction assistance, inspection tracking, and permit-case history.
-- Run in Supabase SQL Editor after migrations 010 and 011.

create extension if not exists "pgcrypto";

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

create table if not exists public.permit_cases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_type text not null default 'general',
  jurisdiction text not null default '',
  jurisdiction_confidence text not null default 'review' check (jurisdiction_confidence in ('high','medium','low','review')),
  application_url text not null default '',
  application_label text not null default '',
  submission_method text not null default 'Guided submission',
  status text not null default 'draft' check (status in (
    'draft','collecting','ready_for_review','authorized','concierge_requested',
    'submitted','correction_required','approved','inspection','closed','cancelled'
  )),
  readiness_score integer not null default 0 check (readiness_score between 0 and 100),
  answers jsonb not null default '{}'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  document_links jsonb not null default '{}'::jsonb,
  packet_snapshot jsonb not null default '{}'::jsonb,
  corrections jsonb not null default '[]'::jsonb,
  inspections jsonb not null default '[]'::jsonb,
  activity jsonb not null default '[]'::jsonb,
  authorization_name text not null default '',
  authorization_confirmed_at timestamptz,
  concierge_requested_at timestamptz,
  application_reference text not null default '',
  government_fee_amount numeric(12,2) check (government_fee_amount is null or government_fee_amount >= 0),
  government_fee_status text not null default 'unknown' check (government_fee_status in ('unknown','quoted','paid','waived')),
  government_fee_paid_at timestamptz,
  next_action text not null default '',
  next_action_due date,
  submitted_at timestamptz,
  approved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.permit_cases enable row level security;

drop policy if exists "Project owners can view permit cases" on public.permit_cases;
create policy "Project owners can view permit cases"
on public.permit_cases for select to authenticated
using ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin());

drop policy if exists "Project owners can create permit cases" on public.permit_cases;
create policy "Project owners can create permit cases"
on public.permit_cases for insert to authenticated
with check ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin());

drop policy if exists "Project owners can update permit cases" on public.permit_cases;
create policy "Project owners can update permit cases"
on public.permit_cases for update to authenticated
using ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin())
with check ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin());

drop policy if exists "Project owners can delete permit cases" on public.permit_cases;
create policy "Project owners can delete permit cases"
on public.permit_cases for delete to authenticated
using ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin());

grant select, insert, update, delete on public.permit_cases to authenticated;

create index if not exists permit_cases_user_status_idx
  on public.permit_cases(user_id, status, updated_at desc);
create index if not exists permit_cases_project_idx
  on public.permit_cases(project_id);

create or replace function public.touch_permit_case_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists permit_cases_touch_updated_at on public.permit_cases;
create trigger permit_cases_touch_updated_at
before update on public.permit_cases
for each row execute function public.touch_permit_case_updated_at();

comment on table public.permit_cases is
'Homeowner-controlled permit preparation cases. Stores application answers, linked project documents, authorization, guided-submission status, correction analyses, inspections, and activity history. Does not represent government approval or unrestricted authority to file on behalf of a user.';

-- END 012_permit_autopilot_3_1.sql

-- ============================================================================
-- BEGIN 013_permit_concierge_3_1c.sql
-- ============================================================================
-- Project Pilot Sprint 3.1C
-- Permit Concierge operating workflow: homeowner intake, human review queue,
-- shared tasks, two-way messages, authorization scope, and service status.
-- Run after migration 012.

create extension if not exists "pgcrypto";

create table if not exists public.permit_concierge_requests (
  id uuid primary key default gen_random_uuid(),
  permit_case_id uuid not null unique references public.permit_cases(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested' check (status in (
    'requested','intake_review','preparing','waiting_on_homeowner','ready_for_submission',
    'filing','submitted','corrections','approved','closed','cancelled'
  )),
  requested_services jsonb not null default '[]'::jsonb,
  preferred_contact text not null default 'email' check (preferred_contact in ('email','phone','either')),
  contact_email text not null default '',
  contact_phone text not null default '',
  best_contact_time text not null default '',
  homeowner_notes text not null default '',
  authorization_scope text not null default 'review_prepare_coordinate',
  authorization_confirmed_at timestamptz,
  terms_version text not null default '3.1C',
  assigned_to text not null default '',
  concierge_summary text not null default '',
  internal_notes text not null default '',
  last_homeowner_message_at timestamptz,
  last_concierge_message_at timestamptz,
  requested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.permit_concierge_tasks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.permit_concierge_requests(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_to text not null check (assigned_to in ('concierge','homeowner')),
  title text not null,
  plain_language text not null default '',
  status text not null default 'pending' check (status in ('pending','in_progress','blocked','completed','cancelled')),
  due_at timestamptz,
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.permit_concierge_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.permit_concierge_requests(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('homeowner','concierge','system')),
  sender_user_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  visible_to_homeowner boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.permit_concierge_requests enable row level security;
alter table public.permit_concierge_tasks enable row level security;
alter table public.permit_concierge_messages enable row level security;

-- Requests: homeowners may read their own request; administrators may operate all requests.
drop policy if exists "Homeowners can view own concierge requests" on public.permit_concierge_requests;
create policy "Homeowners can view own concierge requests"
on public.permit_concierge_requests for select to authenticated
using ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin());

drop policy if exists "Admins can manage concierge requests" on public.permit_concierge_requests;
create policy "Admins can manage concierge requests"
on public.permit_concierge_requests for all to authenticated
using (public.is_project_pilot_admin())
with check (public.is_project_pilot_admin());

-- Tasks: homeowners can read tasks and complete only tasks assigned to them.
drop policy if exists "Homeowners can view own concierge tasks" on public.permit_concierge_tasks;
create policy "Homeowners can view own concierge tasks"
on public.permit_concierge_tasks for select to authenticated
using ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin());

drop policy if exists "Homeowners can update assigned concierge tasks" on public.permit_concierge_tasks;
create policy "Homeowners can update assigned concierge tasks"
on public.permit_concierge_tasks for update to authenticated
using (user_id = auth.uid() and public.owns_project(project_id) and assigned_to = 'homeowner')
with check (user_id = auth.uid() and public.owns_project(project_id) and assigned_to = 'homeowner');

drop policy if exists "Admins can manage concierge tasks" on public.permit_concierge_tasks;
create policy "Admins can manage concierge tasks"
on public.permit_concierge_tasks for all to authenticated
using (public.is_project_pilot_admin())
with check (public.is_project_pilot_admin());

-- Messages: homeowners can read visible messages and send messages as themselves.
drop policy if exists "Homeowners can view own concierge messages" on public.permit_concierge_messages;
create policy "Homeowners can view own concierge messages"
on public.permit_concierge_messages for select to authenticated
using (
  (user_id = auth.uid() and public.owns_project(project_id) and visible_to_homeowner = true)
  or public.is_project_pilot_admin()
);

drop policy if exists "Homeowners can send concierge messages" on public.permit_concierge_messages;
create policy "Homeowners can send concierge messages"
on public.permit_concierge_messages for insert to authenticated
with check (
  user_id = auth.uid()
  and sender_role = 'homeowner'
  and sender_user_id = auth.uid()
  and visible_to_homeowner = true
  and public.owns_project(project_id)
);

drop policy if exists "Admins can manage concierge messages" on public.permit_concierge_messages;
create policy "Admins can manage concierge messages"
on public.permit_concierge_messages for all to authenticated
using (public.is_project_pilot_admin())
with check (public.is_project_pilot_admin());

grant select, insert, update, delete on public.permit_concierge_requests to authenticated;
grant select, insert, update, delete on public.permit_concierge_tasks to authenticated;
grant select, insert, update, delete on public.permit_concierge_messages to authenticated;

create index if not exists permit_concierge_requests_status_idx
  on public.permit_concierge_requests(status, updated_at desc);
create index if not exists permit_concierge_requests_user_idx
  on public.permit_concierge_requests(user_id, updated_at desc);
create index if not exists permit_concierge_tasks_request_idx
  on public.permit_concierge_tasks(request_id, assigned_to, status, sort_order);
create index if not exists permit_concierge_messages_request_idx
  on public.permit_concierge_messages(request_id, created_at);

create or replace function public.touch_permit_concierge_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists permit_concierge_requests_touch on public.permit_concierge_requests;
create trigger permit_concierge_requests_touch
before update on public.permit_concierge_requests
for each row execute function public.touch_permit_concierge_updated_at();

drop trigger if exists permit_concierge_tasks_touch on public.permit_concierge_tasks;
create trigger permit_concierge_tasks_touch
before update on public.permit_concierge_tasks
for each row execute function public.touch_permit_concierge_updated_at();

comment on table public.permit_concierge_requests is
'Human-operated Permit Concierge queue. Project Pilot staff may review, prepare, coordinate, and—only where allowed and authorized—assist with filing. Government identity, signature, payment, professional seal, and portal requirements remain controlling.';
comment on table public.permit_concierge_tasks is
'Shared permit tasks divided between the Project Pilot concierge and the homeowner.';
comment on table public.permit_concierge_messages is
'Two-way homeowner and Permit Concierge communication attached to a permit case.';

-- END 013_permit_concierge_3_1c.sql

-- ============================================================================
-- BEGIN 014_launch_candidate_3_2.sql
-- ============================================================================
-- Project Pilot Sprint 3.2 Launch Candidate
-- Adds authenticated launch support tickets and admin operating policies.
-- Safe to run after migrations 012 and 013. Idempotent.

create extension if not exists "pgcrypto";

create table if not exists public.launch_support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  user_email text not null default '',
  category text not null default 'General' check (category in ('General','Account','Project Assistant','Project Vision','Permit Autopilot','Permit Concierge','Contractors','Billing','Bug')),
  subject text not null check (char_length(subject) between 3 and 160),
  message text not null check (char_length(message) between 10 and 5000),
  page_path text not null default '',
  status text not null default 'New' check (status in ('New','Reviewing','Waiting on user','Resolved','Closed')),
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.launch_support_requests enable row level security;

drop policy if exists "Users can create launch support requests" on public.launch_support_requests;
create policy "Users can create launch support requests"
on public.launch_support_requests for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can view own launch support requests" on public.launch_support_requests;
create policy "Users can view own launch support requests"
on public.launch_support_requests for select to authenticated
using (user_id = auth.uid() or public.is_project_pilot_admin());

drop policy if exists "Admins can update launch support requests" on public.launch_support_requests;
create policy "Admins can update launch support requests"
on public.launch_support_requests for update to authenticated
using (public.is_project_pilot_admin())
with check (public.is_project_pilot_admin());

drop policy if exists "Admins can delete launch support requests" on public.launch_support_requests;
create policy "Admins can delete launch support requests"
on public.launch_support_requests for delete to authenticated
using (public.is_project_pilot_admin());

create index if not exists launch_support_requests_user_idx
  on public.launch_support_requests(user_id, created_at desc);
create index if not exists launch_support_requests_status_idx
  on public.launch_support_requests(status, created_at desc);

comment on table public.launch_support_requests is 'Authenticated homeowner and partner support requests for the Project Pilot launch operating queue.';

-- END 014_launch_candidate_3_2.sql

-- ============================================================================
-- BEGIN 015_permit_application_builder_3_3.sql
-- ============================================================================
-- Project Pilot Sprint 3.3
-- Permit Application Builder: reviewed application packets, portal-entry progress,
-- export history, and applicant review audit fields.
-- Run after migrations 012, 013, and 014.

create extension if not exists "pgcrypto";

alter table public.permit_cases
  add column if not exists application_packet_version text not null default '',
  add column if not exists application_packet_generated_at timestamptz,
  add column if not exists application_packet_status text not null default 'not_started',
  add column if not exists portal_field_progress jsonb not null default '{}'::jsonb,
  add column if not exists applicant_review_name text not null default '',
  add column if not exists applicant_review_confirmed_at timestamptz;

do $$
begin
  alter table public.permit_cases
    add constraint permit_cases_application_packet_status_check
    check (application_packet_status in ('not_started','draft','ready','exported','portal_entry','submitted'));
exception
  when duplicate_object then null;
end $$;

create table if not exists public.permit_application_exports (
  id uuid primary key default gen_random_uuid(),
  permit_case_id uuid not null references public.permit_cases(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  export_type text not null default 'packet_snapshot' check (export_type in ('packet_snapshot','printable_html','portal_field_map','structured_json')),
  packet_version text not null default '',
  packet_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.permit_application_exports enable row level security;

drop policy if exists "Project owners can view permit application exports" on public.permit_application_exports;
create policy "Project owners can view permit application exports"
on public.permit_application_exports for select to authenticated
using ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin());

drop policy if exists "Project owners can create permit application exports" on public.permit_application_exports;
create policy "Project owners can create permit application exports"
on public.permit_application_exports for insert to authenticated
with check ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin());

drop policy if exists "Project owners can delete permit application exports" on public.permit_application_exports;
create policy "Project owners can delete permit application exports"
on public.permit_application_exports for delete to authenticated
using ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin());

grant select, insert, delete on public.permit_application_exports to authenticated;

create index if not exists permit_application_exports_case_idx
  on public.permit_application_exports(permit_case_id, created_at desc);
create index if not exists permit_application_exports_user_idx
  on public.permit_application_exports(user_id, created_at desc);

comment on table public.permit_application_exports is
'Immutable snapshots of homeowner-reviewed permit application packets generated by Project Pilot. Official submission, signatures, identity verification, professional seals, and government payments remain controlled by the applicant, authorized professional, or governing authority.';

-- END 015_permit_application_builder_3_3.sql

-- ============================================================================
-- BEGIN 016_full_service_permit_operations_3_6.sql
-- ============================================================================
-- Project Pilot Sprint 3.6
-- Full-Service Permit Operations
-- Run AFTER migrations 012, 013, 014, and 015.
--
-- Purpose:
-- Turn Permit Concierge into an auditable full-service permit operations workflow:
-- intake -> jurisdiction verification -> preparation -> allowed filing assistance/submission
-- -> corrections -> inspections -> closeout.
--
-- IMPORTANT: This schema records authorization and operational work. It does not override
-- government rules that require the applicant's own login, signature, identity verification,
-- professional seal, licensed trade credential, notarization, or payment.

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Expand Permit Concierge request records for full-service operations.
-- -----------------------------------------------------------------------------
alter table public.permit_concierge_requests
  add column if not exists case_number text,
  add column if not exists service_mode text not null default 'full_service',
  add column if not exists current_phase text not null default 'intake',
  add column if not exists agency_name text not null default '',
  add column if not exists agency_url text not null default '',
  add column if not exists filing_mode text not null default 'unknown',
  add column if not exists requirement_flags jsonb not null default '{"applicant_login":"unknown","signature":"unknown","identity_verification":"unknown","government_payment":"unknown","professional_seal":"unknown"}'::jsonb,
  add column if not exists customer_action_reason text not null default '',
  add column if not exists last_government_update_at timestamptz,
  add column if not exists service_started_at timestamptz,
  add column if not exists service_completed_at timestamptz;

create unique index if not exists permit_concierge_requests_case_number_uidx
  on public.permit_concierge_requests(case_number)
  where case_number is not null and case_number <> '';

-- Expand the existing status check safely.
do $$
begin
  alter table public.permit_concierge_requests
    drop constraint if exists permit_concierge_requests_status_check;

  alter table public.permit_concierge_requests
    add constraint permit_concierge_requests_status_check
    check (status in (
      'requested','intake_review','preparing','waiting_on_homeowner','ready_for_submission',
      'filing','submitted','corrections','approved','inspections','closeout','closed','cancelled'
    ));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.permit_concierge_requests
    add constraint permit_concierge_requests_service_mode_check
    check (service_mode in ('full_service','guided'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.permit_concierge_requests
    add constraint permit_concierge_requests_filing_mode_check
    check (filing_mode in ('unknown','coordinator_allowed','applicant_required','mixed'));
exception
  when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Immutable customer authorization record for the full-service workflow.
-- -----------------------------------------------------------------------------
create table if not exists public.permit_service_authorizations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.permit_concierge_requests(id) on delete cascade,
  permit_case_id uuid not null references public.permit_cases(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  authorization_version text not null default '3.6',
  signer_name text not null,
  signer_email text not null,
  scopes jsonb not null default '{}'::jsonb,
  acknowledgements jsonb not null default '{}'::jsonb,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revocation_note text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists permit_service_authorizations_request_version_uidx
  on public.permit_service_authorizations(request_id, authorization_version);

-- -----------------------------------------------------------------------------
-- Homeowner-visible + internal case timeline.
-- -----------------------------------------------------------------------------
create table if not exists public.permit_concierge_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.permit_concierge_requests(id) on delete cascade,
  permit_case_id uuid not null references public.permit_cases(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null default 'update',
  title text not null,
  detail text not null default '',
  source text not null default 'project_pilot',
  visible_to_homeowner boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Structured correction rounds.
-- -----------------------------------------------------------------------------
create table if not exists public.permit_concierge_corrections (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.permit_concierge_requests(id) on delete cascade,
  permit_case_id uuid not null references public.permit_cases(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  round_number integer not null default 1,
  agency_reference text not null default '',
  notice_text text not null default '',
  plain_language_summary text not null default '',
  response_plan text not null default '',
  status text not null default 'received' check (status in ('received','reviewing','waiting_on_homeowner','response_ready','resubmitted','resolved')),
  due_at timestamptz,
  received_at timestamptz not null default now(),
  resubmitted_at timestamptz,
  resolved_at timestamptz,
  visible_to_homeowner boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Structured inspection and closeout tracking.
-- -----------------------------------------------------------------------------
create table if not exists public.permit_concierge_inspections (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.permit_concierge_requests(id) on delete cascade,
  permit_case_id uuid not null references public.permit_cases(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  inspection_type text not null,
  agency_name text not null default '',
  status text not null default 'not_ready' check (status in ('not_ready','ready_to_schedule','scheduled','passed','failed','cancelled','not_required')),
  scheduled_at timestamptz,
  result_notes text not null default '',
  homeowner_preparation text not null default '',
  visible_to_homeowner boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Jurisdiction playbooks: admin-only operating knowledge.
-- A playbook must be verified before staff rely on it for a live filing decision.
-- -----------------------------------------------------------------------------
create table if not exists public.permit_jurisdiction_playbooks (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_key text not null,
  jurisdiction_label text not null,
  project_type text not null default 'general',
  status text not null default 'draft' check (status in ('draft','verified','paused')),
  agency_name text not null default '',
  portal_url text not null default '',
  submission_channel text not null default '',
  filing_mode text not null default 'unknown' check (filing_mode in ('unknown','coordinator_allowed','applicant_required','mixed')),
  requirements jsonb not null default '{}'::jsonb,
  source_urls jsonb not null default '[]'::jsonb,
  operating_notes text not null default '',
  verified_at timestamptz,
  verified_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (jurisdiction_key, project_type)
);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.permit_service_authorizations enable row level security;
alter table public.permit_concierge_events enable row level security;
alter table public.permit_concierge_corrections enable row level security;
alter table public.permit_concierge_inspections enable row level security;
alter table public.permit_jurisdiction_playbooks enable row level security;

-- Authorization: owner can read; admin can operate. Creation is done by the server route.
drop policy if exists "Owners can view permit service authorizations" on public.permit_service_authorizations;
create policy "Owners can view permit service authorizations"
on public.permit_service_authorizations for select to authenticated
using ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin());

drop policy if exists "Admins can manage permit service authorizations" on public.permit_service_authorizations;
create policy "Admins can manage permit service authorizations"
on public.permit_service_authorizations for all to authenticated
using (public.is_project_pilot_admin())
with check (public.is_project_pilot_admin());

-- Events: owners see only customer-visible events; admins see/manage all.
drop policy if exists "Owners can view permit concierge events" on public.permit_concierge_events;
create policy "Owners can view permit concierge events"
on public.permit_concierge_events for select to authenticated
using (((user_id = auth.uid() and public.owns_project(project_id)) and visible_to_homeowner = true) or public.is_project_pilot_admin());

drop policy if exists "Admins can manage permit concierge events" on public.permit_concierge_events;
create policy "Admins can manage permit concierge events"
on public.permit_concierge_events for all to authenticated
using (public.is_project_pilot_admin())
with check (public.is_project_pilot_admin());

-- Corrections.
drop policy if exists "Owners can view permit concierge corrections" on public.permit_concierge_corrections;
create policy "Owners can view permit concierge corrections"
on public.permit_concierge_corrections for select to authenticated
using (((user_id = auth.uid() and public.owns_project(project_id)) and visible_to_homeowner = true) or public.is_project_pilot_admin());

drop policy if exists "Admins can manage permit concierge corrections" on public.permit_concierge_corrections;
create policy "Admins can manage permit concierge corrections"
on public.permit_concierge_corrections for all to authenticated
using (public.is_project_pilot_admin())
with check (public.is_project_pilot_admin());

-- Inspections.
drop policy if exists "Owners can view permit concierge inspections" on public.permit_concierge_inspections;
create policy "Owners can view permit concierge inspections"
on public.permit_concierge_inspections for select to authenticated
using (((user_id = auth.uid() and public.owns_project(project_id)) and visible_to_homeowner = true) or public.is_project_pilot_admin());

drop policy if exists "Admins can manage permit concierge inspections" on public.permit_concierge_inspections;
create policy "Admins can manage permit concierge inspections"
on public.permit_concierge_inspections for all to authenticated
using (public.is_project_pilot_admin())
with check (public.is_project_pilot_admin());

-- Playbooks are intentionally admin-only.
drop policy if exists "Admins can manage permit jurisdiction playbooks" on public.permit_jurisdiction_playbooks;
create policy "Admins can manage permit jurisdiction playbooks"
on public.permit_jurisdiction_playbooks for all to authenticated
using (public.is_project_pilot_admin())
with check (public.is_project_pilot_admin());

-- Grants. RLS remains the controlling layer for authenticated users.
grant select on public.permit_service_authorizations to authenticated;
grant select, insert, update, delete on public.permit_concierge_events to authenticated;
grant select, insert, update, delete on public.permit_concierge_corrections to authenticated;
grant select, insert, update, delete on public.permit_concierge_inspections to authenticated;
grant select, insert, update, delete on public.permit_jurisdiction_playbooks to authenticated;

-- Indexes.
create index if not exists permit_service_authorizations_request_idx
  on public.permit_service_authorizations(request_id, accepted_at desc);
create index if not exists permit_concierge_events_request_idx
  on public.permit_concierge_events(request_id, created_at desc);
create index if not exists permit_concierge_corrections_request_idx
  on public.permit_concierge_corrections(request_id, status, created_at desc);
create index if not exists permit_concierge_inspections_request_idx
  on public.permit_concierge_inspections(request_id, status, scheduled_at);
create index if not exists permit_jurisdiction_playbooks_lookup_idx
  on public.permit_jurisdiction_playbooks(jurisdiction_key, project_type, status);

-- Touch updated_at helpers.
create or replace function public.touch_permit_operations_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists permit_concierge_corrections_touch on public.permit_concierge_corrections;
create trigger permit_concierge_corrections_touch
before update on public.permit_concierge_corrections
for each row execute function public.touch_permit_operations_updated_at();

drop trigger if exists permit_concierge_inspections_touch on public.permit_concierge_inspections;
create trigger permit_concierge_inspections_touch
before update on public.permit_concierge_inspections
for each row execute function public.touch_permit_operations_updated_at();

drop trigger if exists permit_jurisdiction_playbooks_touch on public.permit_jurisdiction_playbooks;
create trigger permit_jurisdiction_playbooks_touch
before update on public.permit_jurisdiction_playbooks
for each row execute function public.touch_permit_operations_updated_at();

comment on table public.permit_service_authorizations is
'Immutable customer authorization record for Project Pilot full-service permit coordination. It records allowed administrative scopes and explicit applicant-controlled boundaries.';
comment on table public.permit_concierge_events is
'Auditable full-service permit timeline. Homeowners see only visible_to_homeowner events.';
comment on table public.permit_concierge_corrections is
'Structured government correction rounds and Project Pilot response workflow.';
comment on table public.permit_concierge_inspections is
'Structured inspection scheduling, preparation, result, and closeout tracking.';
comment on table public.permit_jurisdiction_playbooks is
'Admin-only verified operating playbooks for jurisdiction/project-type permit handling. Draft records must not be treated as verified filing authority.';

-- END 016_full_service_permit_operations_3_6.sql

-- ============================================================================
-- BEGIN 017_revenue_completion_4_0.sql
-- ============================================================================
-- Project Pilot 4.0 Launch Revenue
-- Adds paid Full-Service Permit Concierge orders while preserving free planning
-- and the existing contractor-introduction marketplace.
-- Run after migrations 015 and 016.

create extension if not exists "pgcrypto";

alter table public.permit_concierge_requests
  add column if not exists payment_status text not null default 'waived',
  add column if not exists service_fee_cents integer not null default 0,
  add column if not exists revenue_order_id uuid,
  add column if not exists paid_at timestamptz;

do $$
begin
  alter table public.permit_concierge_requests
    add constraint permit_concierge_requests_payment_status_check
    check (payment_status in ('pending','paid','waived','refunded','cancelled'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.permit_concierge_requests
    add constraint permit_concierge_requests_service_fee_nonnegative_check
    check (service_fee_cents >= 0);
exception
  when duplicate_object then null;
end $$;

create table if not exists public.permit_service_orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.permit_concierge_requests(id) on delete cascade,
  permit_case_id uuid not null references public.permit_cases(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  service_code text not null default 'full_service_permit_coordination',
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  status text not null default 'pending' check (status in ('pending','paid','refunded','cancelled','waived')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  refunded_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists permit_service_orders_checkout_uidx
  on public.permit_service_orders(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create index if not exists permit_service_orders_request_idx
  on public.permit_service_orders(request_id, created_at desc);
create index if not exists permit_service_orders_user_idx
  on public.permit_service_orders(user_id, created_at desc);
create index if not exists permit_service_orders_status_idx
  on public.permit_service_orders(status, created_at desc);

-- Add the relationship after the table exists. Existing beta/full-service requests
-- remain "waived" so prior cases are never unexpectedly charged.
do $$
begin
  alter table public.permit_concierge_requests
    add constraint permit_concierge_requests_revenue_order_fk
    foreign key (revenue_order_id) references public.permit_service_orders(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

alter table public.permit_service_orders enable row level security;

drop policy if exists "Owners can view permit service orders" on public.permit_service_orders;
create policy "Owners can view permit service orders"
on public.permit_service_orders for select to authenticated
using ((user_id = auth.uid() and public.owns_project(project_id)) or public.is_project_pilot_admin());

drop policy if exists "Admins can manage permit service orders" on public.permit_service_orders;
create policy "Admins can manage permit service orders"
on public.permit_service_orders for all to authenticated
using (public.is_project_pilot_admin())
with check (public.is_project_pilot_admin());

grant select on public.permit_service_orders to authenticated;

create or replace function public.touch_permit_service_order_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists permit_service_orders_touch on public.permit_service_orders;
create trigger permit_service_orders_touch
before update on public.permit_service_orders
for each row execute function public.touch_permit_service_order_updated_at();

comment on table public.permit_service_orders is
'One-time Project Pilot Full-Service Permit Concierge coordination purchases. Government permit fees, licensed-professional services, design/engineering work, and third-party charges are separate unless explicitly included.';

-- END 017_revenue_completion_4_0.sql

-- BEGIN 018_loyalty_referrals_4_1.sql
-- Project Pilot 4.2 — simple loyalty and referral loop
-- Give $10, Get $10: referred user gets a $10 Permit Concierge credit at claim;
-- referrer earns a $10 credit after the referred user's first paid Concierge order.


-- Normalize only unpaid pre-4.1 Concierge requests to the new $99 base offer.
-- Paid/refunded historical orders keep their original recorded amounts.
update public.permit_concierge_requests
set service_fee_cents = 9900, updated_at = now()
where payment_status in ('pending','cancelled')
  and service_started_at is null
  and coalesce(service_fee_cents, 0) <> 9900;

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referral_code text not null,
  status text not null default 'signed_up' check (status in ('signed_up','qualified','rewarded','reversed')),
  qualified_order_id uuid references public.permit_service_orders(id) on delete set null,
  referred_credit_cents integer not null default 1000 check (referred_credit_cents >= 0),
  referrer_reward_cents integer not null default 1000 check (referrer_reward_cents >= 0),
  created_at timestamptz not null default now(),
  qualified_at timestamptz,
  rewarded_at timestamptz,
  reversed_at timestamptz,
  check (referred_user_id <> referrer_user_id)
);

create index if not exists referral_attributions_referrer_idx
  on public.referral_attributions(referrer_user_id, created_at desc);

create table if not exists public.permit_service_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null check (amount_cents <> 0),
  reason text not null,
  idempotency_key text not null unique,
  related_user_id uuid references auth.users(id) on delete set null,
  related_order_id uuid references public.permit_service_orders(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists permit_service_credit_ledger_user_idx
  on public.permit_service_credit_ledger(user_id, created_at desc);

alter table public.referral_codes enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.permit_service_credit_ledger enable row level security;

drop policy if exists "Users can view their referral code" on public.referral_codes;
create policy "Users can view their referral code"
on public.referral_codes for select to authenticated
using (user_id = auth.uid() or public.is_project_pilot_admin());

drop policy if exists "Users can view their referral activity" on public.referral_attributions;
create policy "Users can view their referral activity"
on public.referral_attributions for select to authenticated
using (referred_user_id = auth.uid() or referrer_user_id = auth.uid() or public.is_project_pilot_admin());

drop policy if exists "Users can view their Project Pilot credits" on public.permit_service_credit_ledger;
create policy "Users can view their Project Pilot credits"
on public.permit_service_credit_ledger for select to authenticated
using (user_id = auth.uid() or public.is_project_pilot_admin());

grant select on public.referral_codes to authenticated;
grant select on public.referral_attributions to authenticated;
grant select on public.permit_service_credit_ledger to authenticated;

comment on table public.referral_codes is 'Stable share codes used by the Project Pilot Give $10, Get $10 referral program.';
comment on table public.referral_attributions is 'One referrer per referred Project Pilot account. Rewards qualify after the referred user completes a paid Permit Concierge order.';
comment on table public.permit_service_credit_ledger is 'Append-only Project Pilot credit ledger. Positive amounts earn credit; negative amounts apply credit to Permit Concierge.';

-- END 018_loyalty_referrals_4_1.sql

SELECT 'Project Pilot 4.2 fresh database install complete' AS result;

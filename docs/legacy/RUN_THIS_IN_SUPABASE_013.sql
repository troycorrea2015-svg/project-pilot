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

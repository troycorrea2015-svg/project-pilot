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

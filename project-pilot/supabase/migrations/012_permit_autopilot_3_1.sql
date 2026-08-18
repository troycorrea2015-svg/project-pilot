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

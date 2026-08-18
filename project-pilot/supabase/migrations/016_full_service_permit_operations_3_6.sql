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

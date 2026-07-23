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

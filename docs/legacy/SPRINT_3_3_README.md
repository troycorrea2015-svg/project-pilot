# Project Pilot Sprint 3.3 — Permit Application Builder

## What this adds

- Converts the existing Permit Autopilot interview into a structured permit application packet.
- Reviews applicant, property, project, contractor, scope, and project-specific answers.
- Checks required answers and linked supporting documents.
- Saves a versioned packet snapshot to the permit case.
- Creates an export audit record in Supabase.
- Downloads a printable HTML application packet.
- Downloads a CSV portal-field map.
- Downloads a structured JSON packet for future form-filling and jurisdiction integrations.
- Provides an assisted official-portal entry workspace with copy buttons and persistent completion tracking.
- Preserves applicant-controlled identity, certification, signature, payment, and professional-license steps.

## Initial jurisdiction field-label support

The field map includes targeted labels for:

- New Castle County, Delaware
- Kent County, Delaware
- Sussex County, Delaware
- General fallback jurisdictions

## Files

- `components/PermitApplicationBuilder.js`
- `components/PermitApplicationBuilder.module.css`
- `lib/permit-application-builder.js`
- `app/project/[id]/page.js`
- `supabase/migrations/015_permit_application_builder_3_3.sql`
- `RUN_THIS_IN_SUPABASE_015.sql`

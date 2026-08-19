# Project Pilot 4.4 — Permit Progress & Completion Release

This is the **complete Project Pilot application**, not a patch. It includes the modern 4.3 homepage/dashboard design, approved Project Pilot branding, realistic project imagery, the homepage and account-dashboard slideshows, free self-service permits, $99 Permit Concierge, referrals, contractor marketplace, admin/revenue controls, NOVA/Su guidance, Project Vision, and the cumulative Supabase setup.

## What 4.4 fixes

The permit experience now has **two different measurements**, so users can see what is actually happening:

- **Application readiness** — how complete the information/documents are before filing.
- **Permit process progress** — Intake → Preparing → Ready to File → Submitted → Approved → Inspections → Complete.

Previously, an existing permit case could reopen on an early screen even after its database status had moved forward. Permit Concierge tasks could also be completed without automatically moving the customer-facing status. 4.4 fixes both behaviors.

### Paid Permit Concierge progress

- Paid checkout now begins at **Intake Review** instead of appearing idle at “Requested.”
- Existing paid cases run a safe progress sync when the permit workspace opens.
- Project Pilot can automatically recognize preparation work already supported by saved project/permit data.
- Completing a Project Pilot work-queue task advances the next task and synchronizes the customer-facing stage.
- Completing a homeowner-required action resumes the case automatically.
- Corrections can be moved through received/reviewing/response/resubmitted/resolved states.
- Inspections can be moved through scheduling/result states.
- Submission, approval, inspections, closeout, and closed status update the permit progress bar and overall project record.
- Customer permit data refreshes while the permit workspace is open so progress does not require a manual page refresh.

### Free permit path

Permit Autopilot now reopens at the correct stage based on the saved case instead of always looking like it has restarted. It also shows a **Permit Journey** percentage separately from application readiness.

## Customer permit journey

1. Intake
2. Preparing
3. Ready to File
4. Submitted / Agency Review
5. Approved
6. Inspections / Closeout
7. Complete

Project Pilot does not mark a government-controlled milestone complete unless the saved data supports it or the operator records the real-world event. Government approval, applicant-only portal actions, signatures, licensed-professional documents, and government fees remain controlled by the appropriate authority/applicant/professional.

## Installation

### If 4.2 or 4.3 is already deployed and you already ran the 4.2 Supabase upgrade

**No new Supabase schema migration is required for 4.4.** Replace the deployed app with the complete `project-pilot` folder in this package and redeploy Vercel.

### If you are unsure whether the cumulative database setup was completed

Run:

`RUN_THIS_IN_SUPABASE_4_4_UPGRADE.sql`

It is the same cumulative database baseline carried forward under the current release name.

### Brand-new Supabase project

Run:

`RUN_THIS_IN_SUPABASE_FRESH_4_4.sql`

Then configure the values in `VERCEL_ENVIRONMENT_VALUES.txt` and deploy.

## Start here

Read `START_HERE_PROJECT_PILOT_4_4.txt` before deployment.

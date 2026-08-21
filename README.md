# Project Pilot 4.5 — Consumer Command Center Release

Project Pilot 4.5 is the complete application, not a patch. It keeps everything in the tested 4.4A permit-progress release and adds a major homeowner-experience layer designed around one rule:

> The customer should always know what is happening, what Project Pilot is doing, and whether they personally need to do anything.

## What changed in 4.5

### Homeowner dashboard
The signed-in dashboard now leads with a Current Project Status command center for the most recently active project. It shows:

- What is happening now
- What Project Pilot is doing
- What the homeowner needs to do
- The next checkpoint
- What will trigger the next update
- Current permit or project progress
- The latest visible permit update
- One clear button to continue

If Permit Concierge owns the next action, the dashboard says so directly instead of making the homeowner hunt for a task.

### Permit Concierge customer experience
Active Permit Concierge cases now show a customer command center before the technical details:

- “Nothing needed from you” or “Action needed”
- Current Project Pilot work
- Current homeowner responsibility
- Next permit checkpoint
- Next-update expectation without inventing government timelines
- Last updated time
- Case number and coordinator
- Official permit starting point / jurisdiction context
- Recent customer-visible timeline updates

The 7-stage permit journey remains:

Intake → Preparing → Ready to File → Submitted → Approved → Inspections → Complete

### Su context
Su now automatically resolves the most recently active project when asked from the dashboard. When Permit Concierge is active, Su receives the saved permit-service status and task context so questions such as “What’s happening?” and “Do I need to do anything?” can be answered from the real project state.

### Customer communication
When Resend is configured:

- Major admin permit status changes can email the homeowner.
- Homeowner-action requests can email the homeowner.
- Permit Concierge messages can email the homeowner.
- Correction and meaningful inspection updates can email the homeowner.
- A homeowner message from the permit workspace can notify the Permit Concierge operating inbox.

In-app records remain the source of truth if email delivery is unavailable.

### Admin experience
The Permit Concierge workbench now includes a Customer Experience Preview. Before leaving a case, the operator can see the same four questions the homeowner cares about: what Project Pilot is doing, what the homeowner needs to do, the next checkpoint, and the next-update expectation.

### Homepage and mobile
The approved Project Pilot hero direction remains, but the active hero now uses the daytime house photography without baked-in fabricated ratings, city counts, or project counts. The homepage slideshow remains. The signed-in dashboard slideshow remains. The mobile header keeps a visible Start CTA instead of hiding every conversion action.

## Database
Project Pilot 4.5 introduces **no new database schema objects beyond the 4.4 baseline**.

If you already ran the 4.4 cumulative Supabase upgrade, do not run another migration just for 4.5. Deploy the full 4.5 application and redeploy Vercel.

For an older or uncertain database, use:

`RUN_THIS_IN_SUPABASE_4_5_UPGRADE.sql`

For a brand-new database, use:

`RUN_THIS_IN_SUPABASE_FRESH_4_5.sql`

These carry forward the same cumulative schema baseline under the current release name.

## Before live paid traffic
Read `START_HERE_PROJECT_PILOT_4_5.txt` and `RELEASE_VALIDATION_4_5.txt`.

Project Pilot must not claim that a government-controlled milestone occurred until the real event is recorded. Government approvals, applicant-only identity/signature actions, professional seals, and government payments remain controlled by the appropriate authority, applicant, or licensed professional.

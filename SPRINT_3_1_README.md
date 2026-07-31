# Project Pilot Sprint 3.1 — Permit Autopilot

Sprint 3.1 turns the existing permit lookup into a homeowner-controlled permit workflow.

## Homeowner workflow

1. **Permit Route** — uses the saved address/jurisdiction match and official application resource.
2. **Application Interview** — collects reusable applicant, project, trade, and project-type answers.
3. **Document Completeness** — links existing Project Pilot documents to permit requirements.
4. **Review & Authorize** — calculates readiness, creates a printable preparation packet, and records homeowner authorization.
5. **Submit & Track** — opens the official route, stores the application reference, tracks fees, deadlines, corrections, approvals, and inspections.

## Su correction assistant

Homeowners can paste reviewer comments. Su returns:
- a plain-language explanation;
- concrete action items;
- a draft response for the applicant to review;
- a professional-review warning when the issue may require a licensed or qualified professional.

## Permit Concierge

Homeowners may request a Project Pilot review. The request appears in the Admin Control Center.
This is a review queue, not a claim of unrestricted agency filing authority.

## Cumulative improvements included

- Project Vision generates one image per click.
- Add Your Vision remains text-based and refines the selected concept.
- Image deletion and compatibility handling remain included.
- Su streams responses and routes simple questions to a fast model while preserving stronger project guidance and confirmation-based actions.
- OpenAI defaults use official model families with fallbacks.

## Required database step

Run `RUN_THIS_IN_SUPABASE_012.sql` once after uploading the code.

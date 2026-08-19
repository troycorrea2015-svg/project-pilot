# Project Pilot 4.4 release notes

## Permit progress engine
- New shared permit progress/state helpers in `lib/permit-progress.js`.
- New authenticated `/api/permit-service/sync` route for existing paid cases.
- Seven-stage customer-facing Permit Concierge milestone tracker.
- Active-case refresh while the customer is viewing the permit workspace.
- Project-level progress/status synchronization.

## Permit Autopilot
- Restores the correct saved step when reopening a case.
- Separates overall permit journey progress from application readiness.

## Permit Concierge operations
- Completing a Project Pilot task can advance the next queue item and customer-visible stage.
- Homeowner task completion resumes the case.
- Correction status controls added.
- Inspection result/status controls added.
- Admin workbench shows Permit Progress instead of treating application-readiness percentage as the whole permit process.

## Database
No new 4.4 schema objects are required. The 4.4 cumulative SQL files are copies of the existing cumulative baseline for recovery/fresh-install consistency.

# Project Pilot 4.5 release notes

## Consumer command center
- Added a dominant Current Project Status experience to the signed-in dashboard.
- Separates Project Pilot-owned work from homeowner-owned work.
- Shows next checkpoint, next update trigger, progress, last update, and recent permit activity.
- Dashboard Permit Concierge data refreshes in the background while the page is open.

## Permit Concierge customer experience
- Added a “Right Now” permit command center.
- Added explicit “Nothing needed from you” state.
- Added current Project Pilot work, customer action, next checkpoint, and next-update expectation.
- Added official permit source/jurisdiction panel.
- Added recent permit updates directly in the active case instead of hiding all activity in a disclosure.
- Preserved 15-second active permit refresh and 7-stage permit process tracker.

## Su
- Dashboard questions now automatically use the most recently active project.
- Permit Concierge request/task context is supplied to Su when available.
- Added quick questions: “What’s happening?”, “Do I need to do anything?”, and “Show my next step”.
- Auto-resolved dashboard project ID is retained so confirmed Su actions can still update the correct project.

## Communication
- Added server-side admin Permit Concierge customer-email endpoint.
- Added homeowner-message notification endpoint for the Permit Concierge operating inbox.
- Status changes, homeowner action requests, coordinator messages, corrections, and selected inspection updates can generate email notifications when Resend is configured.

## Operator quality control
- Added Customer Experience Preview to the Permit Concierge admin workbench.
- Operator can see the customer-facing meaning of the case before leaving it.

## Project workspace
- The Overview tab no longer labels Project Pilot-owned permit work as “Your Next Step.”
- When Project Pilot owns the action, the project says “Project Pilot is working” and routes the homeowner to live permit status.

## Homepage
- Uses a clean house-only daytime hero asset.
- Removed the previous full promotional hero asset from active public assets because it contained illustrative metrics that should not be presented as real traction.
- Homepage and account-dashboard slideshows remain.
- Mobile header retains a visible Start CTA.

## Database
No new schema changes beyond 4.4. The 4.5 SQL files are cumulative aliases for installation clarity.

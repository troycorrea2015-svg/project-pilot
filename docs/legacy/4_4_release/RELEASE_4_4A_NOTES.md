# Project Pilot 4.4A — Tested Permit Progress Release

This maintenance release keeps the 4.4 permit progress engine and corrects stale 4.2 labels/messages that could make a correctly upgraded installation appear outdated.

## Confirmed permit behavior
- Paid Permit Concierge starts at Intake Review.
- Saved project data can automatically complete supported preparation tasks.
- Homeowner-controlled actions visibly pause the workflow and resume it after completion.
- Permit stages advance through Ready to File, Submitted, Corrections, Approved, Inspections, Closeout, and Complete.
- Closed permit cases display 100% permit progress and synchronize the project status to `Permit Complete`.
- Overall project completion remains separate from permit completion so finishing a permit does not falsely mark construction as finished.

## Built-in tests
Run these without installing project dependencies:

```bash
node scripts/test-permit-progress.mjs
node scripts/test-permit-wiring.mjs
```

A successful Vercel production build is still required before launch because this validation environment could not reach the npm registry.

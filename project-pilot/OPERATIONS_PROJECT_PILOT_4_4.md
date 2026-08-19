# Project Pilot 4.4 Permit Concierge operations

## What the software now does automatically

When a paid Permit Concierge order is confirmed, Project Pilot opens the case at **Intake Review**, creates the operating task queue, updates the overall project permit status, and begins displaying customer-facing permit progress.

When an existing paid case is opened, the progress-sync endpoint safely checks saved project/permit information. It can recognize work that is already supported by the database, such as a saved project scope, known requirements, prepared application information, confirmed submission reference, approval, or closed permit record. It does **not** invent government milestones.

When an operator completes a Project Pilot work-queue task, the next pending Project Pilot task automatically becomes active and the customer-facing status/progress is synchronized.

When a homeowner completes an applicant-controlled task, the case automatically resumes instead of remaining stuck in `waiting_on_homeowner`.

## Customer-visible stages

1. Intake
2. Preparing
3. Ready to File
4. Submitted
5. Approved
6. Inspections
7. Complete

## Admin workflow

Open **Admin Control Center → Permit Concierge → Open workbench**.

Use the Work Queue for actual permit operating work. Move each task to `Completed` when the work has genuinely been completed. The application will advance the visible permit progress and start the next queue task.

Use **Case Control** for real-world government milestones that cannot be inferred from internal task completion: filing, submitted, approved, inspections, closeout, and closed.

Use **Corrections** to record reviewer comments and move each round through reviewing, response ready, resubmitted, and resolved.

Use **Inspections + Closeout** to record scheduling/results. When all recorded inspections are passed/not required/cancelled, the case moves to Closeout. Use Case Control → Closed after the final permit record/closeout is actually complete.

## What must not be automated or falsely marked complete

Do not mark these as complete without real evidence:
- official permit submission,
- government payment,
- agency approval,
- reviewer correction resolution,
- inspection result,
- final closeout,
- applicant legal signature/identity verification,
- licensed-professional seal/certification.

Project Pilot can prepare, organize, coordinate, and track these actions, but the saved status must reflect what actually happened.

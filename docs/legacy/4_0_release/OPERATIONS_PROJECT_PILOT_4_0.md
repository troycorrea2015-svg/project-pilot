# Project Pilot 4.0 Operating Model

## Paid Permit Concierge order lifecycle
1. Customer creates/opens a Project Pilot project.
2. Customer reviews and accepts the 4.0 permit coordination authorization.
3. Project Pilot creates a pending service order and sends the customer to Stripe Checkout.
4. Stripe confirms payment.
5. Project Pilot marks the order paid, activates the Permit Concierge case, creates the standard operating task list, records the timeline event, and notifies the operating inbox when configured.
6. The coordinator verifies jurisdiction, official sources, filing authority, and applicant-controlled requirements before making filing promises.
7. The coordinator prepares and manages the authorized administrative workflow through corrections, inspections, and closeout.
8. Admin Financials reports the paid service as collected revenue.

## Refund handling
The Admin Permit Concierge workbench exposes a full-fee refund control while the paid case remains at intake/request review. The refund is issued through Stripe and the Project Pilot order/request/case/task records are moved back to a non-active state. If substantial work has already begun, review the service performed and the applicable refund policy before making an adjustment directly in Stripe.

## What is included in the Project Pilot coordination fee
- Permit route/jurisdiction verification.
- Administrative application-information preparation.
- Document/package organization.
- Filing/agency coordination where permitted and authorized.
- Correction tracking and response coordination.
- Inspection scheduling/tracking coordination.
- Permit closeout tracking.

## What is separate
- Government permit, filing, plan-review, and inspection fees.
- Architect, engineer, surveyor, designer, or other licensed-professional fees.
- Contractor/trade work.
- Professional seals, notarizations, third-party reports, testing, or other outside costs.
- Any applicant-controlled action required by the authority.

## Daily operator view
Use `/admin` for revenue and queue overview and `/admin/permit-concierge/[case]` for the actual case workbench. Paid cases should not remain unassigned. Keep the homeowner-visible summary, next action, messages, and government milestones updated.

## Jurisdiction expansion
Do not treat a generic AI answer as a verified filing rule. Use official sources to verify jurisdiction details and maintain `permit_jurisdiction_playbooks`. The template included in this release is `JURISDICTION_PLAYBOOK_TEMPLATE.md`.

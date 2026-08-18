# Project Pilot 4.2 Operating Model

## Customer experience principle
The homeowner should never have to wonder which product tier they need.

1. **Start free.** Project Pilot gives the homeowner the permit route, guided questions, application builder, checklist, documents, and project guidance.
2. **Upgrade only for convenience.** If the customer wants Project Pilot to take over the administrative permit work, they activate Permit Concierge for the displayed one-time fee.
3. **Minimize customer handoffs.** Once Concierge is active, only create a homeowner task when the governing authority, payment process, identity requirement, signature requirement, or licensed-professional requirement truly requires the homeowner or another authorized party.
4. **Always show the next action.** If Project Pilot owns the next action, the UI should say so. If the homeowner owns it, explain exactly what they need to do and why.

## Paid Permit Concierge lifecycle
1. Customer chooses the $99 Concierge option and accepts the coordination authorization.
2. Available Project Pilot credit is applied automatically, subject to the configured per-order cap.
3. Stripe confirms payment.
4. Project Pilot activates the case, creates the operating tasks, records the timeline event, and notifies the operating inbox.
5. The coordinator verifies official jurisdiction information before making filing promises.
6. The coordinator works the authorized administrative process through corrections, inspections, and closeout.

## Referral / loyalty lifecycle
- Dashboard provides each user a stable referral link.
- A new user can claim a referral during their first 14 days.
- The referred user receives $10 Permit Concierge credit.
- The referrer earns $10 only after the referred user completes the first paid Concierge order.
- Credits are tracked in an append-only ledger.
- Refunds restore customer credit used on the refunded order and reverse the qualifying referrer reward.

## What Concierge includes
- Permit route / jurisdiction verification.
- Administrative application-information preparation.
- Document/package organization.
- Filing/agency coordination where permitted and authorized.
- Correction tracking and response coordination.
- Inspection scheduling/tracking coordination.
- Permit closeout tracking.

## What remains outside the Project Pilot fee
- Government permit, filing, plan-review, and inspection fees.
- Architect, engineer, surveyor, designer, or other licensed-professional fees.
- Contractor/trade work.
- Professional seals, notarizations, third-party reports, testing, or other outside costs.
- Applicant-controlled actions required by the authority.

## Refund handling
The Admin workbench supports a full Stripe refund while a paid case remains at intake/request review. Used Project Pilot credit is restored. If the order generated a referral reward, that reward is reversed. Once substantive work has begun, review the service performed and applicable terms before making an adjustment.

## Daily operator view
Use `/admin` for revenue and queue overview and `/admin/permit-concierge/[case]` for the case workbench. Paid cases should not remain unassigned. Keep the homeowner-visible summary, next action, messages, and milestones current.

# Project Pilot 4.5 Revenue Launch Checklist

## Free experience
- [ ] A homeowner can create a project without paying.
- [ ] Permit route lookup works without checkout.
- [ ] Permit Autopilot / application builder / checklist remain accessible without checkout.
- [ ] The permit choice clearly shows **$0 self-service** and **$99 Permit Concierge**.
- [ ] The customer can start free and upgrade later without recreating the project.

## Paid Concierge
- [ ] Run `RUN_THIS_IN_SUPABASE_4_5_UPGRADE.sql` successfully.
- [ ] Deploy the entire 4.5 source tree.
- [ ] Complete a $99-base-price Stripe TEST checkout.
- [ ] Confirm payment activates the correct case and operating work queue.
- [ ] Confirm Admin Financials shows the actual amount collected after any Project Pilot credit.
- [ ] Test the intake-stage refund workflow.
- [ ] Configure and monitor `PERMIT_CONCIERGE_EMAIL`.
- [ ] Configure paid-case customer email delivery.
- [ ] Switch Stripe test credentials to live only after testing passes.

## Give $10, Get $10
- [ ] Dashboard generates a referral link.
- [ ] A new account joining through the link receives $10 Project Pilot credit.
- [ ] Referral credit appears automatically at Concierge checkout.
- [ ] Referrer receives $10 credit only after the referred user pays.
- [ ] Refund restores customer credit used and reverses the qualifying referral reward.

## Service operations
- [ ] Verify the customer's property jurisdiction from an official source.
- [ ] Verify who is legally allowed to file.
- [ ] Record applicant-only requirements.
- [ ] Keep customer-facing status and next action current.
- [ ] Record corrections, resubmissions, inspections, and closeout.

## Revenue paths
1. **Homeowner Permit Concierge:** $99 base one-time coordination fee, configurable.
2. **Contractor qualified introductions:** separately switchable after marketplace testing.

Project Pilot does not collect construction contract deposits or project payments in this release.

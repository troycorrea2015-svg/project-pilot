# Project Pilot 4.2 — Modern Easy Complete Service

This is the **complete Project Pilot application**, not an incremental patch. It keeps the full 4.1 free-first revenue/loyalty system and adds the approved 4.2 customer experience: a warmer modern interface, the exact approved folded-blue Project Pilot logo, a project-type hero slideshow, and an adaptive permit workflow that only asks customers for plans/documents when their actual permit path needs them.

## Homeowner offer

### Do it with Project Pilot — $0
Homeowners can use Project Pilot without a subscription to identify the likely permit authority and official route, answer guided project questions, organize permit information, use the application builder/checklist, manage photos/documents/tasks/budgets, use NOVA/Su guidance and Project Vision, and find contractors.

### Have Project Pilot handle it — $99 one time
Permit Concierge handles the administrative permit workflow Project Pilot is legally and practically allowed to perform: jurisdiction verification, requirements review, application-information preparation, package organization, permitted filing coordination, agency follow-up, corrections, inspection coordination, and closeout tracking.

The homeowner is brought back in only for applicant-controlled actions such as a required signature, identity verification, applicant-only government portal step, direct government payment, notarization, or a document/action that must come from a licensed professional. Government fees and third-party/professional charges remain separate.

## Easier 4.2 permit experience

Project Pilot no longer treats **Upload Plans** as a universal step. The intended flow is:

1. Tell us about your project.
2. Project Pilot determines the permit route and requirements.
3. We request only the information/files actually required for that project and jurisdiction.
4. Project Pilot prepares the permit package or guides the free self-service path.
5. Submit and track through review/approval.

If no plan or supporting file has been confirmed as required, the customer can continue. If something is required, Project Pilot explains exactly what it is, why it is needed, and how to provide or obtain it.

## 4.2 interface

- Warm/light modern design selected from the approved Option 5 direction.
- Exact user-approved folded-ribbon blue **P** + PROJECT PILOT wordmark used as the brand source of truth.
- Homepage hero slideshow rotates through currently supported project examples: **Kitchen, Bathroom, Deck, Addition, Shed/Garage, and Fence**.
- Strong photography, clean cards, generous spacing, friendly copy, and strategic navy/blue accents rather than a full dark-mode site.
- Customer-facing calls to action emphasize **Continue My Project** and the next useful action instead of permit jargon.

## Loyalty / referrals — Give $10, Get $10
- A new eligible user who joins with a valid referral receives **$10 Project Pilot credit** toward Permit Concierge.
- After that referred user completes a qualifying paid Concierge order, the referrer earns **$10 Project Pilot credit**.
- Credits apply automatically at checkout.
- Default maximum applied to one Concierge order is **$40** (configurable).
- Eligible refunds restore used customer credit and reverse the associated referral reward.

## Database installation

For an **existing Project Pilot Supabase database**, run only:

`RUN_THIS_IN_SUPABASE_4_2_UPGRADE.sql`

It is cumulative through migrations 015, 016, 017, and 018, so it is the recovery path even if you do not remember whether 3.6, 4.0, or 4.1 was installed.

For a **completely new Supabase project only**, use:

`RUN_THIS_IN_SUPABASE_FRESH_4_2.sql`

## Before accepting real money

Read:
- `INSTALL_PROJECT_PILOT_4_2.txt`
- `REVENUE_LAUNCH_CHECKLIST.md`
- `OPERATIONS_PROJECT_PILOT_4_2.md`
- `VERCEL_ENVIRONMENT_VALUES.txt`
- `RELEASE_VALIDATION.txt`

Paid Permit Concierge is an **operated service**, not passive fulfillment. A Project Pilot operator still has to work each paid case using verified official jurisdiction information.

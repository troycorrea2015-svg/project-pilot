PROJECT PILOT — SPRINT 3.0B REVENUE LAUNCH
===========================================

WHAT THIS RELEASE DOES
----------------------
This update turns Project Pilot into a production-oriented Best Match contractor marketplace
that can automatically collect fixed introduction fees.

Business model installed:
- Homeowners create projects and request contractor introductions at no charge.
- Contractors create a profile with no monthly subscription.
- There are no sponsored contractors and payment never changes recommendation order.
- Project Pilot calculates the stored Best Match score on the server.
- Contractors see the exact fixed fee before accepting an opportunity.
- Homeowner contact details stay hidden until Stripe confirms payment or an admin waives the fee.
- Project Pilot does not collect construction deposits or project payments.

FIXED INTRODUCTION FEES
-----------------------
Project value up to $5,000:       $25
$5,001 through $15,000:           $50
$15,001 through $50,000:         $100
Over $50,000:                    $150

IMPORTANT
---------
This code automates contractor matching, checkout, payment confirmation, contact release,
notifications, lead reviews, refunds, and revenue reporting. It does not guarantee passive
income or create homeowner traffic by itself.

You can skip a broad public beta, but do not skip one controlled end-to-end Stripe test or a
legal review of the contractor terms. Those are launch safety checks, not a months-long beta.

INSTALL THE PATCH
-----------------
1. Open GitHub Desktop and select the Project Pilot repository.
2. Commit any current changes before installing this update.
3. Extract Project_Pilot_Sprint_3_0B_REVENUE_LAUNCH_PATCH.zip.
4. Copy everything inside the extracted folder into the root Project Pilot repository folder.
5. Choose "Replace the files in the destination" when Windows asks.
6. Open Supabase -> SQL Editor.
7. Run the entire file:
   supabase/migrations/010_revenue_launch_marketplace.sql
   Run the newest copy even if an earlier draft of migration 010 was already used.
8. In GitHub Desktop, commit with:
   Sprint 3.0B Revenue Launch
9. Push origin and wait for the Vercel production deployment to show Ready.

VERCEL ENVIRONMENT VARIABLES
----------------------------
Open Vercel -> Project Pilot -> Settings -> Environment Variables.

Required:
NEXT_PUBLIC_SITE_URL=https://projectpiloting.com
SUPABASE_SERVICE_ROLE_KEY=<Supabase server-only service role key>
STRIPE_SECRET_KEY=<Stripe test secret key first>
STRIPE_WEBHOOK_SECRET=<Stripe webhook signing secret>
MARKETPLACE_PAYMENTS_ENABLED=false

Optional email automation:
RESEND_API_KEY=<Resend API key>
MARKETPLACE_FROM_EMAIL=Project Pilot <notifications@projectpiloting.com>

Never put SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, or STRIPE_WEBHOOK_SECRET in a
NEXT_PUBLIC variable.

STRIPE CONNECTION
-----------------
1. Open or create the Project Pilot Stripe account.
2. Begin with Stripe test mode.
3. Create this webhook endpoint:
   https://projectpiloting.com/api/marketplace/webhook
4. Subscribe it to:
   checkout.session.completed
   checkout.session.expired
5. Copy its signing secret to STRIPE_WEBHOOK_SECRET in Vercel.
6. Redeploy after saving the Vercel variables.
7. Keep MARKETPLACE_PAYMENTS_ENABLED=false until the site and database are deployed.
8. Temporarily change it to true for one Stripe test transaction.
9. Confirm all of the following:
   - Checkout opens from Contractor Center.
   - The displayed amount matches the project-size fee.
   - Stripe returns to Contractor Center.
   - The webhook marks the introduction Accepted and Paid.
   - The contractor can see homeowner contact information only after payment.
   - The Admin Control Center shows the paid introduction and revenue.
   - A test refund can be issued through a lead review.
10. After the test and legal review, replace test keys with live keys, create a live webhook,
    and set MARKETPLACE_PAYMENTS_ENABLED=true in Vercel Production.

ADMIN CONTROL CENTER
--------------------
Open:
https://projectpiloting.com/admin

It now shows:
- Total accounts and account-type breakdown
- Project totals and activity
- Contractor profile and verification totals
- License/registration and insurance review controls
- Lead requests, offers, accepted introductions, and paid introductions
- Actual Stripe-confirmed revenue
- Open introduction-fee value
- Lead quality reviews and refunds/credits
- User feedback
- A Revenue Launch Status panel showing missing Vercel connections

CONTRACTOR WORKFLOW
-------------------
1. Contractor creates an account and opens /contractor.
2. Contractor enters specialties, service areas, project-size preferences, availability,
   license/registration information, and insurance status.
3. Contractor accepts the partner terms.
4. Admin verifies the contractor in /admin.
5. Verified contractors become eligible for Best Match results.
6. The contractor receives anonymized opportunities and sees the fee before accepting.
7. Stripe payment unlocks the homeowner contact automatically.

HOMEOWNER WORKFLOW
------------------
1. Homeowner creates a project.
2. Homeowner opens /contractors or Find Contractors from the project.
3. Project Pilot ranks verified contractors by project fit.
4. Homeowner chooses up to three contractors and requests introductions.
5. Homeowner pays nothing.
6. Contractors decide whether to accept the opportunity.
7. The homeowner can track each request and is notified when a contractor accepts.

NEW PRODUCTION ROUTES
---------------------
/contractors                              Homeowner Best Match network
/contractor                               Contractor profile and lead inbox
/admin                                    Executive and revenue dashboard
/terms                                    Terms and contractor partner terms
/privacy                                  Privacy notice
/api/marketplace/checkout                 Secure Stripe Checkout creation
/api/marketplace/checkout/reset           Cancel/restart an unfinished checkout
/api/marketplace/webhook                  Stripe confirmation and contact release
/api/marketplace/notify                   Optional contractor notification emails
/api/marketplace/refund                   Admin refund/account-credit processing
/api/marketplace/health                   Admin-only launch configuration check

GO-LIVE GATES
-------------
[ ] projectpiloting.com is attached to the Vercel Production deployment
[ ] /admin opens for Troy's account
[ ] migration 009 has been run
[ ] the newest migration 010 has been run
[ ] Stripe test checkout and webhook succeeded
[ ] homeowner contact stayed hidden until payment
[ ] refund/credit workflow was tested
[ ] contractor terms and referral model were reviewed by a local attorney
[ ] privacy notice contains the final support contact and business information
[ ] live Stripe key and live webhook are installed
[ ] MARKETPLACE_PAYMENTS_ENABLED=true in Vercel Production

VALIDATION PERFORMED
--------------------
- All JavaScript and JSX files were parsed for syntax errors.
- All server-side JavaScript routes passed Node syntax checks.
- ZIP integrity is tested before delivery.
- A complete Next.js production build could not be run in this environment because the npm
  registry available to the build environment did not provide the required Supabase package.
  Vercel will perform the production build after the commit is pushed.

ROLLBACK
--------
If the Vercel build fails, revert the Sprint 3.0B Revenue Launch commit in GitHub Desktop.
Do not delete the marketplace database tables while diagnosing a code deployment issue.

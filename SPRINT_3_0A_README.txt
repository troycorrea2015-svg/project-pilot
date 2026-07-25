PROJECT PILOT — SPRINT 3.0A BETA
Guided Experience + Admin Control Center

WHAT THIS UPDATE ADDS
---------------------
1. Plain-language navigation
   - Dashboard
   - My Projects
   - Find Contractors
   - Permits
   - Help Center
   - Project pages use Overview, Project Plan, Project Assistant,
     Permits & Approvals, Files & Documents, and Notes.

2. Guided project creation
   - Three-step project setup
   - Project type, name, description, address, timeline, role, and budget
   - Clear summary before the project is created

3. Project Assistant help
   - A Need help? button is available throughout the site
   - Explains the current page
   - Shows the next recommended action
   - Defines common terms such as permit, zoning, setback,
     jurisdiction, inspection, and estimate
   - The project chat now recognizes confusion/help questions and
     answers in plain language without requiring paid AI usage

4. Help Center
   - New /help page
   - Searchable common tasks and glossary

5. Beta feedback
   - Signed-in users can submit feedback from any page
   - Captures feedback type, page, message, and ease-of-use rating
   - Feedback appears in the Admin Control Center

6. Admin Control Center
   - New /admin page
   - Total accounts and recent account growth
   - Account-type breakdown
   - Total, active, and completed projects
   - Project-type breakdown
   - Product activity and feedback totals
   - Feedback status management
   - Beta financial panel showing $0 actual revenue and $0 fees
   - Future marketplace value remains inactive until Sprint 3.0B

7. Beta analytics foundation
   - First-party page-view events for signed-in users
   - Last-active timestamps
   - No advertising tracking

8. Contractor network preview
   - No sponsored contractors
   - No paid ranking
   - Best Match messaging is included as the Sprint 3.0B direction

IMPORTANT BETA RULE
-------------------
Homeowners and contractors are charged $0 during beta.
There are no subscriptions, lead fees, card requirements, or paid placements.

INSTALLATION
------------
1. Back up or commit your current repository in GitHub Desktop.
2. Extract the PATCH ZIP.
3. Copy the extracted app, components, and supabase folders into the
   root of your Project Pilot repository.
4. Allow Windows to replace matching files.
5. In Supabase, open SQL Editor.
6. Open this file from the update:
   supabase/migrations/009_sprint_3_0a_guided_beta.sql
7. Copy the entire SQL file into Supabase SQL Editor and click Run.
8. Enable your own account as the administrator by running this SQL.
   Replace YOUR_EMAIL_ADDRESS with the email used to sign in to Project Pilot:

   update public.profiles p
   set is_admin = true,
       updated_at = now()
   from auth.users u
   where p.id = u.id
     and lower(u.email) = lower('YOUR_EMAIL_ADDRESS');

9. Confirm the SQL result says success.
10. In GitHub Desktop, review the changed files, commit, and push.
11. Wait for Vercel to finish the production deployment.

TEST AFTER DEPLOYMENT
---------------------
1. Open the site in a private/incognito window.
2. Sign in as a normal user.
3. Confirm Dashboard, Help Center, Need help?, and Send Beta Feedback work.
4. Create a test project through the three-step setup.
5. Open the project and confirm the plain-language navigation works.
6. Ask Project Assistant:
   - What does setback mean?
   - What should I do next?
   - What information am I missing?
7. Sign in with the account enabled as admin.
8. Open /admin and confirm account, project, feedback, and financial panels load.

KNOWN LIMITATION
----------------
This environment could not download npm packages because the package mirror
returned a temporary 503 error. All changed JavaScript/JSX files passed a
TypeScript syntax parse, and CSS brace validation passed. Vercel will perform
the complete Next.js production build when the repository is pushed.

SPRINT 3.0B IS NOT INCLUDED
---------------------------
Sprint 3.0B will add contractor onboarding, verification, Best Match scoring,
quote requests, lead acceptance, lead tracking, and test-only future fee data.
All real charges will remain disabled during beta.

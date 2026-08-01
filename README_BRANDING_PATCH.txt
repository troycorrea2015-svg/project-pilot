PROJECT PILOT — SPRINT 3.0C BRAND IDENTITY PATCH
=================================================

WHAT THIS PATCH CHANGES
- Installs the approved folded-ribbon Project Pilot logo.
- Applies the navy, electric-blue, sky-blue, green, slate, and white palette.
- Restyles existing homepage, dashboard, project, contractor, and admin brand marks.
- Adds premium cards, navigation, buttons, progress bars, focus states, and responsive polish.
- Adds favicon and full wordmark assets.

WHAT THIS PATCH DOES NOT CHANGE
- Supabase tables or migrations.
- User accounts or stored project data.
- Marketplace payment settings.
- Stripe configuration.
- Permit lookup logic.
- API routes.

INSTALLATION
1. Extract this patch.
2. Copy the app, public, and scripts folders into the ROOT of your current Project Pilot repository.
3. Allow the new files to merge with the existing folders.
4. From the repository root, run:
      node scripts/install-project-pilot-brand.js
5. Verify:
      npm run brand:verify
6. Test:
      npm run build
7. Commit and push to the repository connected to Vercel.

IMPORTANT
Keep MARKETPLACE_PAYMENTS_ENABLED=false in Vercel unless you intentionally decide to activate live payments.

BRAND TOKENS
Ink:       #0A0F1C
Navy:      #13233D
Blue:      #2563FF
Sky:       #3DA5FF
Green:     #22C55E
Slate:     #64748B
Cloud:     #F4F7FB
White:     #FFFFFF

TAGLINE
AI GUIDANCE. REAL RESULTS.

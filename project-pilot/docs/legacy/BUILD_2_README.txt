PROJECT PILOT BUILD 2

FILES IN THIS UPDATE
- app/api/pilot/route.js
- app/project/[id]/page.js
- app/project/[id]/project.css
- supabase/migrations/006_build_2_workspace.sql

INSTALL ORDER
1. Copy the app and supabase folders into the existing project-pilot repository.
2. Run supabase/migrations/006_build_2_workspace.sql in Supabase SQL Editor.
3. Commit and push the four changed project files (the README is optional).
4. Wait for Vercel to deploy.

WHAT BUILD 2 ADDS
- Free rules-based Pilot guided setup; no OpenAI billing required
- Command Center project overview
- Interactive Flight Plan tabs
- Working Project Binder uploads through Supabase Storage
- Persistent project notes
- Automatic capture of project type, description, address, role, timeline, and budget
- Automatic project progress and next-step updates

TEST
- Open a project and continue with Pilot.
- Tell Pilot the project type, description, address, role, timeline, and budget.
- Refresh and confirm the conversation and project details remain.
- Upload a small PDF or image in Project Binder and open it.
- Save project notes and refresh.

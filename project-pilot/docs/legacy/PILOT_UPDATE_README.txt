PROJECT PILOT — PILOT AI UPDATE

Copy ONLY these items from this update into the matching locations in your existing local repository:

1) app/api/pilot/route.js
2) app/project/[id]/page.js
3) app/project/[id]/project.css
4) app/dashboard/page.js
5) supabase/migrations/005_pilot_chat.sql

Then:
A. Run supabase/migrations/005_pilot_chat.sql in Supabase SQL Editor.
B. Add OPENAI_API_KEY in Vercel > Project Settings > Environment Variables.
C. Commit and push in GitHub Desktop.

Do not copy a folder named project-pilot into your project-pilot repository. Copy the five paths above into the repository root so app merges with app and supabase merges with supabase.

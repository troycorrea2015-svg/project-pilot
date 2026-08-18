PROJECT PILOT — SPRINT 2.6

Included in this build:
1. Homepage visual refresh
   - Warmer, more inviting look
   - New planning / estimating / DIY illustrations
   - Homepage remains sign-in capable at the top of the experience
   - Added DIY messaging and more consumer-friendly positioning

2. Project cost estimator
   - Added inside Permit Intelligence workspace
   - Professional estimate range (low / expected / high)
   - DIY estimate range (low / expected / high)
   - Breakdown for materials, labor/tools, permits, and contingency
   - Works from project type, size, finish level, and optional custom measurement

3. DIY planning section
   - Material checklist for the selected project type
   - DIY planning tips
   - Learning links for DIY research / training

Files updated:
- app/page.js
- app/page.css
- app/project/[id]/page.js
- app/project/[id]/project.css
- public/scene-planning.svg
- public/scene-estimator.svg
- public/scene-diy.svg

How to use:
- Replace your current project files with the contents of this ZIP.
- Commit and push.
- Redeploy in Vercel if needed.

Notes:
- No new Supabase migration is required for Sprint 2.6.
- Cost estimates are planning estimates only and are intentionally presented as non-binding ranges.

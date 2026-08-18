PROJECT PILOT — SPRINT 2.6 REVISED

This patch replaces the previous Sprint 2.6 visual direction.

WHAT CHANGED
- Homepage redesigned around AI-generated, photorealistic people and project imagery.
- Signed-in dashboard now includes a people-focused visual hero.
- Signed-in dashboard includes six visual project categories.
- Selecting a category creates a prefilled project workspace.
- Existing project cards display a project-type image.
- Project cards now include a permanent Delete option with confirmation.
- Deleting a project also removes Project Binder storage files before deleting the project record.
- Signed-in Project Binder, DIY, Pilot, and professional sections include related imagery.
- Individual project workspaces display a project-type visual.
- Permit Intelligence, Cost Estimator, DIY route, and Pilot each include related people imagery.
- Professional and DIY estimate ranges remain available.
- No new Supabase migration is required.

EXPECTED GITHUB DESKTOP CHANGES: 18 FILES

Modified:
- app/page.js
- app/page.css
- app/dashboard/page.js
- app/dashboard/dashboard.css
- app/project/[id]/page.js
- app/project/[id]/project.css

New images:
- public/home-planning-people.jpg
- public/home-cost-planning.jpg
- public/home-diy-builder.jpg
- public/pilot-guide.jpg
- public/permit-guide.jpg
- public/category-deck.jpg
- public/category-kitchen.jpg
- public/category-bathroom.jpg
- public/category-addition.jpg
- public/category-fence.jpg
- public/category-shed.jpg

New documentation:
- SPRINT_2_6_REVISED_README.txt

INSTALL
1. Make sure GitHub Desktop shows No local changes.
2. Extract this ZIP.
3. Copy the app and public folders plus SPRINT_2_6_REVISED_README.txt into the root of the Project Pilot repository.
4. Replace files when prompted.
5. GitHub Desktop should show exactly 18 changed files listed above.
6. Commit: Sprint 2.6 revised - people visuals, project categories, and delete projects
7. Push origin and let Vercel deploy.

QUICK CHECK
- Homepage loads and displays people/project imagery.
- Dashboard loads and displays visual categories.
- Clicking a category creates a prefilled project.
- Project cards show images.
- Delete asks for confirmation and removes the selected project.
- Permit Intelligence still works.
- Professional and DIY estimates display.
- Project workspace shows category-specific imagery.

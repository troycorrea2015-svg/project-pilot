PROJECT PILOT — SPRINT 3.0A ADMIN ACCESS HOTFIX

WHAT THIS FIX DOES
- Prevents the /admin page from silently sending you elsewhere.
- Shows the exact signed-in email when admin access is missing.
- Checks admin access through both the profile record and the secure Supabase admin function.
- Adds an idempotent Supabase repair migration for existing accounts.

INSTALL
1. Copy the contents of this patch into the main Project Pilot repository folder.
2. Replace matching files.
3. Open Supabase > SQL Editor.
4. Run supabase/migrations/010_admin_access_repair.sql.
5. Run this statement separately, replacing the email:

update public.profiles p
set is_admin = true,
    updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('YOUR_PROJECT_PILOT_LOGIN_EMAIL');

6. Verify with:

select u.email, p.is_admin
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = lower('YOUR_PROJECT_PILOT_LOGIN_EMAIL');

The result must show is_admin = true.

7. Commit and push the patch through GitHub Desktop.
8. Wait for the Vercel production deployment to show Ready.
9. Sign out of Project Pilot, sign back in, and open /admin.

IMPORTANT
If /admin still opens the normal dashboard after this exact patch is deployed, Vercel is connected to a different repository or production branch than the repository you updated.

# Project Pilot Next.js rebuild

This is the full-stack replacement for the earlier static prototype.

## Why this version fixes the API problem

The website and `/api/lookup` route are part of the same Next.js project. Vercel detects the framework and deploys the API as a server function, so the browser receives JSON rather than a static 404 HTML page.

## Replace the current GitHub repository

The cleanest method is to delete the old repository files, then upload the contents of this folder:

- `app/`
- `package.json`
- `README.md`

Do not upload the ZIP itself and do not add `vercel.json`.

## Vercel

Import or redeploy the repository. Vercel should display **Framework Preset: Next.js**.

No OpenAI key is required for this release. The address lookup uses the U.S. Census geocoder server-side and the app contains starter official-source records for Milford, Dover, and Sussex County.

## Test

- Address: `10 NW Front Street`
- ZIP: `19963`
- Project: `Fence`

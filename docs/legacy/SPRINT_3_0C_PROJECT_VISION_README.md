# Project Pilot Sprint 3.0C — Su Project Vision

Sprint 3.0C adds the complete Project Vision workflow to the existing Sprint 3.0B revenue-launch code.

## Product behavior

A signed-in project owner uploads an original photo of their own property or project area. Su sends that private original to a server-only image-editing route and saves the resulting proposed concept as a version connected to the original. The user can compare the two with a slider, request another revision, select a favorite concept, and later upload a separate real completed-project photo.

The application does not pull a replacement property from the internet and does not present an AI concept as an actual after photo.

## Main additions

- Private original-photo uploads through Supabase Storage
- Server-side OpenAI image editing
- Property-preservation prompt rules
- Before/AI comparison slider
- Version history and favorite concept
- Actual completed-project photo upload
- Project, dashboard, and homepage integration
- Mobile camera/photo-library support
- Per-account daily generation cap
- Private signed image URLs
- Idempotent Supabase migration and RLS policies

## Server route

`app/api/project-vision/generate/route.js`

The route authenticates the Supabase access token, verifies that the user owns the project and original asset, applies the daily limit, downloads the original from private storage, calls the OpenAI image edit endpoint, uploads the result to private storage, and records the completed concept.

## Environment variables

```env
OPENAI_API_KEY=
PROJECT_VISION_ENABLED=true
PROJECT_VISION_DAILY_LIMIT=5
OPENAI_IMAGE_MODEL=gpt-image-1
OPENAI_IMAGE_SIZE=
OPENAI_IMAGE_QUALITY=high
OPENAI_IMAGE_INPUT_FIDELITY=high
```

`SUPABASE_SERVICE_ROLE_KEY` is also required by the server route. Never expose either secret with a `NEXT_PUBLIC_` prefix.

## Database

The repository includes:

`supabase/migrations/011_project_vision_3_0c.sql`

For Troy's current Supabase project, the migration and policy repair already succeeded. The file is included so GitHub accurately records the production database schema; it does not need to be run again now.

## Cost control

`PROJECT_VISION_DAILY_LIMIT` controls the maximum number of generation requests per account per UTC day. Start low during testing. `PROJECT_VISION_ENABLED=false` pauses generation without removing uploads or saved concepts.

## Marketplace isolation

Sprint 3.0C does not modify Stripe checkout, webhook, refund, lead pricing, contractor ranking, or the `MARKETPLACE_PAYMENTS_ENABLED` value.

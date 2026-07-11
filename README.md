# Project Pilot — Real Delaware Data Update

This version adds the first real permit-data engine.

## What it does

- Sends the full address to the free U.S. Census geocoder.
- Returns a standardized matched address when available.
- Selects a supported Delaware starter jurisdiction.
- Displays verified facts from official government pages.
- Provides direct official permit, application, zoning, and contractor-verification links.
- Does not invent fees, code sections, or approval timelines.

## Supported starter records

- City of Milford
- City of Dover
- Sussex County starter routing

This is not yet every Delaware municipality. More verified records must be added jurisdiction by jurisdiction.

## Upload to GitHub

Upload and replace:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`
- `api/lookup.js`

Keep `api/roadmap.js` if you already uploaded it. Do not add `vercel.json`.

After committing to `main`, Vercel should deploy automatically.

## Test

Use:

- Address: `10 NW Front Street`
- ZIP: `19963`
- Project: `Fence`

The result should display:

- matched address when the Census service recognizes it
- City of Milford official facts
- Milford official permit and zoning links
- Delaware contractor verification links

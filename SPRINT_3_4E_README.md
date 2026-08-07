# Sprint 3.4E — Free Integrated Contractor Finder

This replaces the paid Places-powered contractor-card approach with a Google Maps Embed approach.

## User experience

A homeowner opens the Contractors area and Project Pilot automatically uses:
- the saved project
- the inferred trade/professional type
- the saved property/project location

to construct a local Google Maps search inside the Project Pilot page.

Users can also:
- change the professional type
- adjust the location
- open the full result set in Google Maps
- open official Delaware contractor/business/professional verification resources

## Cost design

The page does not call Google Places Text Search and therefore does not pull ratings, phone numbers, websites, or review counts into custom Project Pilot cards.
Those business details remain inside the Google Maps interface.

This is intentional to keep contractor discovery on Google's no-charge Maps Embed SKU.

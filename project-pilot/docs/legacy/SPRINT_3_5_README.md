# Project Pilot Sprint 3.5 — Su Guided Autopilot

## Product principle

**The homeowner should not have to understand Project Pilot before Project Pilot can help them.**

Sprint 3.5 changes the product from a collection of tools the homeowner must navigate into a guided flow where Su helps determine the next action and routes the homeowner to the right place.

## New first-use experience

The old setup asked the user for project type, project name, description, address, timeline, role, and budget through multiple wizard screens.

The new setup begins with one prompt:

> What do you want to build, repair, or improve?

Project Pilot creates the workspace immediately. Su then gathers only the information required for the next stage, one question at a time.

## Guided navigation

Su can attach an in-app destination to its response. The interface renders a **Take me there** action. Explicit commands such as “take me to permits” can navigate automatically.

This reduces the need for the homeowner to understand the sidebar, feature names, or correct workflow order.

## Permit simplification

The customer-facing Permit screen now emphasizes:

1. Match the project to the permit route.
2. Use Permit Autopilot one question at a time.
3. Build the permit application package.

The old duplicate research/estimator interface is removed from the normal permit flow.

## No migration

Sprint 3.5 uses the existing Project Pilot project, conversation, permit, document, and OpenAI infrastructure. No new Supabase migration or Vercel environment variable is required.

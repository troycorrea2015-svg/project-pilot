# Sprint 3.6 — Full-Service Permit Operations

This sprint is the foundation for making permit execution the core Project Pilot differentiator.

## Customer side
- One-click full-service permit start
- Explicit authorization record
- Project Pilot owns the default work queue
- Simple "Project Pilot is handling this" status
- Homeowner sees only required personal actions
- Permit messages and timeline stay attached to the project
- Existing detailed permit tools are collapsed under Permit Details

## Admin side
- Full-service case control
- Coordinator assignment
- Official agency + filing-mode verification
- Authorization audit record
- Project Pilot vs. homeowner task queue
- Correction rounds
- Inspection tracking
- Customer communication
- Auditable event timeline
- Verified jurisdiction-playbook signal

## Database
Migration 016 adds the authorization, events, corrections, inspections, and jurisdiction-playbook layers required to run the service responsibly.

## Important
This sprint creates the software and operating structure for full-service permitting. Project Pilot still needs a real human operating process and verified jurisdiction playbooks for the locations/project types it promises to handle.

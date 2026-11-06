---
schema_version: 1
kind: spec
id: "{{SITE_ID}}"                 # stable slug, e.g. acme-2026
client: "{{CLIENT_NAME}}"
vertical: "{{VERTICAL}}"          # e.g. architecture, hospitality, fashion
audience: "{{PRIMARY_AUDIENCE}}"
core_requirements:
  - id: R-01
    statement: "{{REQUIREMENT_STATEMENT}}"
    priority: must                # must | should
  - id: R-02
    statement: "{{SECOND_REQUIREMENT_STATEMENT}}"
    priority: should
---

# Spec — {{CLIENT_NAME}}

> Copy this file to `.factory/spec.md` and replace every `{{PLACEHOLDER}}`.
> Keep the frontmatter valid YAML and the requirement IDs stable; tasks and
> acceptance criteria reference them.

## Problem

What the page must achieve, who it is for and why the current state is
insufficient.

## Pages

- `/` — the single deliverable page (one page is the default; list each page if
  the ticket explicitly covers more).

## Content inputs

- Real copy, brand assets, photography/video and font licences supplied by the
  client. List the source and status of each.

## Scenarios

- The three to five user situations the page must support.

## Out of scope

- What this ticket explicitly does not deliver; anything valuable beyond it
  becomes a follow-up ticket.

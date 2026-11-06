---
schema_version: 1
kind: plan
template:
  source: "factory/templates/{{TEMPLATE_NAME}}"
  version: "{{TEMPLATE_VERSION}}"
registry_items:
  - id: "{{REGISTRY_ITEM_ID}}"
    source: "packages/sections"
    action: adopt                 # adopt | restyle | new
  - id: "{{SECOND_REGISTRY_ITEM_ID}}"
    source: "packages/sections"
    action: restyle
risks:
  - id: RISK-01
    description: "{{RISK_DESCRIPTION}}"
    severity: medium              # low | medium | high
    mitigation: "{{MITIGATION}}"
budget:
  worker_turns: 8
  wall_clock: "{{WALL_CLOCK_TARGET}}"
  ci_minutes: 6
---

# Plan — {{CLIENT_NAME}}

> Copy this file to `.factory/plan.md` and replace every `{{PLACEHOLDER}}`.
> Name every registry item before writing component code, and record template
> divergence in `decisions.md`.

## Stack and template

Framework, template variant and any justified deviation from the template.

## Composition

The section order and the registry items each section composes.

## Risks

Asset gaps, WebGL on low-end mobile, video weight, legal copy, third-party
embeds, custom fonts and anything else that could invalidate the estimate.

## Estimate

Expected worker turns, wall-clock target and CI minutes. If the ticket exceeds
twice this estimate without a clear path, report `blocked` rather than grind.

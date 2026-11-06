---
schema_version: 1
kind: acceptance
criteria:
  - id: A-01
    given: "{{GIVEN}}"
    when: "{{WHEN}}"
    then: "{{THEN}}"
    checks: [BUILD-01, A11Y-01]
  - id: A-02
    given: "{{GIVEN}}"
    when: "{{WHEN}}"
    then: "{{THEN}}"
    checks: [LH-01, LH-02]
checks:
  - id: BUILD-01
    type: ci
    command: "pnpm build"
    expect: "exit code 0"
  - id: A11Y-01
    type: axe
    routes: ["{{ROUTE}}"]
    viewports: ["390x844", "768x1024", "1440x900"]
    expect: "0 critical or serious violations"
  - id: LH-01
    type: lighthouse
    routes: ["{{ROUTE}}"]
    preset: mobile
    assert:
      performance: "{{PERFORMANCE_MIN}}"   # editorial: >= 0.90; immersive: >= 0.75
      accessibility: ">= 1.00"
  - id: LH-02
    type: lighthouse
    routes: ["{{ROUTE}}"]
    preset: mobile
    assert:
      lcp_ms: "<= 2500"
      inp_ms: "<= 200"
      cls: "<= 0.1"
---

# Acceptance — {{CLIENT_NAME}}

> Copy this file to `.factory/acceptance.md` and replace every `{{PLACEHOLDER}}`.
> Every criterion must be verifiable by a named check; run checks from the
> site's own directory, not the factory workspace root.

## Criteria

Each `A-NN` criterion maps to one or more `checks` IDs. Rewrite the
Given/When/Then into something a machine can decide: a build result, an axe
violation count, a Lighthouse threshold or a link-check result.

## Evidence matrix

| Route | Viewport | Theme | Check IDs | Evidence file |
| --- | --- | --- | --- | --- |
| `/` | 390x844 | light | A-01, A-02 | `after-390-light.webp` |
| `/` | 768x1024 | light | A-02 | `after-768-light.webp` |
| `/` | 1440x900 | light | A-01, A-02 | `after-1440-light.webp` |

## Blocking conditions

List the checks that must pass before the PR leaves draft, and the known
limitations that will be stated honestly in the PR description.

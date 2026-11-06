---
schema_version: 1
kind: tasks
tasks:
  - id: T-01
    title: "{{TASK_TITLE}}"
    depends_on: []
    evidence: ["build"]
    status: pending               # pending | in_progress | done | blocked
  - id: T-02
    title: "{{NEXT_TASK_TITLE}}"
    depends_on: [T-01]
    evidence: ["screenshot-390", "screenshot-768", "screenshot-1440"]
    status: pending
  - id: T-03
    title: "{{FINAL_TASK_TITLE}}"
    depends_on: [T-02]
    evidence: ["build", "axe", "lighthouse"]
    status: pending
---

# Tasks — {{CLIENT_NAME}}

> Copy this file to `.factory/tasks.md` and replace every `{{PLACEHOLDER}}`.
> Keep task IDs stable and ordered; commit per task or per section.

## T-01 — {{TASK_TITLE}}

What changes, where, and the check that proves it is done.

## T-02 — {{NEXT_TASK_TITLE}}

What changes, where, and the check that proves it is done.

## T-03 — {{FINAL_TASK_TITLE}}

What changes, where, and the check that proves it is done.

## Dependencies

State any task that must wait for assets, access or a human decision. Do not
invent a task that is not in the approved spec pack.

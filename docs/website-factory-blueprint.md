# Autonomous Website Factory — Architecture Blueprint

> **Status:** Design blueprint, v1 — for review.
> **Date:** 2026-11-04
> **Scope:** research, architecture, and an actionable roadmap. This PR does not implement the factory.
> **Audience:** the team operating the factory, the creative reviewers, and the agents that will run it.

This document specifies an end-to-end **Autonomous Website Factory**: a system that takes a client brief, routes it through DeepSeek SuperAgent (`dsh-superagent`), builds the site in an isolated git worktree, verifies it with deterministic checks, and hands a human a reviewable pull request with a live preview and visual evidence. It covers the five areas requested in [issue #4](https://github.com/niall289/superagent-test/issues/4), plus a dedicated research section on the skills, repositories and UI libraries the factory should incorporate, requested in review:

1. [Factory operating model](#1-factory-operating-model)
2. [Framework and template evaluation](#2-framework-and-template-evaluation)
3. [Industry state of the art](#3-industry-state-of-the-art)
4. [Skills and self-installation](#4-skills-and-self-installation)
5. [Actionable roadmap](#5-actionable-roadmap)
6. [Research: skills, repositories and UI libraries](#6-research-skills-repositories-and-ui-libraries)

The recommendations are opinionated. Where two options are close, the document names a default, the trade-off, and the condition that should change it.

**Method.** The operating model was derived from the `dsh-superagent` domain, execution and architecture documents and checked against the running harness. Framework versions were read from the npm registry on 2026-11-04 and pinned in the toolchain table; speed and token figures are labelled as hypotheses for Phase 0 to measure. Industry claims are cited in [Appendix F](#f-references); decisions that need the team are listed in [§5.8](#58-open-questions-for-review).

---

## Contents

- [Executive summary](#executive-summary)
- [1. Factory operating model](#1-factory-operating-model)
  - [1.1 Design principles](#11-design-principles)
  - [1.2 Roles and separation of concerns](#12-roles-and-separation-of-concerns)
  - [1.3 The pipeline, stage by stage](#13-the-pipeline-stage-by-stage)
  - [1.4 Worktrees, branches and pull requests](#14-worktrees-branches-and-pull-requests)
  - [1.5 The ticket contract](#15-the-ticket-contract)
  - [1.6 Scheduling, concurrency and budgets](#16-scheduling-concurrency-and-budgets)
  - [1.7 Failure modes and recovery](#17-failure-modes-and-recovery)
  - [1.8 Human review protocol](#18-human-review-protocol)
  - [1.9 Factory metrics and SLOs](#19-factory-metrics-and-slos)
- [2. Framework and template evaluation](#2-framework-and-template-evaluation)
  - [2.1 Evaluation criteria](#21-evaluation-criteria)
  - [2.2 Candidate comparison](#22-candidate-comparison)
  - [2.3 Lane A: Editorial Luxury](#23-lane-a-editorial-luxury)
  - [2.4 Lane B: Immersive 3D and Video](#24-lane-b-immersive-3d-and-video)
  - [2.5 Why Next.js is not the default](#25-why-nextjs-is-not-the-default)
  - [2.6 Build speed, fragility and token efficiency](#26-build-speed-fragility-and-token-efficiency)
  - [2.7 What every template must contain](#27-what-every-template-must-contain)
- [3. Industry state of the art](#3-industry-state-of-the-art)
  - [3.1 What juries and studios reward](#31-what-juries-and-studios-reward)
  - [3.2 Design-engineering standards](#32-design-engineering-standards)
  - [3.3 The anti-slop taxonomy](#33-the-anti-slop-taxonomy)
  - [3.4 Motion, accessibility and performance as craft](#34-motion-accessibility-and-performance-as-craft)
  - [3.5 The craft rubric](#35-the-craft-rubric)
  - [3.6 What this means for prompts and skills](#36-what-this-means-for-prompts-and-skills)
- [4. Skills and self-installation](#4-skills-and-self-installation)
  - [4.1 Toolchain baseline](#41-toolchain-baseline)
  - [4.2 Skill inventory](#42-skill-inventory)
  - [4.3 Skill anatomy and loading](#43-skill-anatomy-and-loading)
  - [4.4 The self-installation protocol](#44-the-self-installation-protocol)
  - [4.5 Self-verification, drift and upgrades](#45-self-verification-drift-and-upgrades)
  - [4.6 Security, secrets and supply chain](#46-security-secrets-and-supply-chain)
- [5. Actionable roadmap](#5-actionable-roadmap)
  - [5.1 Repository layout](#51-repository-layout)
  - [5.2 Template scaffolding](#52-template-scaffolding)
  - [5.3 CI/CD and preview deployment](#53-cicd-and-preview-deployment)
  - [5.4 DSH configuration for the factory](#54-dsh-configuration-for-the-factory)
  - [5.5 Phased plan](#55-phased-plan)
  - [5.6 Risk register](#56-risk-register)
  - [5.7 First tickets](#57-first-tickets)
  - [5.8 Open questions for review](#58-open-questions-for-review)
- [6. Research: skills, repositories and UI libraries](#6-research-skills-repositories-and-ui-libraries)
  - [6.0 Adoption tiers](#60-adoption-tiers)
  - [6.1 Award and motion repositories](#61-award-and-motion-repositories)
  - [6.2 Component and section libraries](#62-component-and-section-libraries)
  - [6.3 Advanced agent skills and toolchains](#63-advanced-agent-skills-and-toolchains)
  - [6.4 Self-installation and integration matrix](#64-self-installation-and-integration-matrix)
- [Appendices](#appendices)
  - [A. Brief intake schema](#a-brief-intake-schema)
  - [B. Design QA checklist](#b-design-qa-checklist)
  - [C. Anti-slop checklist](#c-anti-slop-checklist)
  - [D. Prepare command](#d-prepare-command)
  - [E. Verification workflow skeleton](#e-verification-workflow-skeleton)
  - [F. References](#f-references)

---

## Executive summary

The factory is **a review-throughput system, not a website builder**. Its unit of work is one brief → one branch → one preview → one human decision. Everything else — templates, skills, CI, prompts — exists to make that loop fast, evidence-rich and cheap in human attention.

The recommended shape:

| Area | Default | Why |
| --- | --- | --- |
| Orchestration | DSH main Session (`dsh-superagent` router) | Gates and routes work; never writes code |
| Execution | One DSH worker Session per ticket, in its own git worktree | Isolation, one branch per PR, resumable across restarts |
| Lane A — Editorial Luxury | **Astro 7** + TypeScript + Tailwind 4 + GSAP + Lenis, static output | HTML-first, near-zero JS by default, strong content model, fast builds |
| Lane B — Immersive 3D/Video | **Vite 8** + React 19 + React Three Fiber/Three.js + GSAP + Lenis | The least abstraction between agent and WebGL; fastest iteration |
| Framework escape hatch | Next.js 16 only for app-like requirements (auth, commerce, ISR) | Heavier concept surface and build cost; rarely needed for award-tier marketing sites |
| Preview | **Cloudflare Pages** preview deployment per PR | Per-commit URL, static output, cheap, fast |
| Merge | **A person** merges every site PR | Design approval is human; the factory never self-merges |
| Evidence | Playwright before/after captures + Lighthouse CI + axe | Makes craft reviewable without a local checkout |
| Skills | Versioned in the factory repo, registered through DSH prompt config | Agents load only the knowledge a task needs |
| Repo | One factory monorepo first; split per client when isolation demands it | Shared tooling, one CI, small blast radius at low volume |

**Targets** (to be validated in Phase 0; see [§5.5](#55-phased-plan)):

| Metric | Target |
| --- | --- |
| One-page editorial site: accepted brief → preview URL | ≤ 60 min worker time |
| Immersive landing page: accepted brief → preview URL | ≤ 4 h worker time |
| Human review time per site | ≤ 15 min editorial / ≤ 30 min immersive |
| First-pass CI green rate | ≥ 70% |
| Lighthouse (mobile): editorial / immersive | ≥ 90 / ≥ 75 performance, 100 accessibility |
| Critical accessibility defects reaching review | 0 |
| Rework tickets per site | ≤ 1 |

The rest of the document explains how to get there, what to install, and what to write down so the agents produce craft rather than slop.

**Non-goals for v1:** a CMS authoring product, an e-commerce backend, fully autonomous client communication, replacing the creative director, and a multi-tenant site platform. The factory produces marketing and brand sites; application work follows the Next.js exception path or stays with the application team.

---

## 1. Factory operating model

### 1.1 Design principles

1. **One brief, one ticket, one branch, one PR.** A ticket is the unit of authorization, isolation and review. Work that does not fit the ticket becomes a new ticket, not an expanded diff.
2. **The orchestrator routes; workers build.** The main Session never implements, debugs or styles. It gates intake, classifies the lane, writes the mandate and reports outcomes.
3. **Evidence over assertion.** A worker's claim that a page is good is a hypothesis until a screenshot, a Lighthouse run and a passing build exist.
4. **Humans own taste and merge.** Agents can propose, implement and prove. A person approves direction and merges. The factory never self-merges a site.
5. **Attention is the scarce resource.** Every message, review round and question costs a person. Default to silence while work is healthy; interrupt only for a ready result, a concrete decision, or a real blocker.
6. **Deterministic where possible, agentic where necessary.** Builds, tests, budgets and previews are deterministic. Art direction, copy and motion are agentic, bounded by skills and rubrics.
7. **Template before invention.** Every site starts from a maintained template. Divergence is recorded as a decision with a reason, not improvised.
8. **Small blast radius.** One worktree, one branch, one site path, scoped CI, scoped deploy credentials.

### 1.2 Roles and separation of concerns

| Role | Who | Owns | Does **not** |
| --- | --- | --- | --- |
| Brief owner | Client or producer (human) | The brief, brand assets, deadlines, acceptance | Choose frameworks or edit code |
| Creative director | Senior designer (human) | Art direction, final visual approval, lane fit | Implement or debug |
| Orchestrator | DSH main Session | Intake gate, assessment, mandate, routing, status, final notification | Write code, inspect implementation outside assessment, style, fix CI |
| Worker | DSH Executor Session per ticket | Plan, implement, verify, evidence, PR, review fixes | Approve its own work, merge, message the client directly |
| Design QA | A second worker ticket, or a worker subagent | Independent rubric scoring, visual/a11y audit | Change the site unless the finding is in scope |
| CI | GitHub Actions | Deterministic checks: build, types, lint, tests, a11y, perf, visual diff | Judge taste |
| Deployer | Human who merges; automation after merge | Production release | Bypass required checks |
| Factory maintainer | Human + upkeep ticket | Templates, skills, toolchain, CI | Client delivery |

Mapping to `dsh-superagent` concepts:

| Factory concept | DSH concept |
| --- | --- |
| Brief submitted on GitHub Issue / Feishu | Trigger → Thread |
| Intake gate and lane classification | Eval (gate + assessment) → Decision |
| Accepted website work | Ticket + immutable Mandate (scope, lane, strength) |
| Worker run on the site | Assignment → Executor Session + ticket directory |
| Human comments on the PR | Subscription fan-out → resumes the same ticket |
| PR, preview comment, review replies | Channels |
| Final handoff message | Report (`ready` / `blocked` / `failed` / `dropped`) |

The important rule is the one already enforced by the harness: **the orchestrator assesses with bounded context and routes; the worker owns investigation, implementation and verification.** The factory adds domain rules on top — lane, template, evidence, rubric — but it does not collapse the roles.

### 1.3 The pipeline, stage by stage

```mermaid
flowchart LR
  B[Brief<br/>GitHub Issue / Feishu] --> G{Gate:<br/>complete + allowed}
  G -->|incomplete| Q[One structured question]
  Q --> B
  G -->|accepted| T[Ticket + Mandate<br/>lane · template · scope]
  T --> P[Prepare<br/>worktree + scaffold + doctor]
  P --> W[Worker<br/>plan → build → evidence]
  W --> C{CI<br/>build · a11y · perf · visual}
  C -->|fail| W
  C -->|pass| PR[PR + preview URL<br/>before/after evidence]
  PR --> R{Human review}
  R -->|changes| W
  R -->|approve + merge| D[Production deploy<br/>smoke + monitoring]
  D --> M[Post-launch]
  M -->|new request| T
```

| # | Stage | Input | Output | Gate | Target |
| --- | --- | --- | --- | --- | --- |
| 0 | Intake | Brief form or message | Structured brief | Required fields present | Instant |
| 1 | Assessment | Brief + repo + references | Lane, template, risks, estimate | Allowed sender; scope fits factory | < 5 min |
| 2 | Mandate | Decision | Ticket with scope, lane, template, acceptance criteria | Orchestrator only | Instant |
| 3 | Prepare | Ticket | Worktree, branch, scaffold, toolchain check | Prepare command succeeds | < 2 min |
| 4 | Build | Brief + template | Site code, plan, screenshots | Worker self-review | Editorial < 45 min |
| 5 | Verify | Branch | Green CI + evidence manifest | All required checks | < 6 min CI |
| 6 | Review | PR + preview | Approval or change request | Human | ≤ 15 min |
| 7 | Release | Merged PR | Production deploy | Required checks + approval | < 5 min |
| 8 | Post-launch | Live site | Monitoring, follow-ups | — | Ongoing |

#### Stage 0 — Intake

Use a GitHub Issue Form (or a Feishu brief message for internal work) with a fixed schema. The form is the first quality gate: a brief without a client, a goal, real copy inputs, references and brand assets is not accepted.

Minimum viable brief:

- client / project slug and lane (`editorial` or `immersive`);
- one-sentence business goal and primary call to action;
- audience and tone (three adjectives, with one anti-reference);
- page list (default: one page, max eight);
- brand assets: logo, fonts, colours, photography/video, licensing status;
- three reference sites and what specifically to borrow from each;
- must-avoid list (clichés, competitor looks, colours, motion);
- constraints: deadline, languages, legal/regulatory, integrations;
- acceptance criteria in plain language.

The full schema is in [Appendix A](#a-brief-intake-schema).

#### Stage 1 — Assessment

The orchestrator reads only the brief, the repository's factory docs and the references. It answers five questions:

1. **Is this website work?** If not, hand back or ignore.
2. **Which lane and template?** Editorial Luxury or Immersive 3D/Video, with the closest template variant.
3. **Is it in scope for one ticket?** One site or one landing page is the default. A multi-page site with CMS, auth or commerce is split into tickets.
4. **What is risky?** Missing assets, WebGL on low-end mobile, video weight, legal copy, third-party embeds, custom fonts.
5. **What does "done" mean?** Acceptance criteria copied from the brief, plus factory standards.

If a required input is missing, the orchestrator asks **one** concrete question and stops. It does not start a build on assumptions that will be expensive to reverse.

#### Stage 2 — Mandate

The ticket records an immutable mandate: who asked, on which source, with what strength, the policy version, the lane, the template, the site slug, the page list, the acceptance criteria and the evidence required. A wider request means a new ticket; a follow-up on the same PR stays on the ticket.

#### Stage 3 — Prepare

The prepare command runs once per ticket, in the execution root, before the first worker turn. It:

1. fetches `origin/main` and creates a worktree at the ticket directory;
2. creates the branch `agent/<ticket-short-name>` (a resumed ticket keeps its commits);
3. installs dependencies from the lockfile;
4. runs the factory doctor;
5. records the baseline source — the current production URL for a redesign, or an explicit "no baseline" for a new site — for the worker's first evidence run.

A failed prepare fails the ticket and records the output. It is not retried automatically; a person's message or a retry re-runs it. Keep it idempotent.

#### Stage 4 — Build

The worker begins by writing `.factory/plan.md`: sections, content needs, motion plan, asset plan, risks and a token/time estimate. Then it builds in vertical slices — one section at a time — capturing a screenshot after each slice at 390, 768 and 1440 px. It self-scores against the rubric before asking for review. It opens the PR as a draft early only to bind the branch, and keeps it internal until the evidence is complete.

The worker must not expand the brief. A better idea becomes a note in `decisions.md` and, if valuable, a follow-up ticket.

#### Stage 5 — Verify

Required checks, in order of speed:

1. install with `--frozen-lockfile`;
2. typecheck;
3. lint/format;
4. unit tests (content schema, utilities);
5. production build;
6. accessibility scan (axe) on every route;
7. visual regression on a fixed viewport/theme matrix;
8. Lighthouse CI budgets;
9. link check and asset-size budget;
10. preview deploy and a smoke test against the preview URL.

The worker fixes failures until green, or reports `blocked` with the exact failing check and evidence.

#### Stage 6 — Review

The PR description is the review surface: what changed, why, preview URL, before/after evidence, checks, and known limitations. A person reviews direction, not implementation minutiae. Review comments resume the ticket; the worker fixes, pushes, re-verifies and resolves its threads. Automated reviewer suggestions are assessed, not blindly implemented; at most three rounds per automated reviewer.

#### Stage 7 — Release

A person merges. Merging to `main` triggers the production workflow: build, deploy, smoke test (status, title, primary CTA, no console errors), and a post-deploy Lighthouse run. DNS and domain changes are human steps.

#### Stage 8 — Post-launch

Monitoring, analytics, content updates and iteration requests arrive as new messages on the PR/issue thread. They resume the ticket under the same mandate if they are in scope, or become a new ticket.

### 1.4 Worktrees, branches and pull requests

One ticket = one worktree = one branch = one PR.

```text
execution root (~/.dsh/state/superagent/work/)
└── <ticket-short-name>/            ← git worktree, branch agent/<ticket-short-name>
    ├── .factory/                   ← ephemeral: plan, decisions, evidence
    ├── sites/<client-slug>/        ← the deliverable
    └── ...                         ← factory code, templates, skills
```

Rules:

- Branch name **must** end with the ticket short name so DSH binds the PR to the ticket.
- `main` is protected: no direct pushes, required checks, one approval, linear history, no force-push.
- The worker commits in small, reviewable units, as the deployment's agent account.
- Worktrees are never reused across tickets. A resumed ticket keeps its worktree.
- Cleanup happens only after the PR is merged/closed and the ticket has ended: `git worktree remove` for known-merged paths, then `git worktree prune`. Never delete a directory a live ticket owns.

Prepare command (also in [Appendix D](#d-prepare-command)):

```sh
#!/bin/sh
set -eu

repo="$HOME/src/website-factory"
branch="agent/$DSH_SUPERAGENT_NAME"

git -C "$repo" fetch origin main --quiet

if [ -e "$DSH_SUPERAGENT_DIR/.git" ]; then
  # Resumed ticket: keep the branch and any work already committed.
  cd "$DSH_SUPERAGENT_DIR"
else
  git -C "$repo" worktree add "$DSH_SUPERAGENT_DIR" -B "$branch" origin/main
  cd "$DSH_SUPERAGENT_DIR"
fi

pnpm install --frozen-lockfile
pnpm factory:doctor --ci
```

Notes:

- The branch is created only on the first successful run; a resumed ticket keeps its commits.
- If the directory exists but is not a git worktree, prepare fails with a clear message instead of deleting it.
- The doctor is read-only in `--ci` mode; it reports, it does not install.
- The worker's first turn checks `git status`, `git log --oneline -5` and the doctor output before touching code.

### 1.5 The ticket contract

Every ticket carries the same artifacts, whether the worker is human-supervised or autonomous:

```text
.factory/
├── plan.md            # sections, content, motion, assets, estimate
├── decisions.md       # deviations from the template and why
├── evidence/
│   ├── manifest.json  # url, viewport, theme, hash, timestamp
│   ├── baseline-*.webp
│   └── after-*.webp
└── verify.log         # last full check run (trimmed)
```

Durable artifacts are committed under `sites/<slug>/docs/`: `brief.md`, `decisions.md`, `LICENSES.md`, and the final evidence images referenced from the PR. Ephemeral planning stays in `.factory/` and is not committed.

The worker's report distinguishes:

- **completed**: implementation, checks and evidence all exist;
- **incomplete draft**: PR exists, but something named is missing;
- **blocked**: a human decision, permission or resource is required;
- **dropped**: no useful change is possible or the request does not hold.

### 1.6 Scheduling, concurrency and budgets

DSH gives the factory a bounded worker pool. Use it deliberately:

- `maxWorkers`: start at 2 (one per lane), then 4 when CI and review keep up.
- A person's message gets the extra slot, so a review fix never waits behind new builds.
- Priority order: **review fixes > blocked-ticket recovery > new builds > template/skill upkeep**.
- One ticket per site; do not parallelise sections across workers — merge conflicts and inconsistent art direction cost more than they save.
- Background jobs (dev server, screenshots) are allowed; the worker keeps working or ends its turn, and the job result wakes it. A server offered for human review may outlive the turn.
- Every plan includes a **budget guard**: expected worker turns, token estimate and wall-clock target. If a ticket exceeds 2× the estimate without a clear path, the worker reports `blocked` with what it tried, rather than grinding.

Labels drive routing:

| Label | Meaning |
| --- | --- |
| `factory` | Accepted website work |
| `lane:editorial` / `lane:immersive` | Lane and template family |
| `priority:review-fix` | Human review comment waiting |
| `priority:pilot` | Time-boxed pilot with extra human observation |
| `factory:blocked-upstream` | Waiting on assets, access or a decision |
| `factory:upkeep` | Templates, skills, toolchain, CI |

### 1.7 Failure modes and recovery

| Failure | Symptom | Response |
| --- | --- | --- |
| Incomplete brief | Missing copy, assets or references | One structured question; do not start |
| Missing brand assets | Worker invents a look | Stop; request assets or approve a documented placeholder direction |
| WebGL too slow on mid-tier mobile | Frame drops, battery drain | Fallback poster/video, reduced scene, DPR cap; if still failing, report |
| Video too heavy | LCP or bandwidth budget blown | Compress, shorten, lazy-load, poster-first, `preload="none"` |
| CI flake | Different result on rerun | Retry once, then isolate; never merge on a flaky check |
| Merge conflict | Branch behind `main` | Rebase on `origin/main`, re-run checks, force-push with lease |
| Preview deploy fails | No URL | Treat as blocked; check token, project, build output |
| Review churn | Endless small comments | Consolidate into one change request; rubric-driven review |
| Model/tool loop | Repeated failed attempts | Report `blocked` after three distinct approaches; include logs |
| Worktree leak | Disk growth, stale branches | Weekly janitor ticket; prune only merged/closed worktrees |
| Prompt injection in brief/content | Worker follows text found in a document | Briefs are data; only the system prompt, mandate and skills instruct; flag and drop |

Recovery rules:

- A retry starts a new Assignment in the same Session, directory, branch and PR.
- A blocked or failed ticket keeps its tools available so a person can continue directly.
- CI and bot messages are recorded but do not wake a blocked ticket.
- Never bypass a safety or permission failure to "make progress". Report the concrete constraint.

### 1.8 Human review protocol

The review is a design review, not a code review. The human reviewer has 15 minutes and four questions:

1. **Does it answer the brief?** Goal, audience, message, CTA.
2. **Is the art direction specific?** Type, palette, composition, imagery — would this look like the client and not like a template?
3. **Does it feel good?** Motion, pacing, states, mobile.
4. **Is it trustworthy?** Performance, accessibility, real copy, no broken links, no console errors.

Reviewers:

- use review threads with file/line anchors for code-adjacent comments;
- put direction comments on the PR conversation, one consolidated comment per round;
- do not rewrite the worker's code in review; ask for the change;
- approve only when the evidence covers the same commit that will merge.

The worker:

- resolves its own fixed threads silently;
- leaves one factual reason when declining a suggestion;
- requests a re-review only after checks are green;
- never merges or enables auto-merge.

### 1.9 Factory metrics and SLOs

Instrument from the first pilot. Without measurement, "the factory is fast" is an opinion.

| Metric | Definition | Target |
| --- | --- | --- |
| Lead time | Accepted → preview URL | Editorial ≤ 60 min; immersive ≤ 4 h |
| Review latency | Preview → first human response | ≤ 1 business day |
| Human minutes | Reviewer + creative director time | ≤ 15 / ≤ 30 min |
| First-pass green | CI green before first human review | ≥ 70% |
| Rework | Follow-up tickets caused by missed acceptance criteria | ≤ 1 per site |
| Craft score | Rubric score at approval | ≥ 80; award-track ≥ 90 |
| Perf | Lighthouse mobile performance | ≥ 90 editorial / ≥ 75 immersive |
| A11y | axe critical/serious findings | 0 |
| Cost | Tokens + CI minutes per accepted site | Declining quarter over quarter |
| Reuse | Sites built without template forks | ≥ 80% |

Review the metrics monthly. When the factory is noisy or slow, shorten prompts and tighten templates; do not add more messages or more agents.

---

## 2. Framework and template evaluation

### 2.1 Evaluation criteria

The factory optimises for **accepted sites per human hour**, not for developer familiarity. That changes the weighting: agent legibility and runtime performance matter more than ecosystem fashion.

| Criterion | Weight | What it means for an autonomous build |
| --- | --- | --- |
| Agent legibility and token efficiency | 20 | How few concepts, files and retries an agent needs to produce a correct page; how clear errors are; how much framework magic must be held in context |
| Build and iteration speed | 15 | Cold install, cold build, HMR, CI duration; fast feedback shortens the agent loop |
| Runtime performance ceiling | 15 | Shipped JS, image/video handling, Core Web Vitals headroom |
| Motion and 3D ceiling | 15 | How directly GSAP, scroll, WebGL and video can be composed without fighting the framework |
| Fragility and maintenance | 15 | Churn, breaking majors, hydration/SSR edge cases, upgrade cost |
| Ecosystem and talent | 10 | Libraries, docs, hiring, community answers the agent can retrieve |
| Content and deploy fit | 10 | Content modelling, static output, preview hosting, SEO |

### 2.2 Candidate comparison

Scores are 1–5; the weighted total uses the weights above.

| Stack | Agent | Build | Runtime | Motion/3D | Fragility | Ecosystem | Content | Weighted | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| **Astro 7** | 4 | 4 | 5 | 3 | 4 | 4 | 5 | **4.10** | **Lane A default** |
| **Vite 8 + vanilla TS** | 3 | 5 | 5 | 5 | 4 | 5 | 1 | **4.05** | Single-page microsites and art-directed experiments |
| **Vite 8 + React 19 + R3F** | 4 | 4 | 3 | 5 | 3 | 5 | 2 | **3.75** | **Lane B default** |
| SvelteKit | 3 | 4 | 5 | 4 | 4 | 3 | 4 | 3.85 | Credible alternate if the team already writes Svelte |
| Eleventy | 3 | 5 | 5 | 1 | 5 | 3 | 5 | 3.80 | Content-only fallback; weak motion ecosystem |
| Next.js 16 | 3 | 2 | 3 | 4 | 2 | 5 | 5 | 3.25 | Exception path: auth, commerce, ISR, app-like surfaces |
| Webflow / Framer | 1 | 5 | 3 | 4 | 3 | 4 | 4 | 3.25 | Handoff and prototyping tools, not factory core |

Two scores deserve explanation:

- **Vanilla Vite scores high but is not the editorial default.** It is the fastest and least fragile runtime, but a multi-page content site in vanilla TypeScript forces the agent to invent routing, content modelling, image optimisation and SEO plumbing — exactly the work that produces token burn and inconsistency. Use it for one-page, art-directed microsites where the page *is* the product.
- **Next.js scores low for this use case, not in general.** It is an excellent application framework. Its concept surface — server/client boundaries, caching, server actions, hydration — is overhead when the deliverable is a marketing site. See [§2.5](#25-why-nextjs-is-not-the-default).

### 2.3 Lane A: Editorial Luxury

**Default stack:** Astro 7 + TypeScript + Tailwind CSS 4 + GSAP 3 + Lenis, static output.

Why Astro fits editorial work:

- **HTML-first by default.** The page ships HTML and CSS; JavaScript is an explicit island or a small script, not the baseline. That is the right default for type-led editorial sites and makes performance budgets easy to hold.
- **A real content model.** Content collections with Zod schemas give the agent a typed place for copy, case studies, credits and metadata; `getCollection()` and `getStaticPaths()` are conventional and well documented.
- **Images are solved.** `astro:assets` with `<Image />` handles responsive widths, modern formats and layout-stable dimensions.
- **Page transitions without a SPA.** `<ClientRouter />` from `astro:transitions` gives cross-document transitions for editorial navigation.
- **Static output to any CDN.** `output: 'static'` produces a plain `dist/` that Cloudflare Pages serves directly; no server runtime, no cold starts.
- **GSAP and Lenis are plain browser libraries.** They run in a `<script>` or a client island, with no framework adapter in the way.

Recommended template shape:

```text
templates/editorial-base/     # shared base; editorial-serif/sans extend it
├── astro.config.mjs        # static output, sitemap, image service
├── src/
│   ├── pages/              # file-based routes
│   ├── layouts/            # BaseLayout, EditorialLayout
│   ├── components/
│   │   ├── primitives/     # Container, Stack, Grid, Text, Link, Media
│   │   └── sections/       # Hero, Manifesto, WorkGrid, Gallery, CTA
│   ├── content/            # Zod-typed copy and case studies
│   ├── styles/             # tokens.css, global.css
│   └── lib/                # seo, motion, analytics
├── public/                 # self-hosted fonts, images, og
├── tests/                  # visual, a11y, links
└── DESIGN.md               # art direction and token rationale
```

Conventions that keep the agent honest:

- One section = one component = one screenshot checkpoint.
- Copy lives in `content/`, never inline in three places; the schema rejects missing required fields.
- Motion is opt-in per section via a `data-motion` attribute, so a static page works with JavaScript disabled.
- Every page defines `title`, `description`, canonical URL and OG image in frontmatter.

Known costs:

- Astro majors move fast (5 → 7 in the time this blueprint was researched). Pin the minor, upgrade deliberately, and keep a smoke site that exercises content collections, images and view transitions.
- Islands introduce a boundary the agent must respect: do not put layout inside a hydrated island.
- The framework is excellent at static content and deliberately unopinionated about complex app state. If the brief needs accounts or checkout, use Next.js instead.

### 2.4 Lane B: Immersive 3D and Video

**Default stack:** Vite 8 + React 19 + React Three Fiber 9 / Three.js + GSAP 3 + Lenis, static build.

Why Vite + React Three Fiber for immersive work:

- **The shortest path from scene idea to pixels.** R3F's declarative scene graph, `drei` helpers and `postprocessing` are the most agent-legible WebGL stack; examples and error messages are plentiful.
- **One canvas, DOM around it.** Keep navigation, copy and CTAs in ordinary HTML for accessibility and SEO; mount the canvas as one component.
- **Vite feedback is fast.** Cold start and HMR keep the agent's edit→screenshot loop short, which matters more for 3D than for text.
- **GSAP remains the timeline layer.** Use GSAP for scroll-driven sequences and UI choreography; use `useFrame` for per-frame scene work. One clock, one ticker.

Production rules for this lane:

| Concern | Rule |
| --- | --- |
| Device pixel ratio | Clamp `dpr={[1, 1.75]}`; drop to 1 on low-end devices |
| Frame loop | `frameloop="demand"` where the scene is static; pause when offscreen or tab hidden |
| Assets | glTF + Draco/meshopt + KTX2 textures; budget < 3 MB initial scene payload |
| Video | `preload="none"`, `muted`, `playsinline`, poster-first, AV1/VP9/HEVC sources; adaptive streaming (Mux/Cloudflare Stream) for long content |
| Fallback | Poster image or short loop when WebGL is unavailable, `prefers-reduced-motion` is set, or `Save-Data` is on |
| Mobile | Test on a mid-tier Android and an iPhone; cap texture size and draw calls; watch memory |
| Loading | Real progress, not a spinner; never block the first paint on the scene |
| Sound | Off by default, explicit control, never autoplay |
| SEO | Server-rendered/static HTML shell with real content; the canvas is enhancement |

Lenis + GSAP integration is a single RAF loop:

```ts
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const lenis = new Lenis({ smoothWheel: true })
lenis.on('scroll', ScrollTrigger.update)

gsap.ticker.add((time) => lenis.raf(time * 1000))
gsap.ticker.lagSmoothing(0)
```

Do not run a second animation ticker inside R3F. Drive camera and scene uniforms from the same timeline or from `useFrame` with the shared clock.

Known costs:

- Client-side JavaScript is unavoidable; budget 180–350 KB gzipped for the app shell before assets.
- WebGL failures are environmental (GPU blocklists, memory, context loss). The fallback is part of the design, not an afterthought.
- Shader compilation and texture upload cause first-interaction jank; warm up and preload deliberately.

### 2.5 Why Next.js is not the default

Next.js is the right answer when the brief is an **application**: authenticated dashboards, commerce, personalisation, ISR-backed catalogues, server actions, edge middleware. It is the wrong default for award-tier marketing sites because:

- **Concept surface.** Server components, client boundaries, caching layers and hydration rules are four extra things an agent must get right on every file. Errors are subtle and often only appear at runtime.
- **Build cost.** Cold builds and CI are materially slower than Astro or Vite, which lengthens every iteration.
- **Client weight.** The framework runtime and hydration make tight performance budgets harder for pages that are mostly static.
- **Hydration fragility.** Mismatches between server and client output are a recurring failure mode for generated UI.
- **Token cost.** More boilerplate, more configuration and more debugging turns per accepted page.

Use Next.js when at least one of these is true:

- accounts, authentication or protected routes;
- checkout, catalogues or inventory;
- personalisation or A/B infrastructure that needs a server;
- a CMS with draft preview and ISR;
- an existing Next.js codebase the client will maintain.

When it is used, keep it boring: App Router, static rendering wherever possible, `next/image`, `next/font`, explicit cache directives, bundle analysis in CI, and the same evidence pipeline as every other lane.

### 2.6 Build speed, fragility and token efficiency

#### Benchmark protocol

Do not trust vendor benchmarks or this document's estimates. Phase 0 builds the same reference site in all three stacks and records:

- cold install, cold build, warm build and dev-server ready time;
- CI wall-clock for the full verify job;
- output JS (gzip) and total page weight;
- Lighthouse mobile performance and LCP;
- agent tokens, turns and failed checks for the same page (from DSH reports and `git diff --stat`).

Reference site: 6 pages, 10 section types, 20 images, 2 variable fonts, 3 GSAP timelines, 1 contact form, 1 case-study collection.

Expected shape (hypothesis to validate):

| Stack | Cold build (6 pages) | Shipped JS | Agent tokens per accepted page | Main fragility |
| --- | --- | --- | --- | --- |
| Astro | 8–20 s | 0–40 KB | 0.8× | Major-version churn; island boundaries |
| Vite + vanilla | 3–8 s | 20–60 KB | 0.9× | Agent invents structure; no content model |
| Vite + R3F | 5–12 s | 180–350 KB | 1.1× | WebGL/device variance; asset weight |
| Next.js | 30–90 s | 90–250 KB | 1.3× | RSC/hydration/caching; build cost |

#### Token efficiency

Token efficiency is not only prompt size. It is the total tokens spent per **accepted** page, including retries, debugging and rework. The levers, in order of impact:

1. **Convention over configuration.** File-based routing, colocated components and typed content remove decisions.
2. **Fast local feedback.** A 300 ms HMR cycle produces fewer exploratory tokens than a 30 s rebuild.
3. **Legible errors.** TypeScript plus framework diagnostics beat runtime-only failures.
4. **A template that already contains the hard parts.** SEO, image handling, motion utilities and QA wiring should not be re-derived per site.
5. **A rubric.** The agent self-corrects against explicit criteria instead of guessing what "good" means.

Instrument this from the first pilot: tokens per ticket, retries per section, files touched, screenshot iterations. Optimise the number that is high, not the one that is easy to measure.

#### Fragility

| Risk | Where it bites | Mitigation |
| --- | --- | --- |
| Framework major churn | Astro/Next upgrades break config or conventions | Pin minors, quarterly upgrade ticket, smoke site in CI |
| Three.js/R3F churn | Weekly Three releases; R3F tied to React majors | Pin exact versions; upgrade as a pair with visual regression |
| Animation regressions | GSAP plugin changes, scroll timing | Visual snapshots at fixed scroll positions; reduced-motion test |
| Font licensing/subsetting | Missing glyphs, FOUT, legal | Self-host, subset, record licences in `LICENSES.md` |
| Video codecs/autoplay | iOS/Safari differences | Multiple sources, poster, no audio autoplay |
| WebGL context loss | Mobile memory pressure | Fallback poster, `webglcontextlost` handler, scene budget |
| CDN/preview drift | Previews differ from production | Same build command and headers for preview and production |
| Dependency supply chain | Compromised package | Lockfile, 7-day cooldown on new versions, audit, allowlist |

#### Lane scorecard

| Dimension | Editorial Luxury (Astro) | Immersive 3D/Video (Vite + R3F) |
| --- | --- | --- |
| Build speed | Fast; content-heavy builds stay under ~20 s | Fast; under ~12 s for the shell, asset pipeline dominates |
| Fragility | Low runtime risk; framework-major churn is the main cost | Device variance, WebGL context loss and asset weight are the main costs |
| Token efficiency | High: conventions, typed content, few decisions | Medium: scene code needs iteration, but fast HMR keeps loops short |
| Runtime ceiling | Excellent: static HTML, near-zero JS | Good within budget; must design the fallback and cap DPR |
| Best fit | Multi-page editorial, case studies, brand sites | One-page launches, product stories, experiential campaigns |

### 2.7 What every template must contain

A template is a product, not a starter. Every template ships with:

| Area | Required content |
| --- | --- |
| Design tokens | Colour, type scale, spacing, radii, shadows, z-index, easing and duration tokens in one file |
| Primitives | Container, Stack, Grid, Text, Heading, Link, Button, Media, Reveal — accessible by default |
| Sections | At least: Hero, Manifesto/About, Work/Case grid, Gallery, Testimonial/Quote, CTA, Footer |
| Motion layer | Reduced-motion guard, GSAP context cleanup, Lenis integration, one scroll-reveal primitive |
| Content model | Typed schema for site metadata, navigation, pages, work items, SEO |
| SEO | Title/description/canonical/OG/Twitter, sitemap, robots, JSON-LD where relevant |
| Analytics | One provider-agnostic hook, consent-aware, no-op by default |
| QA harness | Playwright config, screenshot matrix, axe scan, link check, Lighthouse CI config |
| Docs | `DESIGN.md` (art direction), `README.md` (commands), `AGENTS.md` (factory rules) |
| Version pin | Template name, version and commit recorded in the site's `factory.config.json` |

A site may fork a template, but the fork is recorded as a decision with a reason and the maintenance cost is acknowledged. More than 20% fork drift triggers a template-upgrade ticket.

---

## 3. Industry state of the art

### 3.1 What juries and studios reward

**Awwwards** is the clearest public statement of what "award-tier" means. Its jury evaluates submissions on **Design 40%, Usability 30%, Creativity 20% and Content 10%**, with a minimum of 18 jury members and outlier scores discarded ([Awwwards — About evaluation](https://www.awwwards.com/about-evaluation/)). Two implications for the factory:

- **Usability plus content is 40% of the score.** A visually striking but slow, inaccessible or empty site cannot win. Craft and function are not in tension.
- **Taste is judged by humans, repeatedly.** The factory cannot optimise its way to a jury score; it can only remove the obvious failures and give a creative director a strong starting point.

**Curated galleries** such as [Godly](https://godly.website/) and the case studies on [Codrops](https://tympanus.net/codrops/) show the current technical bar: coordinated type and motion, custom WebGL or video, and a strong point of view. Codrops' 2026 breakdowns of [Trionn](https://tympanus.net/codrops/2026/07/15/the-architecture-behind-trionn-coordinating-gsap-three-js-lenis-and-web-audio/) (GSAP + Three.js + Lenis + Web Audio) and [Ridgeline](https://tympanus.net/codrops/2026/07/22/building-ridgeline-engineering-a-real-time-3d-experience-in-webflow/) make the same point: the memorable part is the **system** — how scroll, scene, sound and type share one clock — not any single effect.

What top studios consistently do:

1. **Art direction before layout.** A written direction (references, type, palette, material, motion) precedes components.
2. **One strong idea per page.** A distinctive interaction or composition, executed precisely, beats five generic effects.
3. **Custom type and imagery.** The fastest way to look specific is type and photography that could not belong to another brand.
4. **Motion as hierarchy.** Animation directs attention and explains structure; it is not decoration.
5. **Performance as respect.** Heavy scenes are lazy-loaded, compressed and gracefully degraded.
6. **Detail density.** Focus states, selection colour, 404, loading, OG images, favicon, microcopy.
7. **Restraint.** Fewer colours, fewer fonts, fewer effects, more whitespace.

**A short watchlist.** Locomotive, Active Theory, Resn, Hello Monday, Build in Amsterdam and Studio Freight for studio practice; Codrops for technique; Awwwards and Godly for the current bar; Emil Kowalski, Josh Comeau and Refactoring UI for craft fundamentals. Study the work, not the surface effects.

### 3.2 Design-engineering standards

The standards below synthesise the Awwwards criteria, Refactoring UI (Adam Wathan and Steve Schoger), Josh Comeau's writing on CSS and animation, Emil Kowalski's [animations.dev](https://animations.dev/) work on motion craft, and the Codrops case studies above. They are defaults; a brief may override them with a reason.

#### Typography

- One or two families maximum: a display face with character and a text face with excellent metrics. A single variable family used across weights is a valid third option.
- Modular scale between 1.2 and 1.333; body 16–19 px; line-height 1.4–1.65 for body, 0.95–1.1 for display.
- Measure 55–75 characters; avoid full-width paragraphs on desktop.
- Self-host fonts, subset to the languages used, `font-display: swap`, preload only the critical face.
- Use real punctuation, hanging quotes, optical margins for large type, `text-wrap: balance` for headings where supported.
- No more than three weights in use on one page.

References: [Refactoring UI](https://www.refactoringui.com/) for hierarchy and spacing; [Josh Comeau](https://www.joshwcomeau.com/) for CSS and animation depth.

#### Composition and grid

- 12-column desktop grid, 6-column tablet, 4-column mobile; max content width 1280–1440 px; gutters 16/24/32 px by breakpoint.
- A consistent vertical rhythm: 4/8 px base unit, section spacing 80–160 px desktop and 48–80 px mobile.
- One deliberate grid break per page, not five.
- Mobile is designed, not squeezed: reorder content, change type scale, simplify motion.

#### Colour and material

- One accent colour, three to five neutrals, tinted blacks and whites rather than pure `#000`/`#fff` (unless the brand is explicitly high-contrast).
- Body text contrast ≥ 4.5:1; large text ≥ 3:1; never rely on colour alone.
- Gradients, glass and shadows are materials with a reason. If every card floats, nothing does.
- Dark mode is a designed state, not an inversion filter.

#### Motion and interaction

- UI feedback 120–250 ms; entrances 300–600 ms; narrative transitions 400–800 ms; stagger 40–100 ms.
- Ease-out for entrances, ease-in for exits, springs for direct manipulation. Avoid linear except for continuous loops.
- Animate transform and opacity; never animate layout properties on scroll.
- Every interactive element has hover, focus-visible, active and disabled states; every form has error, success and loading states.
- Respect `prefers-reduced-motion`; never make information depend on motion; never hijack scroll without an obvious escape.
- [animations.dev](https://animations.dev/) is a good external reference for how motion should *feel*; the factory encodes the numeric defaults above.

#### Performance

- Core Web Vitals targets: **LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1** at the 75th percentile ([web.dev — Web Vitals](https://web.dev/articles/vitals)).
- Editorial lane: initial JS ≤ 150 KB gzip; total page weight ≤ 1.5 MB; fonts ≤ 200 KB.
- Immersive lane: initial JS ≤ 350 KB gzip; scene payload ≤ 3 MB; total ≤ 4 MB before video; video lazy-loaded.
- No layout shift from fonts, images or embeds; reserve dimensions.
- Third-party scripts are opt-in and measured.

#### Accessibility

- WCAG 2.2 AA as the floor ([WCAG 2.2](https://www.w3.org/TR/WCAG22/)), including focus appearance, target size (24×24 px minimum), dragging alternatives and consistent help.
- Semantic landmarks, one `h1`, logical heading order, alt text that conveys purpose.
- Keyboard-complete: menus, modals, carousels and video controls.
- Zero critical or serious axe findings before review.

#### Content

- Real copy in the brief or written by the worker and approved by the copy owner; never lorem ipsum in a PR.
- One voice: sentence length, contractions, capitalisation and punctuation consistent.
- Microcopy is design: button labels, errors, empty states, loading text.
- Claims are sourced by the client; the factory does not invent awards, clients or statistics.

### 3.3 The anti-slop taxonomy

"AI slop" is low-quality, mass-produced generated content that is plausible at a glance and empty on inspection ([Wikipedia — AI slop](https://en.wikipedia.org/wiki/AI_slop)). In web design it has a recognisable fingerprint. The root cause is not the model; it is **unearned generality** — no brief, no references, no constraints, no specificity, and an optimiser rewarded for "looks like a website".

#### Visual tells

| Tell | Severity | Why it reads as slop | Detection |
| --- | --- | --- | --- |
| Purple/blue gradient hero with floating blobs | Major | Default training-data aesthetic; no brand reason | Human + palette check |
| Three identical feature cards with emoji icons | Major | Template filler; no content hierarchy | Section inventory |
| Glassmorphism navbar and cards everywhere | Major | Material used without meaning | CSS audit for `backdrop-filter` |
| Uniform large border radius on everything | Minor | No material hierarchy | Token audit |
| Inter/system font only, no display face | Minor | No typographic point of view | Font inventory |
| Centred hero, two buttons, generic subhead | Major | Unedited template structure | Layout review |
| Stock "diverse team" or generic office photography | Major | Not the client; erodes trust | Asset provenance |
| Lorem ipsum or placeholder names | Blocker | Unshipped content | Text scan |
| Fake logos, awards or testimonials | Blocker | Dishonest | Content review |
| Gradient text, neon glows, excessive shadows | Minor | Effects substitute for composition | Visual review |
| Scroll hijack or cursor effects that break input | Major | Novelty over usability | Manual test |
| Perfect symmetry on every section | Minor | Monotony; no rhythm | Composition review |
| Dark theme with one neon accent, no other idea | Minor | Trend cosplay | Art direction review |

#### Content tells

- Generic value propositions ("empowering brands to unlock their potential").
- Lists of adjectives with no evidence.
- Headlines that could belong to any company in the category.
- Missing specifics: names, places, numbers, dates, materials, processes.
- Inconsistent voice between sections, or a tone that ignores the audience.

#### Interaction tells

- Animations that replay on every scroll direction with no hierarchy.
- Hover effects on non-interactive elements.
- Loading screens that hide a slow site instead of fixing it.
- Custom cursors that obscure the real cursor on touch or keyboard.
- Forms with no validation, success or error states.

#### Structural tells

- Every page has the same hero → features → testimonial → CTA rhythm.
- Navigation with eight equal items and no priority.
- Footer with dead links and social icons to nowhere.
- No 404, no OG image, no favicon, no metadata.

#### The specificity test

Remove the logo and the client name. Could a knowledgeable person still identify the brand from type, colour, imagery, motion and copy? If not, the direction is generic. This is the single most useful review question, and it belongs in the rubric.

#### How the factory prevents slop

1. **Brief completeness gate.** No real copy, assets or references, no build.
2. **Reference deconstruction.** The worker writes what to borrow from each reference — composition, type, motion, material — not "make it like this".
3. **Art direction memo.** One page: concept, type pairing, palette with hex values, imagery direction, motion idea, one thing to avoid.
4. **Template with taste.** The template encodes hierarchy, spacing and states; the agent adapts rather than invents from zero.
5. **Rubric self-score.** The worker scores before review; anything below 80 goes back to the worker.
6. **Human creative gate.** A person approves direction; the factory does not grade its own taste.
7. **Real assets.** Client photography and licensed type beat generated imagery every time.

### 3.4 Motion, accessibility and performance as craft

These are not compliance chores bolted on at the end. They are what separates an award-tier site from a demo.

**Motion.** The state of the art is coordinated, scroll-aware, physically plausible motion: GSAP timelines for narrative, Lenis for smooth scroll, R3F for scene, and a single clock. The craft is in timing, easing, stagger and restraint — not in the number of effects. Always provide a reduced-motion path and a no-JavaScript baseline for content.

**Accessibility.** WCAG 2.2 AA is the floor. The most common generated-site failures are low contrast, missing focus styles, skipped headings, unlabelled icon buttons, keyboard traps in modals and video without captions. Automate axe on every route; manually test keyboard and screen-reader basics.

**Performance.** Performance is design. A beautiful page that takes six seconds to show its hero is a failed page. Budgets belong in CI, not in a retrospective. The two highest-leverage decisions are usually: ship less JavaScript and serve properly sized modern images.

**Testing stack.** [Playwright](https://playwright.dev/docs/test-snapshots) for visual and interaction tests, [axe-core](https://github.com/dequelabs/axe-core) for accessibility, [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) for budgets, plus a link checker and a bundle-size check. A real-device pass on one mid-tier Android and one iPhone remains mandatory for immersive work.

### 3.5 The craft rubric

The rubric is the shared language between worker, design QA and human reviewer. It is scored out of 100 after the gates pass.

**Gates (pass/fail, before scoring):**

- production build succeeds; no console errors on any route;
- axe has zero critical/serious findings;
- performance budget met;
- all links resolve; images have dimensions and alt text;
- content is real and approved; licences recorded.

| Criterion | Weight | What good looks like |
| --- | ---: | --- |
| Art direction and specificity | 20 | A clear concept; type, colour, imagery and motion feel made for this brand; passes the logo-removal test |
| Typography | 15 | Intentional pairing and scale; comfortable measure; optical detail; consistent hierarchy |
| Composition and grid | 15 | Strong hierarchy, deliberate whitespace, one meaningful grid break, designed mobile |
| Colour and material | 10 | Restrained palette; contrast; material choices with purpose |
| Motion and interaction | 15 | Purposeful, well-timed, performant; complete states; reduced-motion path |
| Content and copy | 10 | Specific, honest, consistent voice; useful microcopy |
| Performance | 10 | Meets budgets; fast first paint; stable layout |
| Accessibility | 5 | Keyboard-complete, semantic, labelled, focus-visible |

Scoring guide: 90+ award-track; 80–89 ready for review; 70–79 needs a focused revision; below 70 return to direction. Any automatic-fail tell in [§3.3](#33-the-anti-slop-taxonomy) caps the score at 69.

Who scores: the worker self-scores before opening the PR; design QA (a second worker or a subagent) scores independently for pilots and high-value sites; the human reviewer is the final authority and does not need to fill in the sheet.

### 3.6 What this means for prompts and skills

The factory's prompts should be short and the skills specific. Vague instructions produce generic output; checklists produce consistent output.

- Put the **rubric, anti-slop list and budgets** in a design-craft skill, loaded for every site.
- Put **lane-specific recipes** (Astro content collections, R3F scene patterns, video pipeline) in separate skills, loaded by lane.
- Put the **brief schema and acceptance-criteria template** in a brief skill.
- Put **evidence capture and CI commands** in a QA skill so every worker runs the same checks.
- Ask for an **art direction memo** before code; review it against specificity, not vibes.
- Require a **self-critique pass**: the worker lists three weaknesses and fixes the two cheapest before review.
- Keep human taste in the loop: the creative director's direction is an input, not a prompt to be simulated.

---

## 4. Skills and self-installation

### 4.1 Toolchain baseline

The factory must be able to rebuild its environment from a clean machine without a human remembering a sequence of commands. The baseline below was observed on the build machine on 2026-11-04. **Pin what you install; do not chase these numbers.**

| Tool | Version observed | Purpose | Required |
| --- | --- | --- | --- |
| Node.js | 22.22.0 LTS | Runtime for all builds | Yes |
| pnpm | 12.16.1 | Workspace installs, scripts | Yes |
| git | 2.43.0 | Worktrees, branches, commits | Yes |
| GitHub CLI (`gh`) | 2.67.0 | Issues, PRs, reviews, API | Yes |
| DeepSeek Harness (`dsh`) | 0.2.1-rc.3 | Sessions, skills, tools | Yes |
| Python | 3.12.3 | Optional asset scripts | No |
| Playwright + Chromium | 1.64.1 / chromium-1248 | Screenshots, a11y, interaction tests | Yes |
| ffmpeg | bundled with Playwright | Video transcode checks | No |
| Astro | 7.4.5 | Lane A | Yes |
| Vite | 8.3.5 | Lane B | Yes |
| React / R3F | 19.3.1 / 9.8.2 | Lane B | Yes |
| Three.js | 0.187.0 | Lane B | Yes |
| GSAP | 3.15.1 | Motion, both lanes | Yes |
| Lenis | 1.3.27 | Smooth scroll | Yes |
| Tailwind CSS | 4.3.4 | Styling, both lanes | Yes |
| TypeScript | 7.0.2 | Types | Yes |
| Next.js | 16.4.5 | Exception path only | Optional |
| Wrangler | 4.157.0 | Cloudflare Pages deploy | Yes |
| Lighthouse CI | 0.16.0 | Performance budgets | Yes |
| axe-core | 4.14.0 | Accessibility | Yes |
| sharp | 0.35.5 | Image processing | Yes |
| glTF-Transform | 4.5.1 | 3D asset compression | Lane B |
| subfont / fonttools | 7.3.0 / pinned | Font subsetting | Yes |

Research and component tooling (pinned with the repo; see [§6.4](#64-self-installation-and-integration-matrix)):

| Tool | Version | Purpose | Required |
| --- | --- | --- | --- |
| Impeccable CLI | 4.8.0 | Design detector, critique and polish commands | Yes (dev) |
| shadcn CLI | 4.23.0 | Registry and primitive installs | Yes |
| skills CLI | 1.7.6 | Vendoring agent skills | Yes (dev) |
| `@21st-dev/cli` | 1.18.0 | Component discovery | Optional |
| rea-agents | 6.8.0 | Authorized reference analysis | Optional |
| firecrawl | 4.51.0 | Reference discovery and content | Optional |
| transitions.dev skill | vendored commit | Micro-interaction recipes | Yes |

Verify a candidate version before pinning:

```sh
for p in astro vite next react three gsap lenis tailwindcss typescript @playwright/test; do
  printf '%-22s ' "$p"; npm view "$p" version
done
```

### 4.2 Skill inventory

Skills are the factory's institutional memory. Each one is small, specific and loaded only when relevant.

| Skill | Loaded when | Contains | Verified by |
| --- | --- | --- | --- |
| `website-factory-brief` | Intake and assessment | Brief schema, acceptance-criteria template, reference deconstruction, scope splitting | Brief lint passes; every required field present |
| `website-factory-art-direction` | Before code | Direction memo template, type pairing, palette rules, specificity test, anti-slop list | Memo exists and answers every prompt |
| `website-factory-editorial` | Lane A | Astro conventions, content collections, section recipes, view transitions, image handling | Template smoke site builds |
| `website-factory-immersive` | Lane B | R3F scene patterns, GLTF/KTX2 pipeline, video pipeline, fallbacks, device budgets | Lane B smoke scene runs at target fps |
| `website-factory-motion` | Any motion work | GSAP/Lenis recipes, transitions.dev patterns, timing and easing tokens, scroll triggers, reduced-motion rules | Motion checklist; reduced-motion test |
| `website-factory-content` | Copy and metadata | Voice rules, microcopy, SEO title/description, JSON-LD, licensing | Metadata lint; copy review |
| `website-factory-reference-audit` | Research, before direction | Firecrawl/Playwright/REA protocol, target authorization, computed-style extraction, "borrow / avoid" notes | `reference-audit.md` complete; targets authorized |
| `website-factory-component-registry` | Scaffold and adapt | Component selection, vendoring, provenance, licence checks, de-defaulting, registry entry | Registry entry, provenance header, tests |
| `website-factory-impeccable` | Polish and verify | Impeccable commands, detector rules, ignore policy, CI wiring, live-mode safety | Detector clean or findings triaged |
| `website-factory-qa` | Build and verify | Evidence matrix, Playwright config, axe rules, Lighthouse budgets, PR evidence format | CI green; evidence manifest complete |
| `website-factory-deploy` | Preview and release | Cloudflare Pages setup, headers, redirects, env vars, smoke test, rollback | Preview and production workflows pass |
| `website-factory-github` | All GitHub work | Factory labels, PR template, review-thread etiquette, bot rules | Review thread has the right disposition |
| `website-factory-maintenance` | Upkeep tickets | Doctor, upgrade policy, licence audit, template sync, worktree janitor | Weekly doctor job green |

What is **not** a skill: framework API reference (retrieve from docs), client-specific facts (come from the brief), and anything already enforced by CI. Skills encode judgement and procedure; CI encodes facts.

### 4.3 Skill anatomy and loading

```text
factory/skills/website-factory-editorial/
├── SKILL.md                 # front-matter + rules + checklists (< 300 lines)
└── references/
    ├── sections.md          # section recipes and code
    └── content-collections.md
```

`SKILL.md` front-matter:

```markdown
---
name: website-factory-editorial
description: Build Editorial Luxury sites with Astro 7. Use for content modelling, section composition, image handling and page transitions.
---
```

Loading in DSH:

- Skills live in the factory repo and are registered through the deployment's **prompt configuration** as team skills (`skill/<name>`); the canonical text stays in `factory/skills/`.
- Workers see the skill catalog and load a skill on demand with the `skill` tool. Nothing is preloaded that the task does not need.
- A skill change is a factory change: PR, review, version bump, and a smoke run. Prompt revisions are recorded, so a worker's behaviour can be traced to the skill version it used.
- Every rule in a skill must be **checkable** by a human, a script or a rubric item. If it cannot be checked, it is an opinion and belongs in `DESIGN.md`, not a rule.

### 4.4 The self-installation protocol

**Principle:** setting up the environment is work, so it is a ticket with acceptance criteria — not tribal knowledge and not a README paragraph.

#### Bootstrap sequence

```sh
# 1. Corepack and pnpm
corepack enable
corepack prepare pnpm@12.16.1 --activate

# 2. Install from the lockfile
pnpm install --frozen-lockfile

# 3. Browsers and media tools
pnpm exec playwright install chromium   # CI adds --with-deps

# 4. Build and smoke both templates
pnpm factory:smoke

# 5. Record and verify the environment
pnpm factory:doctor --strict
```

`pnpm factory:doctor` checks, at minimum:

| Check | Failure message |
| --- | --- |
| Node, pnpm, git, gh, dsh versions against `factory/toolchain.lock.json` | Exact expected vs actual, with the install command |
| `gh auth status` for the agent account | `gh auth login` instructions |
| Playwright Chromium present and runnable | `pnpm exec playwright install chromium` |
| Required environment variables present (no secrets printed) | Variable names only |
| `pnpm install --frozen-lockfile --lockfile-only` succeeds | Lockfile drift explanation |
| Both templates build | Failing template and last 20 lines of output |
| One visual test and one axe test pass | Failing test and artifact path |

`--ci` is read-only: it reports and exits non-zero. `--fix` performs only safe, user-scoped installs; it never uses `sudo` and never changes the OS.

#### Doctor sketch

```js
#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const lock = JSON.parse(readFileSync('factory/toolchain.lock.json', 'utf8'))
const strict = process.argv.includes('--strict')
const failures = []

function version(cmd, args = ['--version']) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

for (const [name, want] of Object.entries(lock.tools)) {
  const actual = version(name)
  if (!actual) failures.push(`${name}: not found (expected ${want})`)
  else if (!actual.includes(want)) failures.push(`${name}: ${actual} (expected ${want})`)
}

// gh auth, browsers, env vars, template builds...
console.log(failures.length ? failures.join('\n') : 'factory doctor: ok')
process.exit(failures.length && strict ? 1 : 0)
```

#### Verification

The bootstrap ticket is done only when:

1. `pnpm factory:doctor --strict` exits 0;
2. `pnpm factory:smoke` builds both templates and passes one visual and one axe test;
3. `factory/toolchain.lock.json` is committed;
4. a second clean run from the same lockfile produces the same result;
5. the PR records the commands and their output.

#### Design system installation

The factory installs a design system as **code**, not a Figma file the agent cannot read. The installable parts:

| Part | Lives in | Verified by |
| --- | --- | --- |
| Tokens | `packages/tokens` → CSS custom properties plus TS constants | `tokens:check`: no raw colour/size outside the token file; contrast pairs pass |
| Type | `public/fonts/`, self-hosted and subset, with a licence record | Font audit: files present, weights used, `LICENSES.md` complete |
| Icons | `packages/icons` — a Lucide subset or a custom SVG sprite | Icon audit: no emoji, consistent stroke, accessible labels |
| Primitives | Template `components/primitives/` | Component smoke page passes axe |
| Sections | Template `components/sections/` | Visual snapshots at the standard matrix |
| Motion | `packages/motion` — timings, easings, reveal, Lenis setup | Reduced-motion test; one ticker |
| Gallery | `sites/<slug>/styleguide`, excluded from production navigation | Builds; screenshot reviewed with the site |

`pnpm factory:design:install` copies tokens, fonts and the icon subset into a site and records the versions in `factory.config.json`. `pnpm factory:design:check` verifies token usage, font licences, contrast pairs, icon consistency and that the styleguide route exists. The styleguide is both the agent's visual reference and the reviewer's fastest way to spot inconsistency.

#### Rules

- Idempotent: rerunning changes nothing on a healthy machine.
- Cached: pnpm store, Playwright browsers and build caches are reused; CI uses the same lockfile.
- No secrets in the repo, in command output or in the doctor's diagnostics.
- No global installs when a project-local one works.
- If a check requires root or a system package, the worker reports `blocked` with the exact package and reason; it does not improvise.

### 4.5 Self-verification, drift and upgrades

| Cadence | Job | Action on failure |
| --- | --- | --- |
| Every prepare | `doctor --ci` | Fail the ticket with the remediation |
| Every PR touching `factory/` | `doctor --ci` + smoke | Block merge |
| Weekly (scheduled) | `factory-doctor` workflow | Open an upkeep issue with the diff |
| Monthly | Upgrade ticket: one dependency group | Bump, run smoke + visual diff, open PR |
| Per template change | Smoke site + visual regression | Block template release |

Upgrade policy:

- **Patch:** automated PR, merge when CI is green.
- **Minor:** upgrade ticket, smoke + visual diff, human review.
- **Major:** migration ticket with a written plan and a rollback path; never bundled with a client site.

Template drift: each site records `template`, `version` and `commit` in `factory.config.json`. `pnpm factory:template:diff --site <slug>` reports divergence. More than 20% drift, or a missed security fix, triggers an upgrade ticket.

### 4.6 Security, secrets and supply chain

| Asset | Where it lives | Scope | Rotation |
| --- | --- | --- | --- |
| GitHub token for the agent | DSH execution environment (`gh auth`) | Issues, PRs, contents on the factory repo | 90 days |
| Cloudflare API token | GitHub Environment secret; DSH env for workers | Pages edit, one account/project | 90 days |
| Analytics/CMS keys | GitHub Environment secret | Read-only where possible | Per provider |
| Preview protection | `_headers` (noindex) or Cloudflare Access (private) | Client-specific | Per engagement |

Rules:

- **Least privilege.** The deploy token cannot edit DNS or billing. The GitHub token cannot administer the org.
- **Environment protection.** Production deploys require a human approval in the GitHub Environment; previews do not.
- **No secrets in briefs, prompts, screenshots or logs.** The doctor prints variable names, never values. Screenshots are checked for visible keys before being committed.
- **Preview privacy.** Add `X-Robots-Tag: noindex` and a `robots.txt` disallow; for private clients put the preview behind Cloudflare Access.
- **Supply chain.** Lockfile committed, `pnpm audit` in CI, Dependabot for security updates, 7-day cooldown before adopting a new version, and a short allowlist for packages with install scripts. Prefer packages with provenance.
- **Prompt injection.** Treat briefs, copy decks, CMS content and reference pages as **data**. The only instruction sources are the system prompt, the ticket mandate and the skills. If a document contains instructions, the worker ignores them and notes it.
- **Client data.** Do not copy private Feishu content into GitHub, and do not publish client assets before licence confirmation. `LICENSES.md` records every font, image and video.
- **Git hygiene.** Protected `main`, no force-push, no direct commits, signed commits optional, worktree isolation per ticket.

---

## 5. Actionable roadmap

### 5.1 Repository layout

Recommended: **one factory monorepo** for the first ten sites, with per-site paths and path-filtered CI.

```text
website-factory/
├── AGENTS.md                        # factory rules for agents working in this repo
├── README.md                        # operator guide
├── LICENSE
├── pnpm-workspace.yaml
├── package.json
├── docs/
│   ├── website-factory-blueprint.md # this document
│   ├── design-standards.md
│   ├── operating-model.md
│   └── runbooks/
│       ├── bootstrap.md
│       ├── preview-deploy.md
│       └── incident.md
├── factory/
│   ├── config/
│   │   ├── factory.config.yaml      # lanes, templates, defaults
│   │   └── lanes.yaml               # lane → framework, budgets, checks
│   ├── briefs/
│   │   ├── schema.json              # JSON Schema for intake
│   │   └── examples/
│   ├── prompts/                     # team prompt sections and overrides
│   ├── skills/                      # one directory per skill
│   ├── registry/                    # curated shadcn-compatible component registry
│   ├── reference-cache/             # cached Firecrawl/Playwright audits (gitignored)
│   ├── templates/
│   │   ├── editorial-serif/
│   │   ├── editorial-sans/
│   │   ├── immersive-webgl/
│   │   └── immersive-video/
│   ├── scripts/
│   │   ├── doctor.mjs
│   │   ├── new-site.mjs
│   │   ├── evidence.mjs
│   │   ├── reference-audit.mjs
│   │   ├── add-component.mjs
│   │   ├── template-diff.mjs
│   │   └── cleanup-worktrees.sh
│   └── toolchain.lock.json
├── packages/
│   ├── tokens/                      # shared design tokens
│   ├── motion/                      # shared GSAP/Lenis utilities
│   ├── sections/                    # vendored, restyled registry components
│   └── qa/                          # Playwright, axe, Lighthouse presets
├── sites/
│   └── <client-slug>/
│       ├── factory.config.json      # template, version, lane, site metadata
│       ├── docs/                    # brief, decisions, licences, evidence
│       ├── src/ or app/
│       └── ...
├── .github/
│   ├── ISSUE_TEMPLATE/site-brief.yml
│   ├── pull_request_template.md
│   ├── workflows/
│   │   ├── verify.yml
│   │   ├── preview.yml
│   │   ├── production.yml
│   │   ├── factory-doctor.yml
│   │   └── visual-baseline.yml
│   └── CODEOWNERS
└── tests/
    └── e2e/                         # cross-site smoke tests
```

Why a monorepo first:

- one toolchain, one CI, one place to improve templates;
- shared tokens and QA harness;
- path-filtered CI keeps cost down;
- agents see prior sites as examples.

When to split into per-client repos:

- the client requires repository isolation or their own CI;
- access differs materially between clients;
- the monorepo exceeds ~20 sites or CI exceeds 10 minutes;
- a client needs a long-lived maintenance branch.

Split by moving `sites/<slug>` into its own repo with `factory/` as a versioned package; keep the factory control repo as the source of truth.

### 5.2 Template scaffolding

```sh
pnpm factory:new -- --slug acme --lane editorial --template editorial-serif
```

The script:

1. copies `factory/templates/<template>` to `sites/<slug>` (copy, not link, so the site can diverge);
2. rewrites package name, metadata and `factory.config.json`;
3. creates content stubs from the brief (site metadata, navigation, pages, SEO);
4. adds the site to the workspace and CI path matrix;
5. runs `pnpm install` and `pnpm factory:doctor --ci`;
6. makes the first commit on the ticket branch.

`factory.config.json`:

```json
{
  "slug": "acme",
  "lane": "editorial",
  "template": "editorial-serif",
  "templateVersion": "1.4.0",
  "templateCommit": "abc1234",
  "client": "Acme",
  "pages": ["/", "/work", "/about", "/contact"],
  "budgets": {
    "jsGzipKb": 150,
    "pageWeightKb": 1500,
    "lighthousePerformance": 90
  },
  "preview": {
    "provider": "cloudflare-pages",
    "project": "acme"
  }
}
```

Template variants to ship first:

| Lane | Variant | Character |
| --- | --- | --- |
| Editorial | `editorial-serif` | High-contrast serif display, warm neutrals, generous whitespace |
| Editorial | `editorial-sans` | Grotesque display, cooler palette, tighter grid |
| Immersive | `immersive-webgl` | Canvas hero, scroll-driven scene, DOM content around it |
| Immersive | `immersive-video` | Full-bleed video, poster-first, chaptered scroll |

### 5.3 CI/CD and preview deployment

#### Workflows

| Workflow | Trigger | Does | Required |
| --- | --- | --- | --- |
| `verify` | PR touching `sites/`, `packages/`, `factory/` | Install, doctor, lint, typecheck, test, build, design detector, axe, visual, Lighthouse, link check, size check | Yes |
| `preview` | PR opened/synchronised | Deploy changed sites to Cloudflare Pages; comment URL + commit SHA | Yes for site PRs |
| `production` | Push to `main` | Build, deploy, smoke test, post-deploy Lighthouse | Yes |
| `factory-doctor` | Weekly + changes under `factory/` | Doctor, template smoke, dependency audit | No (alerts) |
| `visual-baseline` | Manual dispatch with label `visual:update` | Regenerates baselines and uploads diff for review | No |

#### Preview deployment

Cloudflare Pages gives every non-production branch a unique URL without extra infrastructure; the platform documents per-branch preview deployments and aliases ([Cloudflare Pages — Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)). Recommended shape:

- One Pages project per site (simplest isolation), or one project with branch aliases for many small sites.
- Build command is the same as production: `pnpm --filter <slug> build`.
- Deploy: `npx wrangler pages deploy sites/<slug>/dist --project-name <slug> --branch pr-<number>`.
- The workflow comments the URL, the commit SHA and the lane on the PR, and updates the comment on each push.
- Previews are `noindex` and, for private clients, behind Cloudflare Access.

#### Evidence automation

`pnpm factory:evidence` captures, for each changed route:

| Dimension | Values |
| --- | --- |
| Viewport | 390×844 (mobile), 768×1024 (tablet), 1440×900 (desktop) |
| Theme | Light and dark if the site supports both |
| Motion | Default and `prefers-reduced-motion: reduce` |
| State | Default, menu open, form error/success where relevant |
| Format | Full-page WebP at quality 80, plus a hero crop |

Before/after rules:

- For a **redesign**, capture the current production URL as "before" and the preview as "after".
- For a **new site**, capture the agreed placeholder/empty state as "before", or state explicitly that no prior implementation exists and show the "after" only. Never fabricate a baseline.
- Same viewport, theme, route and state for both sides.
- Commit the images under `sites/<slug>/docs/evidence/<ticket>/` and reference them from the PR body with raw URLs pinned to the head SHA, so the evidence cannot drift from the commit. Keep only the reviewed final set (typically under 2 MB); full-resolution captures stay in CI artifacts.
- The PR template requires the comparison table; a UI PR without it is not ready.

#### Budgets in CI

```js
// lighthouserc.cjs (per site)
module.exports = {
  ci: {
    collect: { staticDistDir: './dist', numberOfRuns: 2 },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }]
      }
    },
    upload: { target: 'temporary-public-storage' }
  }
}
```

`total-blocking-time` is a lab proxy for INP; field INP still needs real-user monitoring. Treat the lab budget as a guardrail, not proof.

#### Speed

- Cache pnpm store and Playwright browsers; cache framework build caches.
- Cancel superseded runs per PR.
- Target ≤ 6 minutes for `verify`; split visual and Lighthouse into parallel jobs if needed.
- Run full checks on changed sites only; run the cross-site smoke on `main`.

### 5.4 DSH configuration for the factory

| Setting | Value | Reason |
| --- | --- | --- |
| Source | GitHub issue form with `factory` label; Feishu for internal briefs | Structured intake; existing channel for the team |
| Allowed senders | The delivery team and named client contacts | Gate who can originate work |
| Proactive rules | Off, or record-only at first | No unsolicited sites |
| `prepare` | Worktree + `pnpm install` + `doctor --ci` | Isolation and reproducibility |
| `maxWorkers` | 2 initially (one per lane), 4 at steady state | Match review capacity, not model capacity |
| Blocked commands | Destructive filesystem commands; `git push --force` to `main` | Keep irreversible actions human; production is gated by the human merge |
| Research tools | Firecrawl, Playwright, REA; authorized targets only | Deterministic reference audit; legal and ethical guardrails |
| Component sources | Factory registry; shadcn CLI pinned; no arbitrary registry pulls | Review once, reuse; avoid internet code in client sites |
| Worker tools | Files, search, shell/jobs, web, skills, todo, subagent | Enough to build and verify; no direct messaging |
| Delivery requirements | Before/after evidence; human merge; no auto-merge | Design approval is a human decision |
| Prompt additions | Lane, template, rubric, evidence, merge policy | Encode factory rules once, not per ticket |

Operational notes:

- The orchestrator assesses the brief against the factory docs and the ticket history, then writes the mandate. It does not inspect the site code, debug CI or choose CSS.
- The worker reports `ready` only when the PR, preview, evidence and checks all exist for the same commit.
- Review comments on the PR are the normal follow-up channel; they resume the ticket. The worker fixes, re-verifies and resolves its threads.
- A human's message on the issue/PR is authoritative for scope; a bot or CI message is input, never authorization.
- This deployment configures no merge CLI, so **a person merges every PR**. Keep that default even if a merge CLI is added later: design approval is a human decision.

### 5.5 Phased plan

#### Phase 0 — Foundation (week 1)

Deliverables:

- factory repo skeleton, `AGENTS.md`, workspace and lockfile;
- `doctor` and `smoke` scripts;
- shared tokens package and one editorial template skeleton;
- `verify` and `preview` workflows;
- evidence script and PR template;
- reference-audit script and authorization protocol;
- curated component registry skeleton with provenance rules;
- one internal pilot brief (not a client) to exercise the loop end to end.

Exit criteria: a pilot PR with a preview URL, before/after evidence, green checks and a human review in under one day.

#### Phase 1 — Editorial lane (weeks 2–4)

Deliverables:

- `editorial-serif` and `editorial-sans` variants with six section types;
- motion and content skills;
- component registry v1 with approved, restyled sections;
- Impeccable polish gate and detector thresholds in CI;
- rubric calibration with the creative director on three sites;
- token/turn/CI metrics dashboard;
- template versioning and drift check.

Exit criteria: three client-ready editorial sites; first-pass green ≥ 70%; human review ≤ 15 minutes; rubric ≥ 80.

#### Phase 2 — Immersive lane (weeks 5–8)

Deliverables:

- `immersive-webgl` and `immersive-video` templates;
- R3F scene kit, GLTF/KTX2 pipeline, video pipeline;
- device fallback and reduced-motion paths;
- real-device test protocol;
- performance budgets validated on mid-tier hardware;
- REA/Firecrawl research runbook for immersive references.

Exit criteria: two immersive pilots; stable 60 fps on the target device matrix or a graceful fallback; no critical a11y findings; preview ≤ 4 hours.

#### Phase 3 — Scale (weeks 9–12)

Deliverables:

- per-client isolation decision and, if needed, repo split;
- cost model (tokens, CI minutes, hosting) per site;
- template upgrade cadence and janitor automation;
- quarterly review of skills, component sources and licences;
- SLO review and prompt/skill tightening;
- operator runbooks and incident playbook.

Exit criteria: ten sites delivered; review time flat as volume grows; rework ≤ 1 per site; cost per site trending down.

### 5.6 Risk register

| Risk | Likelihood | Impact | Mitigation | Owner |
| --- | --- | --- | --- | --- |
| Generic "AI look" ships | High | High | Rubric, anti-slop gate, creative director approval, real assets | Creative director |
| Brief ambiguity causes rework | High | Medium | Intake schema, one-question gate, acceptance criteria | Producer |
| Framework churn breaks builds | Medium | Medium | Pin minors, smoke site, quarterly upgrades | Factory maintainer |
| WebGL fails on low-end devices | Medium | High | Fallback poster/video, device matrix, DPR caps | Worker + QA |
| Review becomes the bottleneck | Medium | High | Evidence-first PRs, 15-minute checklist, batch reviews | Producer |
| CI cost/time grows | Medium | Medium | Path filters, caching, parallel jobs, changed-site only | Factory maintainer |
| Secret or client asset leak | Low | Critical | Least privilege, no secrets in repo/logs, preview protection, licence checks | Operator |
| Supply-chain compromise | Low | High | Lockfile, audit, cooldown, allowlist | Factory maintainer |
| Prompt injection via brief/content | Medium | Medium | Treat content as data, skills as the only instructions | Operator |
| Vendored component imports a look or a licence problem | High | Medium | Registry review, provenance headers, de-default checklist, licence audit | Design QA |
| Reference scraping or REA exceeds authorization | Low | High | Authorization log, robots/ToS checks, no asset copying, human approval | Operator |
| Worktree/disk leak | Medium | Low | Weekly janitor, prune merged worktrees | Factory maintainer |
| Agent loops on a hard visual problem | Medium | Medium | Budget guard, three-approach rule, blocked report | Worker |

### 5.7 First tickets

In order, each a small PR:

1. **Factory skeleton** — workspace, `AGENTS.md`, `README`, config files.
2. **Doctor and smoke** — `doctor.mjs`, `factory:smoke`, toolchain lock.
3. **Design tokens** — colour, type, spacing, motion tokens; documentation.
4. **Editorial template** — layout, six sections, content schema, SEO.
5. **QA harness** — Playwright matrix, axe, Lighthouse, link check.
6. **Evidence automation** — capture, manifest, PR embed.
7. **CI verify + preview** — workflows, Cloudflare Pages project, PR comment.
8. **Brief intake** — issue form, schema, assessment prompt and skill.
9. **Skills v1** — brief, art direction, editorial, motion, QA.
10. **Reference-audit harness** — Firecrawl/Playwright/REA protocol, authorization log, audit template.
11. **Curated component registry** — registry.json, provenance policy, first approved sections.
12. **Polish gate** — Impeccable install, detector thresholds, CI artifact and ignore policy.
13. **Pilot site** — internal brief, full loop, rubric calibration.
14. **Immersive template** — R3F scene kit, fallback, video.
15. **Production release** — production workflow, smoke, rollback runbook.
16. **Maintenance** — weekly doctor, janitor, licence audit, upgrade policy.

Each ticket follows the same operating model it is building: worktree, branch, PR, evidence, human review.

### 5.8 Open questions for review

These are deliberately left open; they need a decision from the team, not from an agent.

1. **CMS:** start with Git/MDX content (recommended). If a client needs editing, which headless CMS — Sanity, Payload, Storyblok — and who owns the schema?
2. **Hosting:** Cloudflare Pages is the default. Do any clients require Vercel, Netlify or their own AWS account, and is that a per-site exception?
3. **Repo split:** keep the monorepo until twenty sites or until client isolation demands a split. Is twenty the right threshold?
4. **Design QA:** a second worker ticket (independent, costs a slot) or a subagent inside the build ticket (cheaper, less independent)?
5. **Direction checkpoint:** is a mid-build screenshot review worth the extra human interruption for high-value sites, or does it slow the loop without improving outcomes?
6. **Framework breadth:** support SvelteKit as a third lane, or keep two lanes until demand is proven?
7. **Analytics and consent:** one default provider, or per-client choice with a shared consent wrapper?
8. **Budget:** what token and CI-minute ceiling per site makes the factory economically better than a traditional build?

---

## 6. Research: skills, repositories and UI libraries

The factory should not reinvent primitives, and it should not absorb every new registry. The rule is **a curated supply chain, not an open firehose**. This section evaluates the repositories, component sources and agent skills worth adopting, and defines how a worker installs and invokes them without turning the site into a collage of other people's defaults.

### 6.0 Adoption tiers

Every external artifact enters the factory at exactly one tier.

| Tier | Meaning | Examples | Handling |
| --- | --- | --- | --- |
| **Dependency** | A pinned npm package, installed by the package manager | Lenis, GSAP, Three.js, React Three Fiber, Motion, `@relume_io/relume-ui` | Add to the site's `package.json`, commit the lockfile, upgrade through one factory ticket |
| **Vendored** | Source copied into the repository and then owned by the factory | shadcn/ui, Aceternity, Magic UI, 21st.dev components, Relume sections | Provenance header, review, token adaptation, tests, `THIRD_PARTY_NOTICES.md` |
| **Reference** | Studied, never shipped wholesale | Awwwards, Godly, Codrops, animations.dev, an authorized reference's DOM captured by REA | Time-boxed research; record what was learned; never copy assets or code |

Two failure modes this prevents:

- **Reinventing primitives** — spending tokens and days on a dialog, a form, a marquee or a scroll utility that already exists.
- **Importing a look** — adopting a registry's default gradient, radius, motion and copy until every client site resembles the same demo.

### 6.1 Award and motion repositories

The motion stack is small on purpose. A few well-chosen libraries cover nearly every award-tier interaction; the craft is in choreography, performance and restraint, not in the number of dependencies.

| Project | What it gives | Licence | Install | Factory use |
| --- | --- | --- | --- | --- |
| [Lenis](https://github.com/darkroomengineering/lenis) (Darkroom Engineering) | Inertial smooth scroll with a small API and a single RAF loop | MIT | `pnpm add lenis` | Motion layer in both lanes; paired with GSAP's ticker |
| [GSAP + ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) | Timelines, scroll orchestration, SplitText, Flip, Observer | Free [standard "no charge" licence](https://gsap.com/standard-license), source-available, not OSI open source | `pnpm add gsap` | The narrative motion owner: scroll sequences, reveals, page transitions |
| [Three.js](https://threejs.org/) | WebGL engine | MIT | `pnpm add three` | Lane B scenes |
| [React Three Fiber](https://r3f.docs.pmnd.rs/) + [drei](https://github.com/pmndrs/drei) | Declarative Three.js renderer and helpers | MIT | `pnpm add @react-three/fiber @react-three/drei` | Lane B scene graph, controls, loaders, post-processing helpers |
| [Motion](https://motion.dev/) | React animation and gesture primitives (formerly Framer Motion) | MIT | `pnpm add motion` | Only where registry components already depend on it; not a second scroll system |
| [transitions.dev](https://transitions.dev/) (Jakub Antalík) | 43+ crafted UI transitions on the site, 12 drop-in CSS transitions in the skill | Free for commercial use; no redistribution as a competing library; tooling MIT | `npx skills add Jakubantalik/transitions.dev` | Micro-interactions: dropdowns, modals, badges, text swaps, page slides |
| [animations.dev](https://animations.dev/) (Emil Kowalski) | Judgement for how motion should feel: springs, easing, perceived speed | Course terms; not a code source | — | Reference for motion critique and timing decisions |
| [Codrops](https://tympanus.net/codrops/) | Technical breakdowns of award-tier sites | Article/code licences vary | — | Architecture and technique research; never copy a demo wholesale |
| Awwwards, FWA, [Godly](https://godly.website/) | Curation and the current bar | Reference only | — | Calibration and watchlist |

**One motion owner per lane.** Stacking GSAP, Motion, Lenis and R3F without a plan produces competing tickers, doubled scroll effects and jank.

| Lane | Timeline owner | Scroll | Micro-interactions | Rule |
| --- | --- | --- | --- | --- |
| Editorial | GSAP | Lenis + ScrollTrigger | transitions.dev CSS, or GSAP for stateful cases | No Motion unless a React island needs it |
| Immersive | GSAP for DOM/timeline, `useFrame` for scene | Lenis + ScrollTrigger | transitions.dev CSS for DOM UI | One clock; do not start a second RAF inside R3F |

Baseline install:

```sh
# Editorial lane
pnpm add gsap lenis
npx skills add Jakubantalik/transitions.dev

# Immersive lane
pnpm add three @react-three/fiber @react-three/drei gsap lenis
pnpm add motion          # only if the chosen registry components use Motion
```

Rules:

- One ticker. Lenis is driven by `gsap.ticker`; R3F reads the same clock or its own `useFrame`; never both for the same motion.
- CSS-first for micro-interactions; JavaScript timelines for choreography. A dropdown does not need a timeline.
- Every motion has a `prefers-reduced-motion` path and a static fallback.
- Motion never replaces content or hides a slow page.
- Measure on a mid-tier Android before calling an interaction done.

What to study in award work: the pacing of a scroll sequence, the restraint in a hover state, the typographic change on scroll, the confidence to leave space. The watchlist in [§3.1](#31-what-juries-and-studios-reward) is the reference set; the libraries above are the tools.

### 6.2 Component and section libraries

Component libraries solve two different problems: **primitives** (accessible dialogs, forms, menus, tables) and **sections** (heroes, bento grids, marquees, galleries). The factory adopts primitives as dependencies or vendored code, and treats sections as raw material that must be restyled to the brief.

| Library | Model | Licence and cost | Best for | Install | Main risk |
| --- | --- | --- | --- | --- | --- |
| [shadcn/ui](https://ui.shadcn.com/) | Copy-paste React + Tailwind + Radix | MIT | App primitives: dialog, form, table, command, navigation | `pnpm dlx shadcn@latest init`; `pnpm dlx shadcn@latest add button` | Default look is recognisably shadcn; app-shaped, not editorial |
| [Aceternity UI](https://ui.aceternity.com/) | Copy-paste React + Tailwind + Motion | Free for unlimited personal/commercial use; no redistribution as a competing library; paid premium tier | Hero effects, bento grids, backgrounds, 3D pins | `npx shadcn@latest add @aceternity/<component>`; `pnpm add motion`; 3D peers | Instantly recognisable "AI demo" aesthetic; heavy effects |
| [Magic UI](https://magicui.design/) | Copy-paste React + Tailwind + Motion | MIT | Marquees, animated lists, globes, bento, text effects | `pnpm dlx shadcn@latest add @magicui/<component>` | Same recognisable aesthetic; motion-heavy |
| [21st.dev](https://21st.dev/) | Community registry of React/Tailwind components, templates and themes | Per component; licences vary; CLI MIT | Discovery and inspiration; occasional section | `npx @21st-dev/cli@latest init --client <client>`; `npx skills add 21st-dev/skill` | Quality and licence vary by author; no curation |
| [Relume Library for React](https://react-docs.relume.io/) | Commercial library; copy-paste sections, UI based on shadcn | Relume subscription; verify package terms | Sitemap and wireframe structure; 1000+ typed section components | `pnpm add @relume_io/relume-ui @relume_io/relume-tailwind`; copy sections from the library | Site Builder React export gives **unstyled wireframes only**; structure is generic until restyled |
| **Factory registry** | Internal, curated, versioned | Internal | Approved sections and effects, already adapted to tokens | `pnpm factory:component add @factory/<name>` | Maintenance; must not become a stale fork |

#### The factory registry is the integration point

Workers should not pull arbitrary code from the internet into a client site. They pull from the factory's own shadcn-compatible registry.

```text
factory/registry/
├── registry.json              # registry index; names, files, dependencies
├── sections/
│   ├── hero-split/
│   ├── work-index/
│   └── cta-band/
└── effects/
    ├── scroll-reveal/
    └── text-swap/
```

- The registry is a normal shadcn registry (`registry.json`, namespaces, authentication), so `shadcn` tooling and the private registry workflow apply ([shadcn registry docs](https://ui.shadcn.com/docs/registry)).
- A new component follows: propose → vendor → strip the default look → apply tokens → add reduced-motion and keyboard behaviour → pass axe, visual and size checks → register.
- Workers use `pnpm factory:component add @factory/hero-split`, which copies source into the site, writes a provenance header and updates `THIRD_PARTY_NOTICES.md`.
- The site records which registry items it used in `factory.config.json`; updates flow through a template-sync ticket, not a silent overwrite.

#### Adoption rules

1. **Structure from libraries, identity from the brief.** A Relume wireframe or a 21st hero is a starting arrangement, never a finished design.
2. **One visual library per site.** shadcn primitives are always allowed; choose at most one of Aceternity, Magic, 21st or Relume for sections.
3. **Depend for primitives, vendor for sections.** Packages are easier to patch; section source must be owned and edited.
4. **Provenance or it did not happen.** Every vendored file carries source URL, licence, date and the local changes.
5. **De-default before review.** Replace colours, radii, shadows, type and easing with factory tokens; remove glass, gradients, glow and emoji unless the brief asks for them.
6. **Count the cost.** Every dependency and every vendored effect is measured in the bundle-size and performance checks.
7. **Accessibility is not inherited.** Registry code often ships without focus management, keyboard behaviour or reduced-motion handling.
8. **No paid content without a licence.** Do not copy Aceternity Pro blocks, Relume paid sections or 21st paid components without the client's licence.
9. **No scraped assets.** Reference imagery, fonts and video are licensed or replaced, never lifted.
10. **Delete what is unused.** A vendored component that is not on the page is dead weight.

#### Selection rubric

Score each candidate 1–5; adopt at 20+/30 and never adopt a candidate with a licence or accessibility blocker.

| Criterion | Weight | Question |
| --- | --- | --- |
| Design fit | 5 | Does it serve this brief's direction, or does it impose its own? |
| Dependency weight | 5 | How much JS, CSS and peer dependency does it add? |
| Accessibility | 5 | Keyboard, focus, semantics, reduced motion, contrast |
| Licence and cost | 5 | Can the client legally ship it, and is the cost approved? |
| Maintenance | 5 | Is the source stable, or will it rot in six months? |
| Slop risk | 5 | Would a reviewer recognise this from a thousand other AI sites? |

#### Relume workflow

Relume is strongest before code: sitemap, wireframe and section structure. Use it to get from a brief to an agreed page skeleton, export the React wireframe, then rebuild the surface with the factory's tokens, type and imagery. Do not ship the wireframe's default spacing or component styling, and do not expect the Relume Style Guide to export with React; that export is not supported.

### 6.3 Advanced agent skills and toolchains

Skills and agent tools are **instructions plus capabilities**. A malicious or careless skill can read files, call the network or push code. Treat every third-party skill as source code: review it, pin it, vendor it, and register it through the DSH prompt configuration rather than letting it fetch itself at runtime.

| Skill or tool | What it gives | Licence | Install | Factory use |
| --- | --- | --- | --- | --- |
| [Impeccable](https://impeccable.style/) (`pbakaus/impeccable`) | Design vocabulary and commands (`polish`, `bolder`, `critique`, `audit`) plus a 62-rule deterministic slop/quality detector | Apache-2.0 | `npx impeccable install`; `npx impeccable detect` | Pre-PR polish and audit; CI gate; design-system documentation |
| [transitions.dev skill](https://transitions.dev/) | 12 drop-in CSS transitions with documented hooks | Free commercial use; no redistribution | `npx skills add Jakubantalik/transitions.dev` | Micro-interaction recipes |
| [REA](https://rea.tools/) (`morluto/rea`) | MCP/CLI for reverse-engineering binaries, apps, JavaScript/Electron and websites; evidence-based analysis | MIT | `pnpm add -D rea-agents`; `pnpm exec rea-agents setup .` | Authorized reference analysis: DOM, runtime behaviour, animation architecture |
| [DSH REA adapter](https://github.com/zhaofeng130/dsh-rea) | Registers the `reverse-engineer-anything` skill plus `rea` and `rea_doctor` tools in DSH sessions | Community adapter; assess licence and maintenance | `dsh plugin --profile <profile> add github:zhaofeng130/dsh-rea` | Optional DSH integration; not required for REA itself |
| [Firecrawl](https://firecrawl.dev/) | Scrape, crawl, map, search and interact with pages; Markdown, HTML, screenshots, structured JSON | AGPL-3.0 for self-hosting; hosted service terms | `pnpm add -D firecrawl`; `FIRECRAWL_API_KEY` | Reference discovery, content inventory, sitemaps, screenshots |
| [Playwright](https://playwright.dev/) | Browser automation, screenshots, DOM and computed styles | Apache-2.0 | Already in the toolchain | Deterministic reference audit; visual evidence; a11y |
| [21st.dev skill](https://21st.dev/) | Search, install and publish registry components from the terminal | CLI MIT; component licences vary | `npx skills add 21st-dev/skill` | Component discovery; vendor through the factory registry |

#### Impeccable: the taste gate

Impeccable is the closest thing to an automated design reviewer that is useful rather than noisy. It installs a skill and a deterministic detector, works with DeepSeek Harness, and writes project context that later commands read.

Factory usage:

1. `npx impeccable install` in the workspace; commit the generated config, not the tool's cache.
2. Once per site, `/impeccable init` writes `PRODUCT.md`; `/impeccable document` writes `DESIGN.md` from the existing visual system.
3. Before review, run `/impeccable critique` and `/impeccable audit`; fix P0/P1 findings first.
4. In CI, run `npx impeccable detect src/` and `npx impeccable detect <preview-url>`; fail on exit code 2; publish `--json` results as an artifact.
5. Allow the brand font explicitly (`npx impeccable ignores add-value overused-font ... --reason "Brand font"`) instead of disabling the rule.
6. Do not run `bolder` or `overdrive` without the brief; those commands amplify, and amplification of a weak direction is still slop.

Security and cost note: Impeccable's live mode can spawn an external coding CLI with approvals or sandboxing disabled. The factory disables live-apply (`IMPECCABLE_LIVE_COPY_AGENT=off`), runs it only in a local checkout, and never exposes it to a deployed site or a production CSP.

#### REA: understand references, do not clone them

REA is useful when a reference's behaviour is not visible in the markup: how a scroll sequence is driven, how a canvas scene is composed, how a page transition is implemented, what a JavaScript bundle does at runtime. It produces evidence and limitations, not a copy of the code.

Factory rules:

- Only analyse targets the client owns, public references explicitly cleared for research, or the factory's own sites.
- Respect terms of service, robots and copyright. Do not bypass authentication, paywalls or technical protection measures.
- Record the target URL, date, scope and authorization in `reference-audit.md`.
- Extract principles and measurements (timings, easing, structure, technique), not proprietary code, assets, fonts or copy.
- Do not use REA to reproduce a competitor's product or to lift licensed components.
- Keep native-binary analysis out of the website factory unless a ticket explicitly needs it; the website-relevant scope is DOM, CSS, JS and runtime behaviour.

Install for DSH:

```sh
# REA itself (project-local preferred)
pnpm add -D rea-agents
pnpm exec rea-agents setup .

# Optional DSH adapter; review the plugin before enabling
dsh plugin --profile <profile> add github:zhaofeng130/dsh-rea
```

The adapter registers `reverse-engineer-anything`, `rea` and `rea_doctor`. It does not bundle REA; configure `DSH_REA_CLI` or keep `rea` on `PATH`.

#### Firecrawl: discovery and content, not computed style

Firecrawl is a good fit for the first pass of reference research: map a site, scrape its pages to Markdown/HTML, capture screenshots, and extract structured content. It is **not** a computed-style engine: to know the rendered font size, line height, colour, spacing or animation timing, use Playwright against the live page.

```ts
import { Firecrawl } from 'firecrawl'

const app = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY })
const page = await app.scrape('https://reference.example/', { formats: ['markdown', 'html'] })
```

Licence note: Firecrawl is AGPL-3.0. Self-hosting it inside a proprietary product can trigger source-disclosure obligations. The factory uses the hosted API, or isolates a self-hosted instance as a separate service, and keeps the reasoning in `decisions.md`.

Usage rules:

- Cache results under `factory/reference-cache/<hash>/` and reuse them; do not re-scrape on every turn.
- Respect robots, terms and rate limits; no authenticated or private content.
- Store only what the audit needs; remove PII and client-confidential material.
- Record the URL, date and licence status alongside every captured asset.
- Pair every scrape with Playwright measurements and a human-written "borrow / avoid" note.

#### The reference audit pipeline

```text
authorized URL
   │
   ├── Firecrawl map + scrape + screenshots ──► content, routes, imagery, copy
   ├── Playwright evaluate ──────────────────► computed type, colour, spacing, motion
   ├── REA (optional) ───────────────────────► runtime behaviour, JS architecture
   └── human/creative director ──────────────► what is worth borrowing
   ▼
.factory/reference-audit.md  +  .factory/tokens.reference.json
   ▼
art-direction memo  →  build
```

A compact Playwright audit:

```ts
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url, { waitUntil: 'networkidle' })

const audit = await page.evaluate(() => {
  const styleOf = (el: Element) => {
    const s = getComputedStyle(el)
    return {
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing,
      color: s.color,
      background: s.backgroundColor,
    }
  }
  return {
    title: document.title,
    fonts: [...document.fonts].map((f) => `${f.family} ${f.weight}`),
    headings: [...document.querySelectorAll('h1, h2, h3')].slice(0, 12).map((el) => ({
      text: el.textContent?.trim(),
      ...styleOf(el),
    })),
    body: styleOf(document.body),
    animations: document.getAnimations().map((a) => ({
      name: 'animationName' in a ? (a as CSSAnimation).animationName : a.constructor.name,
      duration: a.effect?.getTiming().duration,
      easing: a.effect?.getTiming().easing,
    })),
  }
})

await browser.close()
```

`document.getAnimations()` covers CSS and Web Animations API effects; GSAP and other JavaScript-driven timelines do not appear there, so inspect those with REA or by reading the bundle. The audit ends in a one-page direction memo, not a clone. If the output reads like the reference with the logo swapped, the worker has failed the specificity test.

### 6.4 Self-installation and integration matrix

The factory supports three install sets: baseline (every site), lane-specific (editorial or immersive), and research (workers only). Vendored component source is separate from these sets: it is a per-site selection from the factory registry. Nothing else is installed by default. Commands below show `@latest` for brevity; the factory pins every CLI in `factory/toolchain.lock.json` and CI runs the pinned version.

| Tool or repo | Kind | Install command | Pin | Invoke during build | Verify | Licence |
| --- | --- | --- | --- | --- | --- | --- |
| Lenis | Dependency | `pnpm add lenis` | lockfile | Motion layer, one ticker | Reduced-motion + scroll test | MIT |
| GSAP | Dependency | `pnpm add gsap` | lockfile | Timelines, ScrollTrigger | Visual + perf | Standard no-charge |
| Three.js | Dependency | `pnpm add three` | lockfile | Lane B scene | WebGL fallback + fps | MIT |
| React Three Fiber + drei | Dependency | `pnpm add @react-three/fiber @react-three/drei` | lockfile | Lane B scene graph | Scene smoke test | MIT |
| Motion | Dependency | `pnpm add motion` | lockfile | Registry components that need it | Bundle budget | MIT |
| transitions.dev | Skill | `npx skills add Jakubantalik/transitions.dev` | vendor commit | Micro-interactions | Reduced-motion + visual | Free commercial, no redistribution |
| shadcn/ui CLI | Tool | `pnpm dlx shadcn@latest init` | `shadcn` version | Primitives and registry installs | Component axe test | MIT |
| Aceternity UI | Vendored | `npx shadcn@latest add @aceternity/<name>` | commit | Selected marketing effects | Perf + a11y + de-default review | Free commercial, no redistribution |
| Magic UI | Vendored | `pnpm dlx shadcn@latest add @magicui/<name>` | commit | Selected marketing sections | Perf + a11y + de-default review | MIT |
| 21st.dev | Registry | `npx @21st-dev/cli@latest init --client <client>`; `npx skills add 21st-dev/skill` | CLI lockfile | Discovery, then vendor | Per-component licence review | Varies |
| Relume Library | Commercial | `pnpm add @relume_io/relume-ui @relume_io/relume-tailwind` | lockfile | Wireframe and section structure | Restyle + a11y review | Relume terms |
| Impeccable | Tool + skill | `npx impeccable install` | vendor config | `critique`, `audit`, `polish`; `detect` in CI | Exit code + JSON artifact | Apache-2.0 |
| REA | Tool + skill | `pnpm add -D rea-agents`; `pnpm exec rea-agents setup .` | lockfile | Authorized reference analysis | `rea_doctor` evidence | MIT |
| DSH REA adapter | Plugin | `dsh plugin --profile <profile> add github:zhaofeng130/dsh-rea` | commit/tag | DSH `rea`/`rea_doctor` tools | Tool smoke test | Community; assess |
| Firecrawl | Dependency + API | `pnpm add -D firecrawl` | lockfile | Reference discovery and content | Cached audit artifact | AGPL-3.0 / hosted terms |
| Playwright | Tool | already installed | lockfile | Computed-style audit, evidence, a11y | Audit artifact | Apache-2.0 |

#### Build-loop integration

| Stage | Tool | Command or action | Artifact |
| --- | --- | --- | --- |
| Research | Firecrawl, Playwright, REA | `pnpm factory:research <url>` | `reference-audit.md`, `tokens.reference.json` |
| Direction | Impeccable, creative director | `/impeccable init`; direction memo | `PRODUCT.md`, `DESIGN.md`, `decisions.md` |
| Scaffold | shadcn CLI, factory registry | `pnpm factory:component add @factory/<name>` | Vendored source with provenance |
| Build | transitions.dev, GSAP/Lenis | `/skill transitions-dev`; motion layer | Components and motion |
| Polish | Impeccable | `/impeccable critique`; `/impeccable audit`; `npx impeccable detect src/` | Findings, fixes |
| Verify | Impeccable, axe, Lighthouse, Playwright | `pnpm factory:audit` | CI result + evidence |
| Review | PR template | Evidence table, preview URL, limitations | Human decision |
| Maintain | Doctor, licence audit | `pnpm factory:doctor`; monthly dependency review | Upkeep ticket |

`package.json` scripts:

```json
{
  "scripts": {
    "factory:research": "node factory/scripts/reference-audit.mjs",
    "factory:component": "node factory/scripts/add-component.mjs",
    "factory:polish": "npx impeccable detect src/",
    "factory:doctor": "node factory/scripts/doctor.mjs",
    "factory:audit": "pnpm factory:polish && pnpm test:a11y && pnpm test:size"
  }
}
```

Doctor additions:

| Check | Command or condition | Failure |
| --- | --- | --- |
| Impeccable installed and runnable | `npx impeccable detect --list-rules` | Print install command |
| REA available when enabled | `rea --version` or configured `DSH_REA_CLI` | Disable REA for the ticket |
| Firecrawl key present when research is enabled | `FIRECRAWL_API_KEY` exists; never print it | Research step blocked |
| shadcn CLI version pinned | `pnpm dlx shadcn@<pinned> --version` matches the toolchain | Regenerate lock |
| Vendored components have provenance | Every file under `packages/sections` has a source header | Block merge |
| Licence notices current | `THIRD_PARTY_NOTICES.md` mentions every vendored package | Block merge |

#### Security and cost controls

- **Pin every install.** Use `pnpm add` with the lockfile; avoid unpinned `npx` in the build loop. When a registry requires `npx`, pin the package version and review the fetched source.
- **Review before install.** A component or skill is code; read it, check the licence, check the maintainer, and record the decision.
- **Network allowlist.** Limit worker egress to npm, the skills registry, Firecrawl, 21st.dev, Impeccable and the client's own domains; log outbound calls.
- **Secrets in env only.** Firecrawl, 21st and hosting keys live in the environment, never in prompts, briefs, screenshots or commits.
- **No private content.** Do not scrape authenticated pages, private Feishu content or client-confidential material; do not send it to third-party APIs.
- **Cost controls.** Cache scrapes by URL hash; cap Firecrawl crawls per ticket; use the smallest model that passes; count token and API spend per accepted site.
- **Licence hygiene.** Keep licence texts, record the source and date, and re-check when a component is updated.
- **Remove unused code.** Vendored components that are not rendered are deleted before review.

#### Recommended install sets

| Set | Packages and skills | When |
| --- | --- | --- |
| Baseline | `gsap`, `lenis`, Impeccable, transitions.dev skill | Every site |
| Editorial extras | `shadcn/ui` primitives; `@relume_io/relume-ui` only if the Relume workflow is chosen | Editorial lane |
| Immersive extras | `three`, `@react-three/fiber`, `@react-three/drei`, `motion` (if needed) | Immersive lane |
| Research | `playwright` (already present), `firecrawl`, `rea-agents` | Reference-audit tickets |
| Component sources | Aceternity, Magic UI, 21st, Relume | Vendored per site; never all at once |

---

## Appendices

### A. Brief intake schema

```yaml
client: Acme
slug: acme
lane: editorial            # editorial | immersive
requested_template: editorial-serif
goal: >
  Launch a single-page site that makes Acme's precision manufacturing
  credible to procurement leads and drives quote requests.
audience: >
  Technical buyers at mid-size manufacturers, 35–55, skeptical of marketing.
tone: [precise, understated, warm]
avoid:
  - purple gradients
  - stock office photography
  - words like "empower" and "unlock"
pages:
  - path: /
    purpose: Establish capability, show process, drive quote request
  - path: /process
    purpose: Explain the five-step process with tolerances and lead times
references:
  - url: https://reference.example/studio
    borrow: [type scale, generous whitespace, scroll reveal pacing]
assets:
  logo: https://acme.example/logo.svg
  fonts: [Display, Text]
  photography: https://acme.example/assets
  video: none
copy:
  source: client            # client | factory
  owner: jane@acme.example
constraints:
  deadline: 2026-12-01
  languages: [en]
  integrations: [contact form → email]
  legal: no customer logos without written permission
acceptance:
  - A procurement lead understands the offer within 10 seconds
  - Quote form works and has validation, success and error states
  - Lighthouse mobile performance ≥ 90, accessibility 100
evidence:
  baseline: none            # new site
  required: [mobile-light, mobile-dark, desktop-light, desktop-dark]
```

The GitHub Issue Form should ask for the same fields and reject the issue if the required ones are empty. The orchestrator may ask one clarifying question, but it should not interview the client over many turns.

### B. Design QA checklist

**Brief and content**

- [ ] Goal, audience and CTA are visible in the page hierarchy.
- [ ] All copy is real, approved and consistent in voice.
- [ ] Claims, names, numbers and logos are client-approved.
- [ ] No placeholder text, dead links or `href="#"`.

**Typography**

- [ ] One or two families; no more than three weights.
- [ ] Clear scale and hierarchy; body measure 55–75 characters.
- [ ] Line heights appropriate for display and body.
- [ ] Fonts self-hosted, subset, `font-display: swap`, no layout shift.
- [ ] Punctuation, quotes and dashes are correct.

**Composition**

- [ ] Consistent grid and spacing scale.
- [ ] Intentional asymmetry or one grid break; not everything centred.
- [ ] Section rhythm is consistent; whitespace is deliberate.
- [ ] Mobile layout is designed, not merely stacked.

**Colour and material**

- [ ] One accent, restrained neutrals, intentional contrast.
- [ ] Text contrast ≥ 4.5:1 (large ≥ 3:1).
- [ ] Gradients, glass and shadows have a reason.
- [ ] Dark mode, if present, is designed and tested.

**Imagery**

- [ ] Images are licensed and recorded in `LICENSES.md`.
- [ ] Correct dimensions, modern formats, responsive sources.
- [ ] Meaningful alt text; decorative images empty alt.
- [ ] No stretched, pixelated or inconsistent treatment.

**Motion**

- [ ] Every animation has a purpose and a hierarchy.
- [ ] Timings and easing match the motion tokens.
- [ ] Reduced-motion path works; no information depends on motion.
- [ ] No scroll hijack; 60 fps on the target device.
- [ ] GSAP contexts and Lenis are cleaned up on unmount.

**Interaction**

- [ ] Hover, focus-visible, active and disabled states exist.
- [ ] Forms validate, submit, succeed and fail with clear messages.
- [ ] Menus, modals and carousels are keyboard-complete.
- [ ] Video has controls, captions and no autoplay audio.

**Responsive**

- [ ] Tested at 390, 768 and 1440 px; no horizontal scroll.
- [ ] Tap targets ≥ 24×24 px (44×44 preferred).
- [ ] No content hidden on mobile that is essential.

**Accessibility**

- [ ] One `h1`, logical heading order, landmarks.
- [ ] Keyboard complete; focus visible; no traps.
- [ ] axe: zero critical/serious findings.
- [ ] Screen-reader spot check on the primary flow.

**Performance**

- [ ] Budgets met on mobile.
- [ ] Images sized and lazy-loaded below the fold.
- [ ] JS within budget; no unused heavy dependencies.
- [ ] No layout shift; fonts and media reserve space.

**SEO and metadata**

- [ ] Unique title and description per page; canonical URL.
- [ ] OG/Twitter image renders and is not blank.
- [ ] Sitemap, robots, favicon, 404.
- [ ] JSON-LD where relevant; no broken structured data.

**Evidence**

- [ ] Before/after at the same viewport, theme and state.
- [ ] Preview URL matches the reviewed commit.
- [ ] Checks are green for that commit.
- [ ] Known limitations stated honestly.

### C. Anti-slop checklist

Quick scan before requesting review. Any **blocker** stops the PR.

- [ ] No purple/blue gradient hero unless the brand owns it.
- [ ] No three-identical-feature-cards default structure.
- [ ] No glassmorphism without a material reason.
- [ ] No emoji used as icons.
- [ ] No lorem ipsum, placeholder names or `href="#"`.
- [ ] No fake logos, testimonials, awards or statistics.
- [ ] No generic "empower/unlock/elevate" copy.
- [ ] No stock photography that could belong to any company.
- [ ] No uniform radius/shadow on every element.
- [ ] No gradient text or neon glow as the main idea.
- [ ] No scroll hijack, custom cursor or sound that breaks usability.
- [ ] No animation that replays on every scroll direction.
- [ ] No section that exists only because templates have it.
- [ ] Every section earns its place in the hierarchy.
- [ ] The specificity test passes: remove the logo, the brand is still recognisable.
- [ ] One clear point of view, executed precisely.
- [ ] Real 404, OG image, favicon and metadata.
- [ ] Mobile and reduced-motion experiences are designed.
- [ ] Performance and accessibility budgets are met.
- [ ] A human would screenshot this page unprompted.

### D. Prepare command

```sh
#!/bin/sh
# Runs once per ticket, from the execution root, before the first worker turn.
set -eu

repo="$HOME/src/website-factory"
branch="agent/$DSH_SUPERAGENT_NAME"

# 1. Refresh and create the isolated checkout (keep it on resume).
git -C "$repo" fetch origin main --quiet
if [ -e "$DSH_SUPERAGENT_DIR/.git" ]; then
  cd "$DSH_SUPERAGENT_DIR"
else
  git -C "$repo" worktree add "$DSH_SUPERAGENT_DIR" -B "$branch" origin/main
  cd "$DSH_SUPERAGENT_DIR"
fi

# 2. Reproducible dependencies.
pnpm install --frozen-lockfile

# 3. Read-only environment check (fails the ticket with a remediation).
pnpm factory:doctor --ci

# 4. Confirm the branch and remote before any work.
git status --short --branch
git log --oneline -3
gh auth status
```

Keep it idempotent. A rerun after a transient failure must not destroy uncommitted work: if the worktree exists and is on the right branch, skip creation.

### E. Verification workflow skeleton

```yaml
name: verify
on:
  pull_request:
    paths:
      - "sites/**"
      - "packages/**"
      - "factory/**"
      - ".github/workflows/**"
  push:
    branches: [main]
concurrency:
  group: verify-${{ github.ref }}
  cancel-in-progress: true
permissions:
  contents: read
jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 12 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm factory:doctor --ci
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - run: npx impeccable detect src/
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:a11y
      - run: pnpm test:visual
      - run: pnpm exec lhci autorun
      - run: pnpm test:links
      - run: pnpm test:size
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: evidence
          path: |
            sites/**/docs/evidence/
            .lighthouseci/
          retention-days: 14
```

### F. References

1. Awwwards — About evaluation (criteria and jury): <https://www.awwwards.com/about-evaluation/>
2. GSAP 3.13 — free for all, including bonus plugins (Webflow): <https://gsap.com/blog/3-13/>
3. Codrops — The architecture behind Trionn (GSAP, Three.js, Lenis, Web Audio): <https://tympanus.net/codrops/2026/07/15/the-architecture-behind-trionn-coordinating-gsap-three-js-lenis-and-web-audio/>
4. Codrops — Building Ridgeline, a real-time 3D experience: <https://tympanus.net/codrops/2026/07/22/building-ridgeline-engineering-a-real-time-3d-experience-in-webflow/>
5. Astro 5 announcement (content layer, islands): <https://astro.build/blog/astro-5/>
6. Next.js 16: <https://nextjs.org/blog/next-16>
7. Vite 8 announcement: <https://vite.dev/blog/announcing-vite8>
8. Lenis — smooth scroll: <https://github.com/darkroomengineering/lenis>
9. animations.dev — how animation should feel: <https://animations.dev/>
10. Josh Comeau — CSS and animation writing: <https://www.joshwcomeau.com/>
11. Refactoring UI — visual hierarchy, spacing, colour: <https://www.refactoringui.com/>
12. Godly — curated web design: <https://godly.website/>
13. AI slop — definition and context: <https://en.wikipedia.org/wiki/AI_slop>
14. WCAG 2.2: <https://www.w3.org/TR/WCAG22/>
15. web.dev — Web Vitals thresholds: <https://web.dev/articles/vitals>
16. Cloudflare Pages — preview deployments: <https://developers.cloudflare.com/pages/configuration/preview-deployments/>
17. Playwright — visual comparisons: <https://playwright.dev/docs/test-snapshots>
18. Lighthouse CI: <https://github.com/GoogleChrome/lighthouse-ci>
19. axe-core: <https://github.com/dequelabs/axe-core>
20. Astro documentation: <https://docs.astro.build/>
21. React Three Fiber documentation: <https://r3f.docs.pmnd.rs/>
22. transitions.dev — UI transitions and agent skill: <https://transitions.dev/>
23. shadcn/ui — code registry: <https://ui.shadcn.com/docs/registry>
24. Aceternity UI: <https://ui.aceternity.com/>
25. Aceternity UI licence: <https://ui.aceternity.com/licence>
26. Magic UI: <https://magicui.design/>
27. 21st.dev — component registry: <https://21st.dev/>
28. Relume Library for React: <https://react-docs.relume.io/>
29. Impeccable — design vocabulary and detector: <https://impeccable.style/>
30. REA — Reverse Engineer Anything: <https://rea.tools/>
31. dsh-rea — DeepSeek Harness adapter: <https://github.com/zhaofeng130/dsh-rea>
32. Firecrawl: <https://firecrawl.dev/>
33. Firecrawl repository (AGPL-3.0): <https://github.com/firecrawl/firecrawl>
34. Playwright — evaluating JavaScript in the page: <https://playwright.dev/docs/evaluating>
35. GSAP standard licence: <https://gsap.com/standard-license>
36. Motion: <https://motion.dev/>

---

*This blueprint is a living document. Every rule that survives contact with real sites should move into a skill or a CI check; every rule that does not should be deleted.*

# Autonomous Website Factory

A monorepo for building client marketing and brand sites with autonomous agents
under human direction. The factory is a **review-throughput system, not a
website builder**: its unit of work is one brief → one branch → one preview →
one human decision. Templates, shared packages and automation exist to make that
loop fast, evidence-rich and cheap in human attention.

Read [`AGENTS.md`](AGENTS.md) before doing anything in this repository. The
architecture and rationale live in
[`docs/website-factory-blueprint.md`](docs/website-factory-blueprint.md).

## Lanes

- **Editorial Luxury** — Astro + TypeScript + Tailwind + GSAP + Lenis, static
  output. The default for editorial and brand sites.
- **Immersive 3D/Video** — Vite + React + React Three Fiber/Three.js + GSAP +
  Lenis, for real-time 3D and video-led work.

Next.js is reserved for app-like requirements (auth, commerce, ISR). One page
is the default unit of work; larger scopes are split into tickets.

## Repository layout

```text
website-factory/
├── AGENTS.md                 # operating rules for agents in this repo
├── README.md                 # this operator guide
├── pnpm-workspace.yaml       # packages/*, factory/*, sites/*
├── package.json              # private root, monorepo scripts
├── docs/                     # blueprint and standards
├── factory/
│   ├── config/               # lanes, templates, defaults
│   ├── briefs/               # intake schema and examples
│   ├── specs/                # five-file spec-pack templates
│   ├── templates/            # editorial and immersive site templates
│   └── scripts/              # doctor, new-site, evidence, cleanup
├── packages/
│   ├── tokens/               # shared design tokens
│   ├── motion/               # shared GSAP/Lenis utilities
│   ├── sections/             # vendored, restyled registry components
│   └── qa/                   # Playwright, axe and Lighthouse presets
└── sites/                    # one directory per client site
```

Directories are scaffolded in this first foundation ticket. The scripts,
templates, tokens and CI workflows that fill them land in follow-up tickets
(see blueprint §5.5 and §5.7).

## Prerequisites

- Node.js 22.22.0 LTS
- pnpm 12.16.1 (pinned through the `packageManager` field)
- git, with worktree support

Enable the pinned package manager and install from the lockfile:

```sh
corepack enable
pnpm install --frozen-lockfile
```

## Root commands

| Command | Purpose |
| --- | --- |
| `pnpm install --frozen-lockfile` | Reproducible workspace install |
| `pnpm build` | Run `build` in every workspace package that defines it |
| `pnpm typecheck` | Run `typecheck` in every workspace package that defines it |
| `pnpm lint` | Run `lint` in every workspace package that defines it |
| `pnpm test` | Run `test` in every workspace package that defines it |
| `pnpm check` | Build, typecheck, lint and test across the workspace |

The workspace is empty of packages in this skeleton, so the recursive commands
are no-ops until packages and sites define their own scripts.

## How agents work in isolated worktrees

Every ticket gets its own git worktree and branch. The DSH orchestrator
assesses the request and writes the mandate; a worker Session does the
implementation and verification in the worktree.

```text
execution root (~/.dsh/state/superagent/work/)
└── <ticket-short-name>/            # git worktree
    └── branch agent/<ticket-short-name>
```

Rules:

- One ticket = one worktree = one branch = one PR. The branch name must end
  with the ticket short name so DSH binds the PR to the ticket.
- The ticket directory is a git worktree created from `origin/main` on branch
  `agent/<ticket-short-name>`; a resumed ticket keeps its commits. The prepare
  step installs from the lockfile and runs the factory doctor once that script
  lands in the next foundation ticket.
- Worktrees are never reused across tickets; a live ticket's directory is never
  deleted. Cleanup happens only after its PR is merged or closed.
- `main` is protected: no direct pushes, required checks, one approval, linear
  history. A person merges every site PR; the factory never self-merges.
- Planning artifacts (`.factory/spec.md`, `design.md`, `plan.md`, `tasks.md`,
  `acceptance.md`, evidence) are ephemeral and gitignored. Durable site
  documentation is committed under `sites/<slug>/docs/`.

The full protocol, including the five-file spec pack and the anti-slop quality
gate, is in [`AGENTS.md`](AGENTS.md).

## How client sites are generated

A client site starts as a copy of a maintained template, so it can diverge
safely without changing the template for everyone:

1. Choose a lane and template — `editorial-serif`, `editorial-sans`,
   `immersive-webgl` or `immersive-video`.
2. Copy `factory/templates/<template>` to `sites/<client-slug>/` (copy, never
   link).
3. Add `sites/<client-slug>/factory.config.json` with the template, version,
   lane and site metadata.
4. Write the site's durable docs under `sites/<slug>/docs/`: `brief.md`,
   `decisions.md`, `LICENSES.md` and final evidence.
5. Build, verify and capture evidence; open one PR for the site.

The intended entry point from blueprint §5.2 is:

```sh
pnpm factory:new -- --slug acme --lane editorial --template editorial-serif
```

The generator is not part of this skeleton; until the factory-scripts ticket
lands, step 2 is a manual copy. CI is path-filtered per site so one build does
not pay for every client.

## Status

This repository currently contains the foundation skeleton (Ticket 1):
workspace configuration, `AGENTS.md`, this operator guide and the directory
layout from blueprint §5.1. Next foundation tickets add the doctor and smoke
scripts, design tokens, the editorial template, the QA harness, evidence
automation and CI.

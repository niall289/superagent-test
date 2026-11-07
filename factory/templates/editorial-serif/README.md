# editorial-serif

The Editorial / Commercial Trade template for the Autonomous Website Factory.
Astro 5, TypeScript, Tailwind 4, GSAP and Lenis, pinned to a
`@factory/tokens` snapshot and shipped as static HTML.

The sample content is a fictional electrical contractor in Swords, Co. Dublin.
It exists to show the content model and the copy standard, not to be deployed
as-is. Replace every value in `src/content/` before a client launch.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Astro 5, `output: 'static'` |
| Language | TypeScript, `astro/tsconfigs/strict` |
| Styling | Tailwind 4 plus semantic classes built on the pinned token snapshot |
| Motion | Lenis smooth scroll and GSAP ScrollTrigger, one RAF loop |
| Type | Newsreader Variable (self-hosted through Fontsource), token sans for UI |
| Content | Typed Astro content collections with Zod |
| SEO | Canonicals, OG/Twitter tags, JSON-LD, sitemap, robots |

## Commands

The template is not a member of the factory pnpm workspace, so when working
inside the monorepo install with `--ignore-workspace`. A copied site owns its
own lockfile and uses plain `pnpm install`.

```sh
pnpm install --ignore-workspace   # in-repo template development only
pnpm sync:tokens                  # refresh the token snapshot from packages/tokens
pnpm dev
pnpm build
pnpm typecheck                    # astro check
pnpm check:links                  # after a build: internal links and anchors
pnpm check                        # typecheck + build + link check
```

From the factory root, the anti-slop gate covers this template too:

```sh
pnpm lint:anti-slop
```

## Structure

```text
editorial-serif/
├── astro.config.mjs          # static output, sitemap, Tailwind Vite plugin
├── src/
│   ├── components/
│   │   ├── Header.astro      # sticky nav, accessible mobile dialog
│   │   ├── Hero.astro
│   │   ├── ProofBar.astro    # registration and insurance evidence
│   │   ├── Services.astro    # asymmetric 5/7 grid
│   │   ├── Projects.astro    # case studies with spec tables
│   │   ├── ContactTriage.astro
│   │   ├── Footer.astro
│   │   └── plates/           # inline SVG technical plates
│   ├── content/              # site/site.json, services/, projects/
│   ├── content.config.ts     # Zod schemas
│   ├── layouts/Layout.astro  # head, SEO, chrome, motion entry
│   ├── lib/                  # content and SEO helpers
│   ├── pages/                # index, privacy, terms, 404
│   ├── scripts/motion.ts     # Lenis + GSAP, reduced-motion aware
│   ├── styles/tokens.css     # pinned @factory/tokens snapshot
│   └── styles/global.css     # token theme, components
├── public/                   # favicons and OG image
├── scripts/check-links.mjs
├── DESIGN.md
├── LICENSES.md
└── README.md
```

## Content model

`src/content.config.ts` defines three collections:

- **site** — one JSON file: legal name, trading name, description, URL, phone
  numbers, address, registrations, service area, opening hours, navigation and
  statutory disclaimers.
- **services** — one JSON file per service, with `order`, `summary`, `body`,
  `deliverables`, `leadTime` and `standards`.
- **projects** — one JSON file per case study, with sector, location, year,
  brief, outcome, a typed spec list and a `plate.id` that selects the drawing.

The schema rejects missing required fields at build time. Add a service or
project by adding a JSON file; no component change is needed unless you add a
new plate type (extend the `plate.id` enum and the `ProjectPlate` switch).

The site origin is declared once in `src/content/site/site.json`. `astro.config.mjs`
reads it for `site`, and `Layout.astro` derives canonical, OG and JSON-LD URLs
from it. Change it there, not in the components.

## Contact form

The form is progressively enhanced: without JavaScript the noscript block
gives the phone and email fallback, and the browser still validates required
fields. With JavaScript it validates inline, exposes errors through
`aria-describedby`, and shows success and failure states in a live region.

Set `data-endpoint` on the form (or inject it from a public environment
variable) to POST JSON to your own handler. Until then the form reports that
the submission was captured in demo mode and does not pretend to deliver mail.
Always validate the payload on the server; client validation is a courtesy, not
a security boundary.

## Design tokens

`src/styles/global.css` imports the pinned `src/styles/tokens.css` snapshot and
maps the tokens into Tailwind theme keys. The snapshot is generated from
`packages/tokens/tokens.css` by `pnpm sync:tokens`; the package remains the
source of truth, and the copy keeps the template standalone when it is copied
into a site. Components use semantic classes
(`.display`, `.lede`, `.specs__row`) built on the same variables, so a token
change propagates without editing components.

The template does not override `--accent`; the token's warm gold is the single
accent. To apply a client accent, override only that token in a site-level
stylesheet and record the contrast check in the site's `decisions.md`.

## SEO

`Layout.astro` accepts `title`, `description`, optional `image`, `noindex` and
optional `jsonLd`. It emits a canonical from `Astro.url.pathname`, OG and
Twitter tags, and defaults to a `LocalBusiness` (`Electrician`) JSON-LD built
from approved site content. Add ratings, awards or profiles to the JSON-LD only
when the client has supplied the evidence.

Replace `public/og-default.png` (1200 × 630) and keep
`public/og-default.svg` as the editable source. `src/pages/robots.txt.ts` points at the generated sitemap and derives the
origin from `src/content/site/site.json`, so the two cannot drift.

## Motion and accessibility

- `src/scripts/motion.ts` starts Lenis and GSAP only when
  `prefers-reduced-motion` is not set, and removes both when it changes.
- Sections opt in with `data-motion="reveal"`. Without JavaScript everything is
  visible; motion never carries information.
- The mobile navigation is a native `<dialog>`: it traps focus, closes with
  Escape, restores focus to the trigger and pauses background scroll.
- Touch targets are at least 44 × 44 px; focus styles are visible on every
  interactive element; body copy meets 4.5:1 against the canvas.
- `pnpm typecheck` plus `pnpm check:links` are the minimum local gate. Run an
  axe scan before review once the QA harness ticket lands.

## Verification and anti-slop

```sh
pnpm check
pnpm lint:anti-slop
```

The anti-slop gate rejects filler phrases from
`factory/config/banned-phrases.json`, pure black literals and raw Tailwind
colour utilities. This template uses token variables throughout, including in
the technical plates.

Reference captures for template 0.1.0, including the scaffold baseline for the
foundation ticket, live in `docs/evidence/`.

## Demo content and legal text

The brand, staff names, project data, registration numbers and phone numbers
are illustrative. `privacy.astro` and `terms.astro` are starting points for a
client's own policies, not legal advice; have them reviewed before launch.
Record font, library and asset licences in `LICENSES.md` and the site's
`docs/LICENSES.md`.

## Version

Template `editorial-serif` 0.1.0. Record the version and the template commit in
the site's `factory.config.json` when copying.

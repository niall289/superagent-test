# Ticket 4 evidence — editorial-serif template

Captured from the built site (`pnpm build`, served as static `dist/`) with
Playwright Chromium at 1440 × 900 and 390 × 844, dark colour scheme.

| File | Revision | Notes |
| --- | --- | --- |
| `ticket-4-before-1440.png` | `295cdf2` scaffold | Bare Astro scaffold page before the editorial implementation |
| `ticket-4-before-390.png` | `295cdf2` scaffold | Same scaffold at mobile width |
| `ticket-4-after-1440.png` | implementation commit | Home page, full page, all reveals settled |
| `ticket-4-after-390.png` | implementation commit | Home page viewport at mobile width |
| `ticket-4-after-390-menu.png` | implementation commit | Native mobile navigation dialog open |
| `ticket-4-after-768.png` | implementation commit | Home page viewport at tablet width |

The scaffold baseline is the real prior revision of this new template; no
production site existed for this path. After captures use the same viewport,
theme and page scenario. `after-1440.png` is a full-page capture; the mobile
files are viewport captures because the full page exceeds normal image limits.

Verification at the implementation revision:

- `pnpm check` — `astro check`, static build and link/anchor check pass.
- `pnpm lint:anti-slop` from the factory root — clean.
- axe-core 4.14, WCAG 2.0/2.1/2.2 A and AA rules on `/`, `/privacy/`, `/terms/`,
  `/404.html` — zero violations (zero critical or serious).
- Interaction matrix — 16/16: no horizontal overflow at 390/768/1440, drawer
  focus and Escape handling, empty-submit errors, successful submit state,
  reduced-motion content visibility, canonical/OG/JSON-LD present.

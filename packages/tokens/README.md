# @factory/tokens

The canonical Master Design tokens for every factory site. **Archetype A:
Engageio Dark** — tinted near-blacks, a single warm accent, one type pairing
and one motion language.

The package has two mirrors of the same values:

| File | Audience |
| --- | --- |
| `tokens.css` | CSS / Tailwind / any stylesheet |
| `design-tokens.json` | scripts, tests, generators and tooling |

`packages/tokens/test/tokens.test.mjs` fails if the two drift apart, and
`pnpm lint:anti-slop` fails on pure-black literals or raw Tailwind colour
literals outside token files.

## Usage

Copy or import the package from a site. Sites are standalone projects, so the
package is consumed by path or copied by the design-install script once that
lands:

```css
@import "@factory/tokens/tokens.css";
```

From Node or a generator:

```js
import tokens from '@factory/tokens/design-tokens.json' with { type: 'json' }

const canvas = tokens.cssVariables['--canvas']
```

Override **only** what the approved art-direction memo justifies. In practice
that is the single brand accent; everything else is archetype furniture:

```css
:root {
  --accent: #b4552d; /* approved brand accent, with a contrast check */
}
```

Do not add a second accent, a second radius family or a second display face in
a site. Divergence is recorded in the site's `decisions.md`.

## Colour

| Token | Value | Role |
| --- | --- | --- |
| `--canvas` | `#09090b` | Page background |
| `--surface-1` | `#121215` | Cards, sheets |
| `--surface-2` | `#18181b` | Raised or nested surface |
| `--hairline` | `rgba(255, 255, 255, 0.08)` | Dividers and borders |
| `--text-1` | `#fafafa` | Headings and primary copy |
| `--text-2` | `#a1a1aa` | Secondary copy |
| `--text-3` | `#71717a` | Metadata and large text only; 4.12:1 on canvas |
| `--accent` | `#d4a72c` | The single brand accent (override per memo) |
| `--ok` | `#7fae8b` | Success, desaturated |
| `--warn` | `#c2a15b` | Warning, desaturated |
| `--danger` | `#c97a7a` | Error, desaturated |
| `--info` | `#7d9bb8` | Informational, desaturated |

Body copy uses `--text-1` or `--text-2` (7.7:1 or better on the canvas).
`--text-3` is a metadata token, not a body-text token.

## Radius

`--r-sm: 6px` and `--r-md: 12px` form a concentric pair. Keep the formula
`inner = outer − gap`: a `--r-md` card with an 8 px gap holds a `--r-sm`
control, so nested corners do not look pinched.

## Typography

| Token | Value |
| --- | --- |
| `--font-sans` | Geist, then Plus Jakarta Sans, then system sans |
| `--font-mono` | Geist Mono, then JetBrains Mono, then system mono |
| `--font-variant-numeric-tabular` | `tabular-nums` |
| `--text-sm` | `clamp(0.875rem, 0.85rem + 0.15vw, 0.9375rem)` |
| `--text-base` | `clamp(1rem, 0.96rem + 0.2vw, 1.125rem)` |
| `--text-lg` | `clamp(1.25rem, 1.1rem + 0.75vw, 1.625rem)` |
| `--text-display` | `clamp(2.5rem, 1.6rem + 4.5vw, 5rem)` |
| `--leading-tight` / `--leading-body` / `--leading-display` | `1.15` / `1.55` / `0.98` |
| `--weight-regular` / `--weight-medium` / `--weight-semibold` | `400` / `500` / `600` |
| `--measure` | `65ch` |

Use at most three weights on a page. Set `font-variant-numeric:
var(--font-variant-numeric-tabular)` on prices, timestamps and statistical
figures.

## Spacing and layout

`--space-1` through `--space-10` are 4, 8, 12, 16, 24, 32, 48, 64, 96 and
128 px on a 4/8 px base unit. Section rhythm is `--section-y-mobile: 64px` and
`--section-y-desktop: 128px`; gutters are `--gutter-mobile: 16px`,
`--gutter-tablet: 24px`, `--gutter-desktop: 32px`; `--content-max` is `80rem`.

Layer order runs `--z-base: 0`, `--z-raised: 10`, `--z-sticky: 100`,
`--z-overlay: 200`, `--z-modal: 300`, `--z-toast: 400`.

## Motion

| Token | Value |
| --- | --- |
| `--duration-fast` | `150ms` (UI feedback) |
| `--duration-base` | `300ms` (entrances) |
| `--duration-narrative` | `600ms` (narrative transitions) |
| `--stagger` | `60ms` |
| `--spring-stiffness` | `260` |
| `--spring-damping` | `20` |
| `--ease-entrance` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--ease-exit` | `cubic-bezier(0.55, 0, 1, 0.45)` |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--motion-scale` | `1` (full motion) / `0` (reduced motion) |

The spring values are for the JS motion layer; CSS transitions use the
duration and easing tokens. Animate `transform` and `opacity`, never layout
properties.

Under `prefers-reduced-motion: reduce` the durations collapse to `0.01ms`,
stagger becomes `0ms` and `--motion-scale` becomes `0`. Motion is never the
only carrier of information.

## Verification

```sh
pnpm -F @factory/tokens test
pnpm lint:anti-slop
```

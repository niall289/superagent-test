# Design direction — editorial-serif

## Concept

**The test certificate.** A commercial trade brand presented the way an
engineer's report is presented: a serif voice with a measured, tabular
counterpart. The page reads like a well-kept site file — drawings, dates,
registration numbers, a specification table — not a marketing brochure.

The sample brand is Kilbride Electrical, an electrical contractor in Swords.
Replace the brand, not the system: asymmetric grids, technical plates, one
accent, and copy that names buildings and numbers.

## Type

- **Display and body:** Newsreader Variable, self-hosted through Fontsource.
  Optical size, true italic for one emphasised word, and a 0.98–1.05 leading on
  display lines.
- **UI and labels:** the token sans stack at 11–14 px for eyebrows, labels,
  buttons and navigation. Weights 400, 500 and 600 only.
- **Data:** the token mono stack for drawing numbers, registration numbers,
  specs and phone numbers. Figures use tabular numerals.

The display scale is fluid (`--text-display`), capped at 5 rem. Body copy is the
token base size at 1.55 leading with a 65-character measure. No third family.

## Colour and material

The token dark palette, unchanged: tinted canvas `#09090b`, two raised surfaces,
one hairline, three text levels and the warm gold accent. Gold marks the
single deliberate decision on a screen: the italic word in the headline, the
rule before an eyebrow, the live line in a drawing, the primary button.

No gradients, no glass, no floating cards. Material is a 1 px hairline and a
flat surface; drawings are line work, not photographs.

## Composition

- 12-column desktop grid expressed as 7/5 and 5/7 splits; 4-column mobile.
- Section rhythm 64 px mobile and 128 px desktop from the tokens.
- One deliberate asymmetry per section; project plates alternate sides at
  desktop while the reading order stays title → brief → outcome → specs.
- The proof bar is a four-cell ledger with hairline rules, not four cards.
- Maximum content width 80 rem; prose measure 68ch for legal pages.

## Imagery

No stock photography. Project imagery is a set of inline SVG technical plates:
a racking plan with luminaire positions, a Georgian window bay with concealed
routes, and a cold-store single-line diagram. They are labelled like drawings
(sheet number, revision, scale) and carry a real alt description. This keeps
the page honest when the client has not supplied photography, and gives the
template a specific visual language that a stock image would replace badly.

## Motion

One RAF loop (Lenis + GSAP). Sections reveal with a 16 px rise and 600 ms
ease-out, once, at 88% viewport. Lenis handles wheel smoothing and anchors; the
native scroll position, keyboard, and `#` links remain authoritative. Under
`prefers-reduced-motion: reduce` neither library starts, and content is
visible. Nothing depends on motion.

## References

- **Swiss technical documentation** — the drawing sheet frame, corner ticks,
  sheet number and revision block.
- **Independent magazine layout** — large serif display, a narrow measure, and
  a single accent used as a rule rather than a fill.
- **Trade-led brand sites** — the credibility of registrations, dates and
  completed buildings instead of generic claims.

## Anti-references

- Purple gradient heroes with floating blobs.
- Three equal feature cards with emoji icons.
- Glassmorphism navigation and cards.
- Centred hero with two identical buttons and a generic subhead.
- Stock "diverse team" photography and invented awards.

## Specificity test

Remove the wordmark. The page still reads as an electrical contractor in
Dublin: the drawings are electrical, the standards are IS 10101 and IS 3218,
the projects name Sandyford, Merrion Square and Dublin Port, and the accent is
a brass gold rather than a SaaS purple. The voice is a site foreman's, not a
marketing department's.

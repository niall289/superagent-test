---
schema_version: 1
kind: design
archetype: "{{ARCHETYPE}}"        # editorial-serif | editorial-sans | immersive-webgl | immersive-video
tokens:
  package: "packages/tokens"
  version: "{{TOKENS_VERSION}}"
  overrides:
    color.accent: "{{ACCENT_HEX}}"
palette:
  background: "{{BACKGROUND_HEX}}"
  foreground: "{{FOREGROUND_HEX}}"
  accent: "{{ACCENT_HEX}}"
  muted: "{{MUTED_HEX}}"
  surface: "{{SURFACE_HEX}}"
type_scale:
  display:
    family: "{{DISPLAY_FAMILY}}"
    size: "{{DISPLAY_SIZE}}"
    line_height: 0.95
    weight: 600
  body:
    family: "{{BODY_FAMILY}}"
    size: "{{BODY_SIZE}}"
    line_height: 1.55
    weight: 400
motion_tokens:
  duration_fast: "150ms"
  duration_base: "300ms"
  duration_narrative: "600ms"
  ease_entrance: "{{EASE_ENTRANCE}}"
  ease_exit: "{{EASE_EXIT}}"
  stagger: "60ms"
---

# Design direction — {{CLIENT_NAME}}

> Copy this file to `.factory/design.md` and replace every `{{PLACEHOLDER}}`.
> Every token value must be concrete before the build starts.

## Concept

One paragraph: the organising idea, in the client's terms.

## References

For each reference, state exactly what to borrow: composition, type, motion or
material. Do not write "make it like this".

## Imagery

Subject, treatment, provenance and licensing. No generic stock photography.

## Anti-references

The clichés and competitor looks this direction must avoid.

## One thing to avoid

The single tell most likely to make this site read as slop.

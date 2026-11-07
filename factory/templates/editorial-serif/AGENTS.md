# AGENTS.md — editorial-serif template

This directory is a template, not a client site. The operating rules in the
repository root [`AGENTS.md`](../../../AGENTS.md) still apply. When the
template is copied into `sites/<slug>/`, add the site's own `docs/` and
`factory.config.json`.

Rules for agents changing this template:

1. **Tokens first.** Colour, type, spacing, radius and motion values come from
   `@factory/tokens` (the pinned `src/styles/tokens.css` snapshot). A template-level addition must be a documented token in
   `src/styles/global.css`, not a literal in a component.
2. **One accent.** The token `--accent` is the only accent. Sites may override
   that one value with a recorded contrast check; do not add a second.
3. **One section, one component.** Section components own their layout and
   copy; shared primitives belong in `src/components/` only when used twice.
4. **Content is typed.** Add copy to `src/content/`, never inline in three
   places. Extend the Zod schema in `src/content.config.ts` when a field is
   genuinely required.
5. **Motion is opt-in.** `data-motion="reveal"` is the only entrance hook, and
   everything must work with JavaScript disabled and with reduced motion.
6. **No stock imagery or invented claims.** Use original plates or client
   assets. Registrations, numbers and project facts are sample data and must be
   replaced before a launch.
7. **Verify before review:** `pnpm check` and, from the factory root,
   `pnpm lint:anti-slop`. Take screenshots at 390, 768 and 1440 px for any UI
   change.

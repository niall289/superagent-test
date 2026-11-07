#!/usr/bin/env node
/**
 * Refresh the vendored token snapshot from packages/tokens.
 *
 * The template must stay standalone when it is copied into sites/<slug>, so it
 * ships a pinned copy of tokens.css rather than a workspace file dependency.
 * This script is the only supported way to update that copy.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../../../../packages/tokens/tokens.css', import.meta.url))
const target = fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url))

if (!existsSync(source)) {
  console.error('sync-tokens: packages/tokens/tokens.css not found.')
  console.error('Run this inside the factory monorepo; a copied site keeps its pinned snapshot.')
  process.exit(1)
}

const header = `/* ==========================================================================
   @factory/tokens — pinned snapshot for editorial-serif 0.1.0

   Source of truth: packages/tokens/tokens.css in the website-factory repo.
   Do not edit this copy by hand. Inside the factory monorepo refresh it with
   \`pnpm sync:tokens\`; a copied site keeps this snapshot with its lockfile.
   ========================================================================== */
`

writeFileSync(target, header + readFileSync(source, 'utf8'))
console.log('sync-tokens: refreshed src/styles/tokens.css')

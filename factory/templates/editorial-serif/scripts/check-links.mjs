#!/usr/bin/env node
/**
 * Dependency-free internal link and asset check for the built site.
 *
 * It walks dist/ for HTML, resolves every internal href/src against the built
 * file tree, and verifies that hash targets exist in the destination document.
 * External URLs, mailto:, tel: and data: are ignored.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
const origin = 'https://template.invalid'

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(path)))
    else files.push(path)
  }
  return files
}

function idSet(file) {
  const html = readFileSync(file, 'utf8')
  return new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]))
}

function resolveInternal(pathname) {
  const clean = decodeURIComponent(pathname)
  if (clean === '/' || clean === '') return join(dist, 'index.html')

  const direct = join(dist, clean)
  if (existsSync(direct) && statSync(direct).isFile()) return direct

  if (existsSync(join(direct, 'index.html'))) return join(direct, 'index.html')

  if (!extname(clean) && existsSync(`${direct}.html`)) return `${direct}.html`

  return null
}

if (!existsSync(dist)) {
  console.error('check-links: dist/ is missing. Run `pnpm build` first.')
  process.exit(2)
}

const files = await walk(dist)
const htmlFiles = files.filter((file) => file.endsWith('.html'))
const ids = new Map(htmlFiles.map((file) => [file, idSet(file)]))
const problems = []
let checked = 0

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8')
  const page = relative(dist, file).replaceAll('\\', '/')
  const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1])

  for (const reference of references) {
    if (!reference || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(reference)) continue

    checked += 1

    if (reference.startsWith('#')) {
      const target = reference.slice(1)
      if (target && !ids.get(file)?.has(target)) {
        problems.push(`${page}: missing anchor #${target}`)
      }
      continue
    }

    const url = new URL(reference, `${origin}/${page}`)
    const target = resolveInternal(url.pathname)
    if (!target) {
      problems.push(`${page}: missing file for ${url.pathname}`)
      continue
    }

    if (url.hash && target.endsWith('.html')) {
      const anchor = decodeURIComponent(url.hash.slice(1))
      if (anchor && !ids.get(target)?.has(anchor)) {
        problems.push(`${page}: missing anchor #${anchor} in ${relative(dist, target)}`)
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`check-links: ${problems.length} problem(s)`)
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}

console.log(`check-links: clean (${htmlFiles.length} page(s), ${checked} internal reference(s))`)

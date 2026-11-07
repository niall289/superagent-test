#!/usr/bin/env node
/**
 * Anti-slop compiler gate.
 *
 * Deterministic, dependency-free checks run before a site can leave draft:
 *
 *   1. banned phrase  — filler from factory/config/banned-phrases.json;
 *   2. pure black     — #000 / #000000 / rgb(0,0,0) outside token files;
 *   3. raw Tailwind   — arbitrary or palette colour utilities where a design
 *                       token belongs.
 *
 * Suppression directives (reviewed like any other line of code):
 *
 *   anti-slop-ignore-line                  ignore every rule on this line
 *   anti-slop-ignore-next-line             ignore every rule on the next line
 *   anti-slop-ignore-file                  ignore the whole file; must appear
 *                                          in the first five lines
 *   anti-slop-ignore-line=tailwind,black   ignore only the named rules
 *
 * The factory's own rulebook (AGENTS.md and the blueprint's anti-slop
 * taxonomy) intentionally quotes the blacklist as examples, so those two
 * documents are exempt. Token files are exempt from the colour rules because
 * they define the canonical values.
 *
 * Usage: node factory/scripts/anti-slop-lint.mjs [--json] [path ...]
 *
 * Exit codes: 0 = clean, 1 = slop detected, 2 = tool/configuration error.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const REPO_ROOT = resolve(dirname(SCRIPT_PATH), '../..')
const CONFIG_PATH = resolve(REPO_ROOT, 'factory/config/banned-phrases.json')
const RULEBOOK_FILES = new Set([
  resolve(REPO_ROOT, 'AGENTS.md'),
  resolve(REPO_ROOT, 'docs/website-factory-blueprint.md'),
])

const TEXT_EXTENSIONS = new Set([
  '.md',
  '.mdx',
  '.markdown',
  '.astro',
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.vue',
  '.svelte',
  '.json',
  '.yaml',
  '.yml',
  '.txt',
])

const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.factory',
  '.astro',
  '.next',
  '.turbo',
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  'test-results',
  'playwright-report',
  '.lighthouseci',
  'reference-cache',
])

const IGNORED_FILES = new Set([
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'bun.lockb',
])

const COLOUR_UTILITIES = [
  'bg',
  'text',
  'border',
  'ring',
  'outline',
  'fill',
  'stroke',
  'decoration',
  'divide',
  'from',
  'via',
  'to',
  'shadow',
  'accent',
  'caret',
  'placeholder',
].join('|')

const TAILWIND_PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'

const COLOUR_SIDE = '(?:-(?:x|y|t|r|b|l|s|e))?'

const BLACK_PATTERNS = [
  /(?<![0-9a-f])#(?:000000|000)(?![0-9a-f])/gi,
  /\brgba?\(\s*0\s*,\s*0\s*,\s*0\s*(?:,\s*[\d.]+%?\s*)?\)/gi,
  /\brgba?\(\s*0\s+0\s+0\s*(?:\/\s*[\d.]+%?\s*)?\)/gi,
]

const TAILWIND_PATTERNS = [
  new RegExp(
    `\\b(?:${COLOUR_UTILITIES})${COLOUR_SIDE}-\\[[^\\]]*(?:#|rgba?\\(|hsla?\\()[^\\]]*\\]`,
    'gi',
  ),
  new RegExp(
    `\\b(?:${COLOUR_UTILITIES})${COLOUR_SIDE}-(?:${TAILWIND_PALETTE})-(?:50|[1-9]00|950)\\b`,
    'gi',
  ),
  new RegExp(
    `\\b(?:${COLOUR_UTILITIES})${COLOUR_SIDE}-(?:black|white)\\b`,
    'gi',
  ),
]

const IGNORE_PATTERN =
  /anti-slop-ignore(?:-(next-line|line|file))?(?:\s*=\s*([a-z,\s]+))?/gi

const RULE_NAMES = new Set(['phrase', 'black', 'tailwind'])

const HELP = `anti-slop compiler gate

Usage: node factory/scripts/anti-slop-lint.mjs [--json] [--help] [path ...]

Scans source files and markdown for banned filler phrases, pure black colour
literals and raw Tailwind colour utilities. With no paths it scans the
repository, skipping dependency, build, git and planning directories.

Options:
  --json    print a machine-readable report
  --help    show this help

Suppression:
  anti-slop-ignore-line
  anti-slop-ignore-next-line
  anti-slop-ignore-file
  Append =phrase,black,tailwind to suppress only those rules.

Exemptions: token files (colour rules only), the rulebook documents
(AGENTS.md and the blueprint, which quote the blacklist), lockfiles, and the
gate's own configuration/script.

Exit codes: 0 clean, 1 slop detected, 2 tool or configuration error.

Banned phrases come from factory/config/banned-phrases.json.`

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseRuleList(raw) {
  if (!raw) return null
  const rules = new Set()
  for (const part of raw.split(',')) {
    const rule = part.trim().toLowerCase()
    if (RULE_NAMES.has(rule)) rules.add(rule)
  }
  return rules.size > 0 ? rules : null
}

function parseDirectives(line) {
  const directives = { line: new Set(), next: new Set(), file: new Set() }
  for (const match of line.matchAll(IGNORE_PATTERN)) {
    const kind = match[1] ?? 'line'
    const rules = parseRuleList(match[2])
    const bucket =
      kind === 'next-line'
        ? directives.next
        : kind === 'file'
          ? directives.file
          : directives.line
    if (rules) {
      for (const rule of rules) bucket.add(rule)
    } else {
      bucket.add('*')
    }
  }
  return directives
}

function ignoredBy(set, rule) {
  return set.has('*') || set.has(rule)
}

export function loadConfig(path = CONFIG_PATH) {
  let data
  try {
    data = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(
      `cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${path} must contain a JSON object`)
  }
  if (data.schemaVersion !== 1) {
    throw new Error(`${path} must declare schemaVersion 1`)
  }
  if (
    !Array.isArray(data.phrases) ||
    data.phrases.length === 0 ||
    data.phrases.some((phrase) => typeof phrase !== 'string' || !phrase.trim())
  ) {
    throw new Error(`${path} must declare a non-empty phrases array of strings`)
  }

  const seen = new Set()
  const phrases = []
  for (const phrase of data.phrases) {
    const normalised = phrase.trim()
    const key = normalised.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    phrases.push(normalised)
  }
  return { ...data, phrases }
}

/**
 * Lint one source string.
 *
 * @param {string} source
 * @param {{ file?: string, phrases?: string[], isTokenFile?: boolean }} options
 * @returns {Array<{ file: string, line: number, column: number, rule: string, match: string, message: string }>}
 */
export function lintSource(source, options = {}) {
  const {
    file = '<input>',
    phrases = [],
    isTokenFile = false,
  } = options
  const findings = []
  const lines = source.split(/\r?\n/)

  const fileIgnores = new Set()
  for (const line of lines.slice(0, 5)) {
    for (const rule of parseDirectives(line).file) fileIgnores.add(rule)
  }

  const phraseMatchers = phrases.map((phrase) => ({
    phrase,
    pattern: new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi'),
  }))

  const nextLineIgnores = new Map()

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const lineNumber = index + 1
    const directives = parseDirectives(line)
    if (directives.next.size > 0) {
      const existing = nextLineIgnores.get(index + 1)
      if (existing) {
        for (const rule of directives.next) existing.add(rule)
      } else {
        nextLineIgnores.set(index + 1, directives.next)
      }
    }
    const inherited = nextLineIgnores.get(index) ?? new Set()
    const isIgnored = (rule) =>
      ignoredBy(fileIgnores, rule) ||
      ignoredBy(directives.line, rule) ||
      ignoredBy(inherited, rule)

    if (!isIgnored('phrase')) {
      for (const { phrase, pattern } of phraseMatchers) {
        for (const match of line.matchAll(pattern)) {
          findings.push({
            file,
            line: lineNumber,
            column: match.index + 1,
            rule: 'banned-phrase',
            match: match[0],
            message: `banned phrase "${phrase}" - replace it with a specific, evidenced claim`,
          })
          break
        }
      }
    }

    if (isTokenFile) continue

    if (!isIgnored('black')) {
      for (const pattern of BLACK_PATTERNS) {
        for (const match of line.matchAll(pattern)) {
          findings.push({
            file,
            line: lineNumber,
            column: match.index + 1,
            rule: 'pure-black',
            match: match[0],
            message: `pure black literal "${match[0]}" - use the tinted --canvas token instead`,
          })
        }
      }
    }

    if (!isIgnored('tailwind')) {
      for (const pattern of TAILWIND_PATTERNS) {
        for (const match of line.matchAll(pattern)) {
          findings.push({
            file,
            line: lineNumber,
            column: match.index + 1,
            rule: 'raw-tailwind-colour',
            match: match[0],
            message: `raw Tailwind colour "${match[0]}" - use a design token (var(--...)) instead`,
          })
        }
      }
    }
  }

  return findings
}

function isRulebookDoc(file) {
  return RULEBOOK_FILES.has(file)
}

function isTokenFile(file) {
  return (
    file === resolve(REPO_ROOT, 'packages/tokens/tokens.css') ||
    file === resolve(REPO_ROOT, 'packages/tokens/design-tokens.json')
  )
}

function isExcludedFile(file) {
  const name = file.split(sep).at(-1)
  if (IGNORED_FILES.has(name)) return true
  if (isRulebookDoc(file)) return true
  if (file === SCRIPT_PATH || file === CONFIG_PATH) return true
  return false
}

function shouldSkipDirectory(name) {
  return IGNORED_DIRECTORIES.has(name)
}

export function walkFiles(target, output = []) {
  let stats
  try {
    stats = statSync(target)
  } catch (error) {
    throw new Error(
      `cannot read ${target}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  if (stats.isFile()) {
    if (!isExcludedFile(target) && TEXT_EXTENSIONS.has(extensionOf(target))) {
      output.push(target)
    }
    return output
  }
  if (!stats.isDirectory()) return output

  const entries = readdirSync(target, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue
    const child = resolve(target, entry.name)
    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name)) continue
      walkFiles(child, output)
    } else if (
      entry.isFile() &&
      !isExcludedFile(child) &&
      TEXT_EXTENSIONS.has(extensionOf(child))
    ) {
      output.push(child)
    }
  }
  return output
}

function extensionOf(file) {
  const base = file.split(sep).at(-1)
  const index = base.lastIndexOf('.')
  return index === -1 ? '' : base.slice(index).toLowerCase()
}

function displayPath(file) {
  const fromCwd = relative(process.cwd(), file)
  if (fromCwd && !fromCwd.startsWith('..') && !isAbsolute(fromCwd)) return fromCwd
  const fromRoot = relative(REPO_ROOT, file)
  if (fromRoot && !fromRoot.startsWith('..') && !isAbsolute(fromRoot)) return fromRoot
  return file
}

function printHuman(findings, summary, stdout) {
  if (findings.length === 0) {
    stdout.write(`anti-slop: clean (${summary.filesScanned} file(s) scanned)\n`)
    return
  }
  stdout.write(
    `anti-slop: ${summary.findings} finding(s) in ${summary.filesWithFindings} of ${summary.filesScanned} file(s)\n`,
  )
  for (const finding of findings) {
    stdout.write(
      `  ${finding.file}:${finding.line}:${finding.column}  ${finding.rule}  ${finding.message}\n`,
    )
  }
}

export function run(argv = [], { stdout = process.stdout, stderr = process.stderr } = {}) {
  let json = false
  const targets = []

  for (const argument of argv) {
    if (argument === '--json') {
      json = true
    } else if (argument === '--help' || argument === '-h') {
      stdout.write(`${HELP}\n`)
      return 0
    } else if (argument.startsWith('--')) {
      stderr.write(`anti-slop: unknown option "${argument}"\n\n${HELP}\n`)
      return 2
    } else {
      targets.push(argument)
    }
  }

  let config
  try {
    config = loadConfig()
  } catch (error) {
    stderr.write(`anti-slop: ${error instanceof Error ? error.message : String(error)}\n`)
    return 2
  }

  const targetPaths = targets.length > 0 ? targets : [REPO_ROOT]
  let files
  try {
    files = [
      ...new Set(
        targetPaths.flatMap((target) => walkFiles(resolve(target))),
      ),
    ].sort()
  } catch (error) {
    stderr.write(`anti-slop: ${error instanceof Error ? error.message : String(error)}\n`)
    return 2
  }

  const findings = []
  for (const file of files) {
    let source
    try {
      source = readFileSync(file, 'utf8')
    } catch (error) {
      stderr.write(
        `anti-slop: cannot read ${displayPath(file)}: ${
          error instanceof Error ? error.message : String(error)
        }\n`,
      )
      return 2
    }
    findings.push(
      ...lintSource(source, {
        file: displayPath(file),
        phrases: config.phrases,
        isTokenFile: isTokenFile(file),
      }),
    )
  }

  findings.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.column - right.column ||
      left.rule.localeCompare(right.rule),
  )

  const summary = {
    filesScanned: files.length,
    filesWithFindings: new Set(findings.map((finding) => finding.file)).size,
    findings: findings.length,
  }

  if (json) {
    stdout.write(`${JSON.stringify({ findings, summary }, null, 2)}\n`)
  } else {
    printHuman(findings, summary, stdout)
  }

  return findings.length > 0 ? 1 : 0
}

const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(SCRIPT_PATH)

if (invokedDirectly) {
  process.exitCode = run(process.argv.slice(2))
}

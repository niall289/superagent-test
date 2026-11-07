#!/usr/bin/env node
/**
 * Factory doctor — deterministic, read-only environment diagnostics.
 *
 * It verifies that the machine can run the factory: the Node and pnpm
 * runtimes, git and its worktree, `factory/toolchain.lock.json` and its
 * agreement with `package.json`, plus any optional research tools that are
 * configured. It never installs anything and never prints secret values.
 *
 * Usage: node factory/scripts/doctor.mjs [--ci] [--strict]
 */

import { execFileSync } from 'node:child_process'
import {
  accessSync,
  constants as fsConstants,
  existsSync,
  readFileSync,
  statSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const REPO_ROOT = resolve(dirname(SCRIPT_PATH), '../..')
const LOCK_PATH = resolve(REPO_ROOT, 'factory/toolchain.lock.json')
const PACKAGE_PATH = resolve(REPO_ROOT, 'package.json')

const REQUIRED_TOOLS = ['node', 'pnpm']
const REQUIRED_PACKAGES = [
  'astro',
  'tailwindcss',
  'gsap',
  'lenis',
  'playwright',
  'axe-core',
]

const STATUS_LABEL = {
  ok: '[ok]',
  fail: '[fail]',
  warn: '[warn]',
  skip: '[skip]',
}

const HELP = `factory doctor — deterministic, read-only environment diagnostics

Usage: node factory/scripts/doctor.mjs [--ci] [--strict]

Options:
  --ci      read-only mode for CI and ticket prepare (no prompts, no writes)
  --strict  treat optional-tool warnings as fatal
  --help    show this help

Exit codes:
  0  required tools healthy and no configured optional tool is missing
  1  a fatal prerequisite or core assertion failed
  2  an optional tool is missing or misconfigured (non-blocking warning)

Checks: Node, pnpm, git availability and worktree state, the toolchain
lockfile schema and its agreement with package.json, and optional Firecrawl
and REA configuration. Secret values are never printed.
`

// ---------------------------------------------------------------------------
// Semver helpers (the lockfile only needs ">=", "^" and exact versions)
// ---------------------------------------------------------------------------

export function parseVersion(value) {
  if (typeof value !== 'string') return null
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(value.trim())
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

export function parseRange(value) {
  if (typeof value !== 'string') return null
  const match = /^(>=|\^|=)?(\d+)\.(\d+)\.(\d+)$/.exec(value.trim())
  if (!match) return null
  return {
    op: match[1] ?? '=',
    major: Number(match[2]),
    minor: Number(match[3]),
    patch: Number(match[4]),
  }
}

function compareVersions(left, right) {
  return (
    left.major - right.major ||
    left.minor - right.minor ||
    left.patch - right.patch
  )
}

export function satisfies(version, range) {
  const actual = parseVersion(version)
  const wanted = parseRange(range)
  if (!actual || !wanted) return false

  if (wanted.op === '=') return compareVersions(actual, wanted) === 0
  if (wanted.op === '>=') return compareVersions(actual, wanted) >= 0

  // Caret: compatible with the left-most non-zero component.
  if (compareVersions(actual, wanted) < 0) return false
  if (wanted.major > 0) return actual.major === wanted.major
  if (wanted.minor > 0) {
    return actual.major === 0 && actual.minor === wanted.minor
  }
  return actual.major === 0 && actual.minor === 0 && actual.patch === wanted.patch
}

function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`
}

// ---------------------------------------------------------------------------
// Process and filesystem helpers
// ---------------------------------------------------------------------------

function run(command, args = ['--version']) {
  try {
    return execFileSync(command, args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 15_000,
    }).trim()
  } catch {
    return null
  }
}

function readJson(path) {
  if (!existsSync(path)) return { exists: false, data: null, error: null }
  try {
    return { exists: true, data: JSON.parse(readFileSync(path, 'utf8')), error: null }
  } catch (error) {
    return {
      exists: true,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

export function validateLock(lock) {
  const errors = []
  if (!isRecord(lock)) return ['root must be a JSON object']

  if (lock.schemaVersion !== 1) errors.push('schemaVersion must be 1')

  if (
    typeof lock.verifiedAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(lock.verifiedAt)
  ) {
    errors.push('verifiedAt must be a YYYY-MM-DD date')
  }

  if (!isRecord(lock.tools)) {
    errors.push('tools must be an object')
  } else {
    for (const tool of REQUIRED_TOOLS) {
      if (!Object.hasOwn(lock.tools, tool)) {
        errors.push(`tools.${tool} is required`)
      } else if (!parseRange(lock.tools[tool])) {
        errors.push(`tools.${tool} must be a version range such as ">=1.2.3"`)
      }
    }
    for (const [name, value] of Object.entries(lock.tools)) {
      if (!REQUIRED_TOOLS.includes(name) && !parseRange(value)) {
        errors.push(`tools.${name} must be a version range such as ">=1.2.3"`)
      }
    }
  }

  if (!isRecord(lock.packages)) {
    errors.push('packages must be an object')
  } else {
    for (const name of REQUIRED_PACKAGES) {
      if (!Object.hasOwn(lock.packages, name)) {
        errors.push(`packages.${name} is required`)
      } else if (!parseRange(lock.packages[name])) {
        errors.push(`packages.${name} must be a version range such as "^1.2.3"`)
      }
    }
    for (const [name, value] of Object.entries(lock.packages)) {
      if (!REQUIRED_PACKAGES.includes(name) && !parseRange(value)) {
        errors.push(`packages.${name} must be a version range such as "^1.2.3"`)
      }
    }
  }

  return errors
}

function failIfNoRange(results, tool, range) {
  if (range) return false
  results.push({
    section: 'required',
    status: 'fail',
    label: tool,
    detail: 'no valid minimum in factory/toolchain.lock.json or package.json',
  })
  return true
}

function checkNode(results, range) {
  if (failIfNoRange(results, 'node', range)) return
  const actual = process.version
  if (satisfies(actual, range)) {
    results.push({
      section: 'required',
      status: 'ok',
      label: 'node',
      detail: `${actual} (lock ${range})`,
    })
    return
  }
  const minimum = parseRange(range)
  const hint = minimum
    ? `; install Node ${formatVersion(minimum)}+ (e.g. nvm install ${formatVersion(minimum)} && nvm use ${formatVersion(minimum)})`
    : ''
  results.push({
    section: 'required',
    status: 'fail',
    label: 'node',
    detail: `${actual} (expected ${range})${hint}`,
  })
}

function checkPnpm(results, range) {
  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const actual = run(command)
  const minimum = range ? parseRange(range) : null
  const hint = minimum
    ? `corepack enable && corepack prepare pnpm@${formatVersion(minimum)} --activate`
    : 'install pnpm (e.g. corepack enable)'

  if (!actual) {
    results.push({
      section: 'required',
      status: 'fail',
      label: 'pnpm',
      detail: `not found on PATH; ${hint}`,
    })
    return
  }
  if (failIfNoRange(results, 'pnpm', range)) return
  if (!satisfies(actual, range)) {
    results.push({
      section: 'required',
      status: 'fail',
      label: 'pnpm',
      detail: `${actual} (expected ${range}); ${hint}`,
    })
    return
  }
  results.push({
    section: 'required',
    status: 'ok',
    label: 'pnpm',
    detail: `${actual} (lock ${range})`,
  })
}

function checkGit(results) {
  const versionLine = run('git', ['--version'])
  if (!versionLine) {
    results.push({
      section: 'required',
      status: 'fail',
      label: 'git',
      detail: 'not found on PATH; install Git before running the factory',
    })
    return
  }
  results.push({
    section: 'required',
    status: 'ok',
    label: 'git',
    detail: versionLine.replace(/^git version\s+/, ''),
  })

  if (run('git', ['rev-parse', '--is-inside-work-tree']) !== 'true') {
    results.push({
      section: 'required',
      status: 'fail',
      label: 'git worktree',
      detail: `${REPO_ROOT} is not inside a git worktree; clone the repository or open the ticket worktree`,
    })
    return
  }

  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
  const head = run('git', ['rev-parse', '--short', 'HEAD'])
  const branchText =
    branch && branch !== 'HEAD'
      ? branch
      : `detached at ${head ?? 'unknown commit'}`
  const status = run('git', ['status', '--porcelain=v1'])

  if (status === null) {
    results.push({
      section: 'required',
      status: 'fail',
      label: 'git worktree',
      detail: `${branchText}; could not read git status`,
    })
    return
  }

  const changes = status ? status.split('\n') : []
  const unmerged = changes.filter((line) =>
    /^(DD|AU|UD|UA|DU|AA|UU)/.test(line),
  )
  if (unmerged.length > 0) {
    results.push({
      section: 'required',
      status: 'fail',
      label: 'git worktree',
      detail: `${branchText}; ${unmerged.length} unmerged path(s) — resolve conflicts before running the factory`,
    })
    return
  }

  results.push({
    section: 'required',
    status: 'ok',
    label: 'git worktree',
    detail: `${branchText}; ${
      changes.length === 0 ? 'clean' : `${changes.length} uncommitted change(s)`
    }${head ? `; HEAD ${head}` : ''}`,
  })
}

function checkLock(results) {
  const read = readJson(LOCK_PATH)
  if (!read.exists) {
    results.push({
      section: 'required',
      status: 'fail',
      label: 'toolchain lock',
      detail: 'factory/toolchain.lock.json not found; restore it from the repository',
    })
    return { lock: null, errors: ['file not found'] }
  }
  if (read.error) {
    results.push({
      section: 'required',
      status: 'fail',
      label: 'toolchain lock',
      detail: `factory/toolchain.lock.json is not valid JSON: ${read.error}`,
    })
    return { lock: null, errors: [read.error] }
  }

  const errors = validateLock(read.data)
  if (errors.length > 0) {
    results.push({
      section: 'required',
      status: 'fail',
      label: 'toolchain lock',
      detail: `factory/toolchain.lock.json has ${errors.length} schema error(s): ${errors.join('; ')}`,
    })
    return { lock: read.data, errors }
  }

  results.push({
    section: 'required',
    status: 'ok',
    label: 'toolchain lock',
    detail: `factory/toolchain.lock.json (schemaVersion 1; ${
      Object.keys(read.data.tools).length
    } tools, ${Object.keys(read.data.packages).length} packages; verified ${
      read.data.verifiedAt
    })`,
  })
  return { lock: read.data, errors: [] }
}

function checkLockSync(results, pkg, lock, lockErrors) {
  if (!pkg) {
    results.push({
      section: 'required',
      status: 'fail',
      label: 'lock sync',
      detail: 'package.json is unavailable, so the toolchain lock cannot be verified',
    })
    return
  }
  if (!lock || lockErrors.length > 0) return

  const mismatches = []
  const engines = isRecord(pkg.engines) ? pkg.engines : {}
  for (const tool of REQUIRED_TOOLS) {
    if (engines[tool] !== lock.tools[tool]) {
      mismatches.push(
        `engines.${tool} is ${JSON.stringify(engines[tool])} but tools.${tool} is ${JSON.stringify(lock.tools[tool])}`,
      )
    }
  }

  const packageManager = typeof pkg.packageManager === 'string' ? pkg.packageManager : ''
  const pinned = /^pnpm@(\d+\.\d+\.\d+)$/.exec(packageManager)
  if (!pinned) {
    mismatches.push('packageManager must pin pnpm@<x.y.z>')
  } else if (!satisfies(pinned[1], lock.tools.pnpm)) {
    mismatches.push(
      `packageManager pnpm@${pinned[1]} does not satisfy tools.pnpm ${lock.tools.pnpm}`,
    )
  }

  if (mismatches.length > 0) {
    results.push({
      section: 'required',
      status: 'fail',
      label: 'lock sync',
      detail: `${mismatches.join('; ')}; keep package.json and factory/toolchain.lock.json identical`,
    })
    return
  }

  results.push({
    section: 'required',
    status: 'ok',
    label: 'lock sync',
    detail: `package.json engines and packageManager agree with the toolchain lock (${packageManager})`,
  })
}

function checkFirecrawl(results) {
  const key = process.env.FIRECRAWL_API_KEY
  if (key === undefined) {
    results.push({
      section: 'optional',
      status: 'skip',
      label: 'firecrawl',
      detail: 'FIRECRAWL_API_KEY not set (optional; research tools unavailable)',
    })
    return
  }
  if (!key.trim()) {
    results.push({
      section: 'optional',
      status: 'warn',
      label: 'firecrawl',
      detail: 'FIRECRAWL_API_KEY is set but empty; unset it or provide a key (value never printed)',
    })
    return
  }
  results.push({
    section: 'optional',
    status: 'ok',
    label: 'firecrawl',
    detail: 'FIRECRAWL_API_KEY present (value never printed)',
  })
}

function checkRea(results) {
  const configuredPath = process.env.DSH_REA_CLI?.trim()
  if (configuredPath) {
    const resolved = resolve(REPO_ROOT, configuredPath)
    try {
      statSync(resolved)
      accessSync(resolved, fsConstants.X_OK)
      results.push({
        section: 'optional',
        status: 'ok',
        label: 'rea',
        detail: `DSH_REA_CLI is executable (${configuredPath})`,
      })
    } catch {
      results.push({
        section: 'optional',
        status: 'warn',
        label: 'rea',
        detail: `DSH_REA_CLI is set but is not an executable file (${configuredPath}); fix or unset it`,
      })
    }
    return
  }

  const version = run('rea', ['--version'])
  if (version) {
    results.push({
      section: 'optional',
      status: 'ok',
      label: 'rea',
      detail: `rea ${version}`,
    })
    return
  }
  results.push({
    section: 'optional',
    status: 'skip',
    label: 'rea',
    detail: 'not configured (set DSH_REA_CLI or add rea to PATH)',
  })
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function printResults(results) {
  for (const section of ['required', 'optional']) {
    console.log(`\n${section}`)
    for (const result of results) {
      if (result.section !== section) continue
      console.log(
        `  ${STATUS_LABEL[result.status]} ${result.label}: ${result.detail}`,
      )
    }
  }
}

export function main(argv = process.argv.slice(2)) {
  let strict = false
  for (const argument of argv) {
    if (argument === '--strict') {
      strict = true
    } else if (argument === '--ci') {
      // The doctor is always read-only; the flag is accepted for CI call sites.
      continue
    } else if (argument === '--help' || argument === '-h') {
      process.stdout.write(HELP)
      return 0
    } else {
      process.stderr.write(
        `factory doctor: unknown option "${argument}"\n\n${HELP}`,
      )
      return 1
    }
  }

  const results = []
  const lockResult = checkLock(results)
  const pkgRead = readJson(PACKAGE_PATH)
  const pkg = pkgRead.exists && !pkgRead.error ? pkgRead.data : null

  if (!pkgRead.exists) {
    results.push({
      section: 'required',
      status: 'fail',
      label: 'package.json',
      detail: 'not found at the repository root',
    })
  } else if (pkgRead.error) {
    results.push({
      section: 'required',
      status: 'fail',
      label: 'package.json',
      detail: `not valid JSON: ${pkgRead.error}`,
    })
  }

  const lock = lockResult.lock
  const lockErrors = lockResult.errors
  const runtimeRange = (tool) => {
    if (lock && lockErrors.length === 0 && parseRange(lock.tools?.[tool])) {
      return lock.tools[tool]
    }
    const engines = pkg && isRecord(pkg.engines) ? pkg.engines : {}
    return parseRange(engines[tool]) ? engines[tool] : null
  }

  console.log('factory doctor')

  checkNode(results, runtimeRange('node'))
  checkPnpm(results, runtimeRange('pnpm'))
  checkGit(results)
  checkLockSync(results, pkg, lock, lockErrors)
  checkFirecrawl(results)
  checkRea(results)

  printResults(results)

  const failures = results.filter((result) => result.status === 'fail')
  const warnings = results.filter((result) => result.status === 'warn')

  if (failures.length > 0) {
    const suffix = strict ? ' (--strict)' : ''
    console.error(
      `\nfactory doctor: ${failures.length} fatal failure${failures.length === 1 ? '' : 's'}${suffix}`,
    )
    return 1
  }
  if (warnings.length > 0 && strict) {
    console.error(
      `\nfactory doctor: ${warnings.length} warning${warnings.length === 1 ? '' : 's'} treated as fatal (--strict)`,
    )
    return 1
  }
  if (warnings.length > 0) {
    console.log(
      `\nfactory doctor: ${warnings.length} warning${warnings.length === 1 ? '' : 's'} (optional tools unavailable; exit 2, non-blocking)`,
    )
    return 2
  }

  console.log('\nfactory doctor: ok')
  return 0
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(SCRIPT_PATH)

if (invokedDirectly) {
  process.exitCode = main()
}

// anti-slop-ignore-file — fixtures below intentionally contain blacklisted
// filler so the optimiser can be tested for discarding it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildMandate,
  detectLane,
  loadTokens,
  parseShorthand,
  render,
  slugify,
} from './prompt-optimizer.mjs'
import { lintSource, loadConfig } from './anti-slop-lint.mjs'

const SCRIPT = fileURLToPath(new URL('./prompt-optimizer.mjs', import.meta.url))
const tokens = loadTokens()
const bannedPhrases = loadConfig().phrases

function runCli(cwd, args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    encoding: 'utf8',
  })
}

function withTempDir(run) {
  const directory = mkdtempSync(join(tmpdir(), 'prompt-optimizer-'))
  try {
    run(directory)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

test('parses the documented operator shorthand', () => {
  const parsed = parseShorthand('Electrician in Swords, luxury feel')
  assert.equal(parsed.business, 'Electrician')
  assert.equal(parsed.location, 'Swords')
  assert.equal(parsed.displayName, 'Electrician in Swords')
  assert.deepEqual(parsed.cues, ['luxury feel'])
})

test('detects the lane from shorthand cues', () => {
  assert.equal(detectLane('Electrician in Swords, luxury feel'), 'editorial')
  assert.equal(detectLane('3D studio, immersive'), 'immersive')
  assert.equal(detectLane('Architecture practice, video-led'), 'immersive')
})

test('slugifies business and location deterministically', () => {
  assert.equal(slugify('Electrician Swords'), 'electrician-swords')
  assert.equal(slugify('Café  Órla — Dublin'), 'cafe-orla-dublin')
})

test('builds a complete five-file mandate with machine IDs and checks', () => {
  const mandate = buildMandate('Electrician in Swords, luxury feel', { tokens })
  assert.equal(mandate.title, 'Website build: Electrician in Swords')
  assert.equal(mandate.slug, 'electrician-swords')
  assert.equal(mandate.lane, 'editorial')
  assert.equal(mandate.template, 'editorial-serif')

  for (const fragment of [
    'Jev-compliant',
    '.factory/spec.md',
    '.factory/design.md',
    '.factory/plan.md',
    '.factory/tasks.md',
    '.factory/acceptance.md',
    'T-01',
    'T-02',
    'T-06',
    'BUILD-01',
    'A11Y-01',
    'LH-01',
    'LH-02',
    'SLOP-01',
    'LINK-01',
    'ASSET-01',
    'EVID-01',
    'LIC-01',
    '--canvas',
    '#09090b',
    '--spring-stiffness',
    '260',
  ]) {
    assert.ok(mandate.body.includes(fragment), fragment)
  }
})

test('the generated mandate passes the anti-slop gate', () => {
  const mandate = buildMandate('Electrician in Swords, luxury feel', { tokens })
  assert.deepEqual(
    lintSource(mandate.body, { phrases: bannedPhrases, file: 'mandate.md' }),
    [],
  )
})

test('accent override flows into the design pack and token table', () => {
  const mandate = buildMandate('Electrician in Swords', {
    tokens,
    accent: '#1a73e8',
  })
  assert.ok(mandate.body.includes('color.accent: "#1a73e8"'))
  assert.ok(mandate.body.includes('| Brand accent | `--accent` | `#1a73e8` |'))
})

test('immersive lane changes the template, budget and asset check', () => {
  const mandate = buildMandate('3D studio, immersive', { tokens })
  assert.equal(mandate.lane, 'immersive')
  assert.equal(mandate.template, 'immersive-webgl')
  assert.ok(mandate.body.includes('performance: ">= 0.75"'))
  assert.ok(mandate.body.includes('scene: "<= 3 MB"'))
  assert.ok(!mandate.body.includes('fonts: "<='))
})

test('blacklisted tone cues are discarded and reported', () => {
  const mandate = buildMandate('Electrician in Swords, seamless feel', {
    tokens,
    bannedPhrases: ['seamless'],
  })
  assert.equal(mandate.warnings.length, 1)
  assert.match(mandate.warnings[0], /seamless/)
  assert.ok(!mandate.body.includes('seamless'))
  assert.ok(mandate.body.includes('none supplied'))
})

test('explicit template and lane must agree', () => {
  assert.throws(
    () =>
      buildMandate('Electrician in Swords', {
        tokens,
        lane: 'editorial',
        template: 'immersive-webgl',
      }),
    /belongs to the immersive lane/,
  )
  assert.throws(
    () =>
      buildMandate('Electrician in Swords', {
        tokens,
        lane: 'cinema',
      }),
    /unknown lane/,
  )
})

test('renders markdown, issue and JSON formats', () => {
  const mandate = buildMandate('Electrician in Swords', { tokens })
  assert.ok(render(mandate, 'markdown').startsWith('# Website build:'))
  assert.ok(render(mandate, 'issue').startsWith('## Objective'))
  const json = JSON.parse(render(mandate, 'json'))
  assert.equal(json.slug, 'electrician-swords')
  assert.equal(json.labels[0], 'site-build')
  assert.equal(json.body, mandate.body)
})

test('CLI prints a JSON mandate', () => {
  const result = runCli(process.cwd(), [
    '--format',
    'json',
    'Electrician in Swords, luxury feel',
  ])
  assert.equal(result.status, 0, result.stderr)
  const mandate = JSON.parse(result.stdout)
  assert.equal(mandate.slug, 'electrician-swords')
  assert.ok(mandate.body.includes('BUILD-01'))
})

test('CLI writes an issue body to a file with --out', () => {
  withTempDir((directory) => {
    const destination = join(directory, 'issue.md')
    const result = runCli(directory, [
      '--format',
      'issue',
      '--out',
      destination,
      'Electrician in Swords',
    ])
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout, '')
    assert.match(result.stderr, /wrote/)
    const written = readFileSync(destination, 'utf8')
    assert.ok(written.startsWith('## Objective'))
    assert.ok(written.includes('## Open questions'))
  })
})

test('CLI rejects invalid input with a deterministic exit code', () => {
  const missing = runCli(process.cwd(), [])
  assert.equal(missing.status, 2)
  assert.match(missing.stderr, /provide operator shorthand/)

  const unknown = runCli(process.cwd(), ['--lane', 'cinema', 'Electrician'])
  assert.equal(unknown.status, 2)
  assert.match(unknown.stderr, /unknown lane/)

  const badAccent = runCli(process.cwd(), [
    '--accent',
    'blue',
    'Electrician',
  ])
  assert.equal(badAccent.status, 2)
  assert.match(badAccent.stderr, /six-digit hex/)
})

test('CLI help exits 0', () => {
  const result = runCli(process.cwd(), ['--help'])
  assert.equal(result.status, 0)
  assert.match(result.stdout, /prompt optimizer and brief intake/)
})

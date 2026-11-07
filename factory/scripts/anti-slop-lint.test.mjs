// anti-slop-ignore-file — fixtures below intentionally contain the literals
// this gate is meant to reject.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { lintSource, loadConfig } from './anti-slop-lint.mjs'

const SCRIPT = fileURLToPath(new URL('./anti-slop-lint.mjs', import.meta.url))
const config = loadConfig()
const phrases = config.phrases

function lint(source, options = {}) {
  return lintSource(source, { phrases, ...options })
}

function runCli(cwd, args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    encoding: 'utf8',
  })
}

function withTempDir(run) {
  const directory = mkdtempSync(join(tmpdir(), 'anti-slop-'))
  try {
    run(directory)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

test('the configured blacklist is the Master Design filler list', () => {
  assert.equal(config.schemaVersion, 1)
  assert.equal(config.phrases.length, 13)
  for (const phrase of [
    'seamless',
    'cutting-edge',
    'revolutionize',
    'unlock',
    'unleash',
    'elevate',
    'supercharge',
    'next-gen',
    'game-changer',
    "in today's fast-paced",
    'lorem ipsum',
    'john doe',
    'jane doe',
  ]) {
    assert.ok(config.phrases.includes(phrase), phrase)
  }
})

test('banned phrases are matched case-insensitively with a line and column', () => {
  const findings = lint('Intro copy.\nA SEAMLESS handover, really.')
  assert.equal(findings.length, 1)
  assert.equal(findings[0].rule, 'banned-phrase')
  assert.equal(findings[0].line, 2)
  assert.equal(findings[0].column, 3)
  assert.equal(findings[0].match, 'SEAMLESS')
})

test('banned phrases respect word boundaries', () => {
  assert.equal(lint('The handover was seamlessly executed.').length, 0)
})

test('line, next-line and file directives suppress the intended rules', () => {
  const lineIgnored = lint('seamless // anti-slop-ignore-line\nseamless')
  assert.equal(lineIgnored.length, 1)
  assert.equal(lineIgnored[0].line, 2)

  const nextIgnored = lint('// anti-slop-ignore-next-line\nseamless\nseamless')
  assert.equal(nextIgnored.length, 1)
  assert.equal(nextIgnored[0].line, 3)

  const ruleSpecific = lint(
    'text-[#fff] #000 // anti-slop-ignore-line=tailwind',
  )
  assert.deepEqual(
    ruleSpecific.map((finding) => finding.rule),
    ['pure-black'],
  )

  const fileIgnored = lint('// anti-slop-ignore-file\nseamless\n#000')
  assert.equal(fileIgnored.length, 0)
})

test('a file directive after the first five lines does not apply', () => {
  const findings = lint('\n\n\n\n\n// anti-slop-ignore-file\nseamless')
  assert.equal(findings.length, 1)
})

test('pure black hex and rgb literals are rejected outside token files', () => {
  const cases = [
    'body { color: #000; }',
    'body { background: #000000; }',
    'body { border: 1px solid rgb(0, 0, 0); }',
    'body { box-shadow: 0 0 0 rgba(0, 0, 0, 0.4); }',
    'body { outline-color: rgb(0 0 0 / 40%); }',
  ]
  for (const source of cases) {
    const findings = lint(source)
    assert.equal(findings.length, 1, source)
    assert.equal(findings[0].rule, 'pure-black', source)
  }
})

test('near-black hex is not mistaken for pure black', () => {
  assert.equal(lint('body { color: #0000ff; }').length, 0)
  assert.equal(lint('body { color: #09090b; }').length, 0)
})

test('raw Tailwind colour utilities are rejected', () => {
  const findings = lint(
    '<div class="bg-[#fff] text-zinc-400 border-black/10 bg-white/5 border-t-red-500 divide-y-stone-700"></div>',
  )
  assert.equal(findings.length, 6)
  for (const finding of findings) {
    assert.equal(finding.rule, 'raw-tailwind-colour')
  }
})

test('non-colour arbitrary values and token utilities are allowed', () => {
  assert.equal(
    lint(
      '<div class="text-current bg-transparent bg-[url(/hero.png)] bg-[color:var(--accent)] border-[0.5px]"></div>',
    ).length,
    0,
  )
})

test('token files keep canonical colour literals and still reject filler', () => {
  const findings = lint(':root { --canvas: #000; } /* seamless */', {
    file: 'packages/tokens/tokens.css',
    isTokenFile: true,
  })
  assert.equal(findings.length, 1)
  assert.equal(findings[0].rule, 'banned-phrase')
})

test('CLI exits 1 with file and line details when slop is present', () => {
  withTempDir((directory) => {
    writeFileSync(join(directory, 'page.md'), 'seamless handover\n')
    const result = runCli(directory, ['.'])
    assert.equal(result.status, 1)
    assert.match(result.stdout, /page\.md:1:1/)
    assert.match(result.stdout, /banned-phrase/)
  })
})

test('CLI exits 0 when the scanned tree is clean', () => {
  withTempDir((directory) => {
    writeFileSync(join(directory, 'page.md'), 'A specific, sourced claim.\n')
    const result = runCli(directory, ['.'])
    assert.equal(result.status, 0)
    assert.match(result.stdout, /clean/)
  })
})

test('CLI emits machine-readable JSON', () => {
  withTempDir((directory) => {
    writeFileSync(join(directory, 'page.md'), 'Lorem ipsum dolor\n')
    const result = runCli(directory, ['--json', '.'])
    assert.equal(result.status, 1)
    const report = JSON.parse(result.stdout)
    assert.equal(report.summary.findings, 1)
    assert.equal(report.findings[0].rule, 'banned-phrase')
    assert.equal(report.findings[0].file, 'page.md')
  })
})

// anti-slop-ignore-file — this test asserts the token contract and names the
// exact primitives it checks, including colour literals.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const css = read('../tokens.css')
const tokens = JSON.parse(read('../design-tokens.json'))
const pkg = JSON.parse(read('../package.json'))

function parseCssVariables(source) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '')
  const variables = new Map()
  for (const match of withoutComments.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    if (!variables.has(match[1])) variables.set(match[1], match[2])
  }
  return variables
}

function reduceWhitespace(value) {
  return String(value).replace(/\s+/g, ' ').trim()
}

function relativeLuminance(hex) {
  const channels = hex
    .replace('#', '')
    .match(/../g)
    .map((channel) => parseInt(channel, 16) / 255)
    .map((value) =>
      value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    )
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrast(foreground, background) {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

const cssVariables = parseCssVariables(css)

test('Archetype A surface and text colours are the canonical values', () => {
  const expected = {
    '--canvas': '#09090b',
    '--surface-1': '#121215',
    '--surface-2': '#18181b',
    '--hairline': 'rgba(255, 255, 255, 0.08)',
    '--text-1': '#fafafa',
    '--text-2': '#a1a1aa',
    '--text-3': '#71717a',
  }
  for (const [name, value] of Object.entries(expected)) {
    assert.equal(reduceWhitespace(cssVariables.get(name)), value, name)
    assert.equal(tokens.cssVariables[name], value, name)
  }
})

test('there is one brand accent and four desaturated status colours', () => {
  assert.match(cssVariables.get('--accent'), /^#[0-9a-f]{6}$/i)
  const statusColours = ['--ok', '--warn', '--danger', '--info'].map((name) => {
    const value = cssVariables.get(name)
    assert.match(value, /^#[0-9a-f]{6}$/i, name)
    return value.toLowerCase()
  })
  assert.equal(new Set(statusColours).size, statusColours.length)
})

test('accent and body/status colours meet WCAG AA on the canvas', () => {
  const canvas = cssVariables.get('--canvas')
  for (const name of [
    '--accent',
    '--text-1',
    '--text-2',
    '--ok',
    '--warn',
    '--danger',
    '--info',
  ]) {
    const ratio = contrast(cssVariables.get(name), canvas)
    assert.ok(ratio >= 4.5, `${name} contrast is ${ratio.toFixed(2)}:1`)
  }
})

test('radius tokens are the concentric 6/12 pair', () => {
  assert.equal(cssVariables.get('--r-sm'), '6px')
  assert.equal(cssVariables.get('--r-md'), '12px')
})

test('typography tokens carry the display/text pairing and fluid scale', () => {
  assert.match(cssVariables.get('--font-sans'), /Geist/)
  assert.match(cssVariables.get('--font-sans'), /Plus Jakarta Sans/)
  assert.match(cssVariables.get('--font-mono'), /Geist Mono/)
  assert.match(cssVariables.get('--font-mono'), /JetBrains Mono/)
  assert.equal(cssVariables.get('--font-variant-numeric-tabular'), 'tabular-nums')

  for (const name of ['--text-sm', '--text-base', '--text-lg', '--text-display']) {
    assert.match(cssVariables.get(name), /^clamp\(/i, name)
  }
  assert.equal(cssVariables.get('--leading-display'), '0.98')
  assert.equal(cssVariables.get('--measure'), '65ch')
})

test('motion tokens encode the spring, durations and stagger', () => {
  assert.equal(cssVariables.get('--spring-stiffness'), '260')
  assert.equal(cssVariables.get('--spring-damping'), '20')
  assert.equal(cssVariables.get('--stagger'), '60ms')
  assert.equal(cssVariables.get('--duration-fast'), '150ms')
  assert.equal(cssVariables.get('--duration-base'), '300ms')
  assert.equal(cssVariables.get('--duration-narrative'), '600ms')
  assert.match(cssVariables.get('--ease-entrance'), /^cubic-bezier\(/)
  assert.match(cssVariables.get('--ease-exit'), /^cubic-bezier\(/)
})

test('reduced motion collapses durations, stagger and the motion scale', () => {
  const block = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)
  assert.ok(block, 'missing prefers-reduced-motion block')
  for (const [name, value] of Object.entries(tokens.reducedMotion)) {
    assert.match(
      block[1],
      new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      name,
    )
  }
  assert.match(block[1], /--motion-scale:\s*0/)
})

test('design-tokens.json mirrors every CSS token without drift', () => {
  const jsonNames = Object.keys(tokens.cssVariables)
  assert.deepEqual([...cssVariables.keys()].sort(), jsonNames.sort())
  for (const [name, value] of Object.entries(tokens.cssVariables)) {
    assert.equal(
      reduceWhitespace(cssVariables.get(name)),
      reduceWhitespace(value),
      name,
    )
  }
  assert.equal(tokens.version, pkg.version)
  assert.equal(tokens.archetype, 'engageio-dark')
})

test('token files contain no pure black literal', () => {
  assert.doesNotMatch(css, /#000(?![0-9a-f])/i)
});

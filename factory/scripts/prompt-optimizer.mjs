#!/usr/bin/env node
/**
 * Prompt optimizer and brief intake tool.
 *
 * Turns operator shorthand into a complete, Jev-compliant five-file spec-pack
 * mandate: machine task IDs, the Master Design token mapping, statutory
 * evidence requirements and testable acceptance checks.
 *
 * Usage:
 *   pnpm factory:prompt "Electrician in Swords, luxury feel"
 *   pnpm factory:prompt --format issue --out .factory/issue.md "3D studio, immersive"
 *
 * Exit codes: 0 = mandate written, 2 = invalid input or I/O error.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const REPO_ROOT = resolve(dirname(SCRIPT_PATH), '../..')
const TOKENS_PATH = resolve(REPO_ROOT, 'packages/tokens/design-tokens.json')
const BANNED_PATH = resolve(REPO_ROOT, 'factory/config/banned-phrases.json')

const LANES = new Set(['editorial', 'immersive'])

const LANE_DEFAULTS = {
  editorial: {
    template: 'editorial-serif',
    performance: '>= 0.90',
    initialJs: '<= 150 KB',
    totalPage: '<= 1.5 MB',
    fonts: '<= 200 KB',
  },
  immersive: {
    template: 'immersive-webgl',
    performance: '>= 0.75',
    initialJs: '<= 350 KB',
    totalPage: '<= 4 MB before video',
    scene: '<= 3 MB',
  },
}

const TEMPLATE_LANES = {
  'editorial-serif': 'editorial',
  'editorial-sans': 'editorial',
  'immersive-webgl': 'immersive',
  'immersive-video': 'immersive',
}

const VIEWPORTS = ['390x844', '768x1024', '1440x900']

const TASKS = [
  {
    id: 'T-01',
    title:
      'Install @factory/tokens, map every Master Design token and publish the styleguide route',
    dependsOn: [],
    evidence: ['build', 'styleguide-screenshot'],
  },
  {
    id: 'T-02',
    title:
      'Define the content model and load approved real copy, imagery and licences',
    dependsOn: ['T-01'],
    evidence: ['content-schema', 'licence-log'],
  },
  {
    id: 'T-03',
    title:
      'Build the hero and navigation around the single strong idea from the design memo',
    dependsOn: ['T-02'],
    evidence: ['screenshot-390', 'screenshot-768', 'screenshot-1440'],
  },
  {
    id: 'T-04',
    title:
      'Build the remaining sections, footer, 404, metadata and OG image',
    dependsOn: ['T-03'],
    evidence: ['build', 'link-check', 'screenshot-1440'],
  },
  {
    id: 'T-05',
    title:
      'Complete responsive, motion, focus and form states at 390, 768 and 1440 px',
    dependsOn: ['T-04'],
    evidence: ['axe', 'reduced-motion-check', 'screenshot-390'],
  },
  {
    id: 'T-06',
    title:
      'Capture the evidence pack, run every check and self-score the rubric at 80 or above',
    dependsOn: ['T-05'],
    evidence: ['verify.log', 'lighthouse', 'rubric-score'],
  },
]

const HELP = `prompt optimizer and brief intake

Usage:
  pnpm factory:prompt "Electrician in Swords, luxury feel"
  pnpm factory:prompt --format issue --out .factory/issue.md "Electrician in Swords"
  pnpm factory:prompt --lane immersive "3D studio, immersive"

Turns operator shorthand into a five-file spec-pack mandate with task IDs,
Master Design token mapping, evidence requirements and acceptance checks.

Options:
  --lane <editorial|immersive>   force the lane (otherwise detected)
  --template <name>              editorial-serif | editorial-sans |
                                 immersive-webgl | immersive-video
  --format <markdown|issue|json> output format (default: markdown)
  --out <path>                   write to a file instead of stdout
  --slug <slug>                  override the generated site slug
  --accent <#rrggbb>             override the single brand accent
  --title <text>                 override the issue title
  --audience <text>              override the audience line
  --vertical <text>              override the vertical
  --help                         show this help

Exit codes: 0 mandate written, 2 invalid input or I/O error.`

const code = (value) => '`' + value + '`'
const fence = '```'
const quote = (value) => JSON.stringify(String(value))

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsBanned(text, phrases) {
  return phrases.filter((phrase) =>
    new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'i').test(text),
  )
}

function redactBanned(text, phrases) {
  let result = String(text)
  for (const phrase of phrases) {
    result = result.replace(
      new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi'),
      '[removed]',
    )
  }
  return result
}

export function loadTokens(path = TOKENS_PATH) {
  let tokens
  try {
    tokens = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(
      `cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (
    !tokens ||
    typeof tokens !== 'object' ||
    typeof tokens.version !== 'string' ||
    !tokens.cssVariables ||
    typeof tokens.cssVariables !== 'object'
  ) {
    throw new Error(`${path} is not a design-tokens.json file`)
  }
  for (const name of [
    '--canvas',
    '--surface-1',
    '--text-1',
    '--accent',
    '--font-sans',
    '--text-display',
    '--spring-stiffness',
    '--stagger',
  ]) {
    if (typeof tokens.cssVariables[name] !== 'string') {
      throw new Error(`${path} is missing ${name}`)
    }
  }
  return tokens
}

function loadBannedPhrases(path = BANNED_PATH) {
  try {
    const config = JSON.parse(readFileSync(path, 'utf8'))
    return Array.isArray(config.phrases) ? config.phrases : []
  } catch {
    return []
  }
}

export function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

export function parseShorthand(raw) {
  const shorthand = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!shorthand) throw new Error('provide operator shorthand')

  const clauses = shorthand
    .split(/\s*(?:[,;]|\s+[—–-]\s+)\s*/)
    .map((clause) => clause.trim())
    .filter(Boolean)
  const primary = clauses[0] ?? shorthand
  const cues = clauses.slice(1)

  const locationMatch = /\s+(?:in|at|near)\s+(.+)$/i.exec(primary)
  let business = (
    locationMatch ? primary.slice(0, locationMatch.index) : primary
  ).trim()
  let location = locationMatch ? locationMatch[1].trim() : null
  if (!business) {
    business = primary
    location = null
  }

  return {
    shorthand,
    clauses,
    business,
    location,
    cues,
    displayName: location ? `${business} in ${location}` : business,
  }
}

export function detectLane(text) {
  return /\b(3d|webgl|three(?:\.js)?|r3f|immersive|video|real-?time|scene|game|interactive)\b/i.test(
    text,
  )
    ? 'immersive'
    : 'editorial'
}

function yamlScalar(value) {
  return quote(value)
}

function inlineList(values) {
  return `[${values.map((value) => quote(value)).join(', ')}]`
}

function mdCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function taskYaml() {
  const lines = ['schema_version: 1', 'kind: tasks', 'tasks:']
  for (const task of TASKS) {
    lines.push(`  - id: ${task.id}`)
    lines.push(`    title: ${quote(task.title)}`)
    lines.push(`    depends_on: ${inlineList(task.dependsOn)}`)
    lines.push(`    evidence: ${inlineList(task.evidence)}`)
    lines.push('    status: pending')
  }
  return lines.join('\n')
}

function planYaml(template) {
  return [
    'schema_version: 1',
    'kind: plan',
    'template:',
    `  source: ${quote(`factory/templates/${template}`)}`,
    `  version: ${quote('TBD - record the copied template version')}`,
    'registry_items: []',
    'risks:',
    '  - id: RISK-01',
    `    description: ${quote('Copy or asset gap delays the build')}`,
    '    severity: high',
    `    mitigation: ${quote('Wireframe with typographic placeholders only; no component code until real inputs land')}`,
    '  - id: RISK-02',
    `    description: ${quote('The direction fails the specificity test and reads as a template')}`,
    '    severity: high',
    `    mitigation: ${quote('Approve the design memo and references before the hero; self-score the rubric at 80+')}`,
    '  - id: RISK-03',
    `    description: ${quote('Performance budget is exceeded by fonts, imagery or motion')}`,
    '    severity: medium',
    `    mitigation: ${quote('Budget checks in CI; self-host subset fonts; reserve image dimensions')}`,
    'budget:',
    '  worker_turns: 8',
    `  wall_clock: ${quote('2 working days')}`,
    '  ci_minutes: 8',
  ].join('\n')
}

function acceptanceYaml(lane) {
  const budget = LANE_DEFAULTS[lane]
  const checks = [
    '  - id: BUILD-01',
    '    type: ci',
    `    command: ${quote('pnpm build')}`,
    `    expect: ${quote('exit code 0')}`,
    '  - id: A11Y-01',
    '    type: axe',
    `    routes: ${inlineList(['/'])}`,
    `    viewports: ${inlineList(VIEWPORTS)}`,
    `    expect: ${quote('0 critical or serious violations')}`,
    '  - id: LH-01',
    '    type: lighthouse',
    `    routes: ${inlineList(['/'])}`,
    '    preset: mobile',
    '    assert:',
    `      performance: ${quote(budget.performance)}`,
    `      accessibility: ${quote('>= 1.00')}`,
    '  - id: LH-02',
    '    type: lighthouse',
    `    routes: ${inlineList(['/'])}`,
    '    preset: mobile',
    '    assert:',
    `      lcp_ms: ${quote('<= 2500')}`,
    `      inp_ms: ${quote('<= 200')}`,
    `      cls: ${quote('<= 0.1')}`,
    '  - id: SLOP-01',
    '    type: ci',
    `    command: ${quote('pnpm lint:anti-slop')}`,
    `    expect: ${quote('exit code 0')}`,
    '  - id: LINK-01',
    '    type: link-check',
    `    routes: ${inlineList(['/'])}`,
    `    expect: ${quote('0 broken internal or external links')}`,
    '  - id: ASSET-01',
    '    type: budget',
    `    lane: ${lane}`,
    '    assert:',
    `      initial_js_gzip: ${quote(budget.initialJs)}`,
    `      total_page: ${quote(budget.totalPage)}`,
    ...(lane === 'editorial'
      ? [`      fonts: ${quote(budget.fonts)}`]
      : [`      scene: ${quote(budget.scene)}`]),
    '  - id: EVID-01',
    '    type: evidence',
    `    routes: ${inlineList(['/'])}`,
    `    viewports: ${inlineList(VIEWPORTS)}`,
    `    expect: ${quote('manifest.json plus dark-theme captures at every viewport; before and after for every UI change')}`,
    '  - id: LIC-01',
    '    type: licence',
    `    expect: ${quote('every font, image and video recorded in docs/LICENSES.md with a source and licence')}`,
  ]

  return [
    'schema_version: 1',
    'kind: acceptance',
    'criteria:',
    '  - id: A-01',
    `    given: ${quote('A first-time visitor who removes the logo and client name')}`,
    `    when: ${quote('They scan the page')}`,
    `    then: ${quote('They can identify the offer, the service area and one piece of real proof')}`,
    `    checks: ${inlineList(['A11Y-01', 'LH-01'])}`,
    '  - id: A-02',
    `    given: ${quote('The production build of the site')}`,
    `    when: ${quote('The statutory checks run')}`,
    `    then: ${quote('Build, anti-slop, link, asset and Lighthouse gates pass')}`,
    `    checks: ${inlineList(['BUILD-01', 'SLOP-01', 'LINK-01', 'ASSET-01', 'LH-02'])}`,
    '  - id: A-03',
    `    given: ${quote('A keyboard or reduced-motion user at 390 px')}`,
    `    when: ${quote('They navigate the page')}`,
    `    then: ${quote('Focus is visible, there is no horizontal scroll and no information depends on motion')}`,
    `    checks: ${inlineList(['A11Y-01', 'LH-02'])}`,
    '  - id: A-04',
    `    given: ${quote('The evidence pack and licence log')}`,
    `    when: ${quote('A reviewer opens the PR')}`,
    `    then: ${quote('Every viewport, theme and UI state has a traceable capture and every asset has a licence')}`,
    `    checks: ${inlineList(['EVID-01', 'LIC-01'])}`,
    'checks:',
    ...checks,
  ].join('\n')
}

function tokenRows(tokens, accent) {
  const v = tokens.cssVariables
  return [
    ['Page background', '--canvas', v['--canvas']],
    ['Nested surface', '--surface-1', v['--surface-1']],
    ['Raised surface', '--surface-2', v['--surface-2']],
    ['Divider/border', '--hairline', v['--hairline']],
    ['Primary text', '--text-1', v['--text-1']],
    ['Secondary text', '--text-2', v['--text-2']],
    ['Metadata text', '--text-3', `${v['--text-3']} (metadata and large text only)`],
    ['Brand accent', '--accent', accent],
    ['Success', '--ok', v['--ok']],
    ['Warning', '--warn', v['--warn']],
    ['Danger', '--danger', v['--danger']],
    ['Info', '--info', v['--info']],
    ['Inner radius', '--r-sm', v['--r-sm']],
    ['Outer radius', '--r-md', v['--r-md']],
    ['Sans face', '--font-sans', v['--font-sans']],
    ['Mono face', '--font-mono', v['--font-mono']],
    ['Small text', '--text-sm', v['--text-sm']],
    ['Body text', '--text-base', v['--text-base']],
    ['Lead text', '--text-lg', v['--text-lg']],
    ['Display text', '--text-display', v['--text-display']],
    ['Spring stiffness', '--spring-stiffness', v['--spring-stiffness']],
    ['Spring damping', '--spring-damping', v['--spring-damping']],
    ['Stagger', '--stagger', v['--stagger']],
    ['Fast duration', '--duration-fast', v['--duration-fast']],
    ['Base duration', '--duration-base', v['--duration-base']],
    ['Narrative duration', '--duration-narrative', v['--duration-narrative']],
  ]
}

export function buildMandate(rawShorthand, options = {}) {
  const parsed = parseShorthand(rawShorthand)
  const tokens = options.tokens ?? loadTokens()
  const bannedPhrases = options.bannedPhrases ?? []
  const warnings = []

  let lane = options.lane
  let template = options.template

  if (template) {
    if (!Object.hasOwn(TEMPLATE_LANES, template)) {
      throw new Error(
        `unknown template "${template}"; use one of ${Object.keys(TEMPLATE_LANES).join(', ')}`,
      )
    }
    const templateLane = TEMPLATE_LANES[template]
    if (lane && lane !== templateLane) {
      throw new Error(`template ${template} belongs to the ${templateLane} lane`)
    }
    lane = templateLane
  } else {
    if (lane) {
      if (!LANES.has(lane)) {
        throw new Error(`unknown lane "${lane}"; use editorial or immersive`)
      }
    } else {
      lane = detectLane(parsed.shorthand)
    }
    template = LANE_DEFAULTS[lane].template
  }

  const removedCues = parsed.cues.filter(
    (cue) => containsBanned(cue, bannedPhrases).length > 0,
  )
  for (const cue of removedCues) {
    warnings.push(
      `discarded tone cue "${cue}" because it contains a blacklisted filler phrase`,
    )
  }
  const cleanCues = parsed.cues.filter((cue) => !removedCues.includes(cue))
  const tone = cleanCues.length > 0 ? cleanCues.join(', ') : 'none supplied'

  const slug = options.slug ?? slugify(`${parsed.business} ${parsed.location ?? ''}`)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`slug "${slug}" must use lowercase letters, digits and hyphens`)
  }
  if (slug.length > 64) throw new Error('slug must be 64 characters or fewer')

  const accent = options.accent ?? tokens.cssVariables['--accent']
  if (!/^#[0-9a-f]{6}$/i.test(accent)) {
    throw new Error(`accent "${accent}" must be a six-digit hex colour such as #1a73e8`)
  }

  const title = options.title ?? `Website build: ${parsed.displayName}`
  const vertical = options.vertical ?? parsed.business.toLowerCase()
  const audience =
    options.audience ??
    `CONFIRM at intake: people in ${parsed.location ?? 'the service area'} choosing ${parsed.business} services.`
  const budget = LANE_DEFAULTS[lane]

  const specYaml = [
    'schema_version: 1',
    'kind: spec',
    `id: ${yamlScalar(slug)}`,
    `client: ${yamlScalar(parsed.displayName)}`,
    `vertical: ${yamlScalar(vertical)}`,
    `audience: ${yamlScalar(audience)}`,
    'core_requirements:',
    '  - id: R-01',
    `    statement: ${yamlScalar('One route, one strong idea and enough specificity to pass the logo-removal test.')}`,
    '    priority: must',
    '  - id: R-02',
    `    statement: ${yamlScalar('Approved real copy, licensed imagery and two to three named references exist before component code.')}`,
    '    priority: must',
    '  - id: R-03',
    `    statement: ${yamlScalar('Every claim is sourced by the client; no invented awards, clients, statistics or testimonials.')}`,
    '    priority: must',
    '  - id: R-04',
    `    statement: ${yamlScalar('The build consumes @factory/tokens and passes the anti-slop and statutory checks.')}`,
    '    priority: must',
  ].join('\n')

  const designYaml = [
    'schema_version: 1',
    'kind: design',
    `archetype: ${yamlScalar('engageio-dark')}`,
    'tokens:',
    `  package: ${yamlScalar('@factory/tokens')}`,
    `  version: ${yamlScalar(tokens.version)}`,
    '  overrides:',
    `    color.accent: ${yamlScalar(accent)}`,
    'palette:',
    `  background: ${yamlScalar(tokens.cssVariables['--canvas'])}`,
    `  foreground: ${yamlScalar(tokens.cssVariables['--text-1'])}`,
    `  accent: ${yamlScalar(accent)}`,
    `  muted: ${yamlScalar(tokens.cssVariables['--text-2'])}`,
    `  surface: ${yamlScalar(tokens.cssVariables['--surface-1'])}`,
    'type_scale:',
    '  display:',
    `    family: ${yamlScalar('Geist / Plus Jakarta Sans')}`,
    `    size: ${yamlScalar(tokens.cssVariables['--text-display'])}`,
    '    line_height: 0.98',
    '    weight: 600',
    '  body:',
    `    family: ${yamlScalar('Geist / Plus Jakarta Sans')}`,
    `    size: ${yamlScalar(tokens.cssVariables['--text-base'])}`,
    '    line_height: 1.55',
    '    weight: 400',
    'motion_tokens:',
    `  spring_stiffness: ${tokens.cssVariables['--spring-stiffness']}`,
    `  spring_damping: ${tokens.cssVariables['--spring-damping']}`,
    `  duration_fast: ${yamlScalar(tokens.cssVariables['--duration-fast'])}`,
    `  duration_base: ${yamlScalar(tokens.cssVariables['--duration-base'])}`,
    `  duration_narrative: ${yamlScalar(tokens.cssVariables['--duration-narrative'])}`,
    `  ease_entrance: ${yamlScalar(tokens.cssVariables['--ease-entrance'])}`,
    `  ease_exit: ${yamlScalar(tokens.cssVariables['--ease-exit'])}`,
    `  stagger: ${yamlScalar(tokens.cssVariables['--stagger'])}`,
  ].join('\n')

  const concept = `Working concept (hypothesis to replace after direction approval): a ${tone} treatment of ${parsed.displayName}, led by one decisive composition and a display-to-body scale contrast, with a single accent from the Master Design tokens. Confirm the references and imagery before component code.`

  const rows = tokenRows(tokens, accent)
    .map(([role, token, value]) => `| ${role} | ${code(token)} | ${code(value)} |`)
    .join('\n')

  const taskRows = TASKS.map(
    (task) =>
      `| ${task.id} | ${mdCell(task.title)} | ${mdCell(task.evidence.join(', '))} |`,
  ).join('\n')

  const body = [
    '## Objective',
    '',
    `Build one ${lane} page for **${parsed.displayName}** from the ${code(template)} template, using real copy, approved references and the Master Design tokens. The page must pass every statutory check below before it is ready for human review.`,
    '',
    'This issue is the mandate for a five-file spec pack. It is not the brief itself: the open questions must be answered before component code.',
    '',
    '## Intake summary',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Working name | ${mdCell(parsed.displayName)} |`,
    `| Operator shorthand | ${code(mdCell(redactBanned(parsed.shorthand, bannedPhrases)))} |`,
    `| Lane | ${lane} |`,
    `| Template | ${code(template)} |`,
    `| Site path | ${code(`sites/${slug}/`)} |`,
    `| Vertical | ${mdCell(vertical)} |`,
    `| Audience | ${mdCell(audience)} |`,
    `| Tone cues | ${mdCell(tone)} |`,
    `| Archetype | ${code('engageio-dark')} (${code(`@factory/tokens`)} ${tokens.version}) |`,
    '',
    'Tone cues are operator shorthand, not approved copy. The design memo supplies the real voice.',
    '',
    '## Five-file spec pack (Jev-compliant)',
    '',
    `Write these five files under ${code('.factory/')} before component code. Keep the frontmatter valid YAML, keep the IDs stable, and record deviations from the template in ${code(`sites/${slug}/docs/decisions.md`)}.`,
    '',
    `### 1. ${code('.factory/spec.md')}`,
    '',
    fence + 'yaml',
    specYaml,
    fence,
    '',
    '**Must state:** the problem, the audience, the single route, every content input with its source and status, the three to five user scenarios and what is out of scope.',
    '',
    `### 2. ${code('.factory/design.md')}`,
    '',
    fence + 'yaml',
    designYaml,
    fence,
    '',
    `**Concept:** ${concept}`,
    '',
    '**Must state:** 2 to 3 references and exactly what to borrow from each (composition, type, motion, material), the imagery subject and provenance, the anti-references, the single tell most likely to read as slop and the specificity test. No reference, no build.',
    '',
    `### 3. ${code('.factory/plan.md')}`,
    '',
    fence + 'yaml',
    planYaml(template),
    fence,
    '',
    '**Must state:** the stack and template source, every registry item by ID before component code, risks and the budget guard. An empty registry list is a gate, not a default.',
    '',
    `### 4. ${code('.factory/tasks.md')}`,
    '',
    fence + 'yaml',
    taskYaml(),
    fence,
    '',
    '**Must state:** what changes for each task and the check that proves it is done. Do not invent a task outside the approved pack.',
    '',
    `### 5. ${code('.factory/acceptance.md')}`,
    '',
    fence + 'yaml',
    acceptanceYaml(lane),
    fence,
    '',
    '**Must state:** the Given/When/Then criteria above, the evidence matrix and the blocking conditions.',
    '',
    '## Master Design token mapping',
    '',
    `Consume the package, do not restate its values in component styles. Import ${code('@factory/tokens/tokens.css')} and override only the accent when the design memo justifies it.`,
    '',
    '| Purpose | Token | Value |',
    '| --- | --- | --- |',
    rows,
    '',
    'The accent is the only routine override. Radius, type, spacing and motion stay on the archetype tokens; any other change needs a decision entry and a contrast check.',
    '',
    '## Tasks',
    '',
    '| ID | Task | Evidence |',
    '| --- | --- | --- |',
    taskRows,
    '',
    'Dependencies run in order. T-01 and T-02 are gates: no component code before the tokens, content model and real inputs exist.',
    '',
    '## Acceptance and statutory evidence',
    '',
    '### Criteria',
    '',
    '| ID | Given / when / then | Checks |',
    '| --- | --- | --- |',
    '| A-01 | Given a visitor without the logo or client name, when they scan the page, then they can identify the offer, service area and one piece of real proof. | A11Y-01, LH-01 |',
    '| A-02 | Given the production build, when the statutory checks run, then build, anti-slop, link, asset and Lighthouse gates pass. | BUILD-01, SLOP-01, LINK-01, ASSET-01, LH-02 |',
    '| A-03 | Given a keyboard or reduced-motion user at 390 px, when they navigate, then focus is visible, there is no horizontal scroll and no information depends on motion. | A11Y-01, LH-02 |',
    '| A-04 | Given the evidence pack and licence log, when a reviewer opens the PR, then every viewport and UI state has a traceable capture and every asset has a licence. | EVID-01, LIC-01 |',
    '',
    '### Check contract',
    '',
    '| Check | Pass condition |',
    '| --- | --- |',
    '| BUILD-01 | `pnpm build` exits 0 in the site directory. |',
    '| A11Y-01 | axe reports 0 critical or serious violations at 390x844, 768x1024 and 1440x900. |',
    `| LH-01 | Lighthouse mobile performance ${budget.performance} and accessibility at 1.00. |`,
    '| LH-02 | LCP <= 2500 ms, INP <= 200 ms, CLS <= 0.1 at the 75th percentile. |',
    '| SLOP-01 | `pnpm lint:anti-slop` exits 0. |',
    '| LINK-01 | 0 broken internal or external links. |',
    `| ASSET-01 | Initial JS ${budget.initialJs}, total page ${budget.totalPage}${lane === 'editorial' ? `, fonts ${budget.fonts}` : `, scene ${budget.scene}`}. |`,
    '| EVID-01 | Manifest plus dark-theme captures at 390x844, 768x1024 and 1440x900; before and after for every UI change. |',
    '| LIC-01 | Every font, image and video has a source and licence in `docs/LICENSES.md`. |',
    '',
    '### Evidence matrix',
    '',
    '| Route | Viewport | Theme | Evidence |',
    '| --- | --- | --- | --- |',
    '| `/` | 390x844 | dark | `after-390-dark.webp` plus `before-390-dark.webp` for a UI change |',
    '| `/` | 768x1024 | dark | `after-768-dark.webp` plus `before-768-dark.webp` for a UI change |',
    '| `/` | 1440x900 | dark | `after-1440-dark.webp` plus `before-1440-dark.webp` for a UI change |',
    '',
    `Record each capture in ${code('.factory/evidence/manifest.json')} with URL, viewport, theme, hash and timestamp. Keep the last full check run in ${code('.factory/verify.log')}. The PR description carries the same evidence, the checks run and the known limitations.`,
    '',
    '## Anti-slop gate',
    '',
    `Run ${code('pnpm lint:anti-slop')} from the repository root. It rejects the blacklisted filler phrases, pure black colour literals and raw Tailwind colour utilities. A suppression needs a review reason; it is not a way to pass.`,
    '',
    'Self-score the rubric before review. Anything below 80 returns to the worker; any automatic-fail tell caps the score at 69.',
    '',
    '## Open questions (resolve at intake; do not build on assumptions)',
    '',
    '1. Where is the approved real copy, and who signs it off?',
    '2. Which licensed photography, video and fonts will be used, and where are the licences recorded?',
    '3. Which two or three references should we study, and what exactly do we borrow from each?',
    '4. Confirm the service area and the single conversion action.',
    `5. Confirm or replace the default accent ${code(accent)} with a contrast-checked brand value.`,
    '',
    '## Definition of done',
    '',
    '- [ ] The five spec-pack files are complete under `.factory/` and the open questions are answered.',
    '- [ ] Real copy, licensed assets and references are in place; no placeholders or invented proof.',
    '- [ ] T-01 through T-06 are complete with their named evidence.',
    '- [ ] BUILD-01, A11Y-01, LH-01, LH-02, SLOP-01, LINK-01, ASSET-01, EVID-01 and LIC-01 pass.',
    '- [ ] The rubric self-score is 80 or above, and the PR states any material limitation.',
    '- [ ] A person approves the direction and merges the PR; workers never merge.',
  ].join('\n')

  return {
    title,
    body,
    slug,
    lane,
    template,
    labels: ['site-build'],
    warnings,
    tokensVersion: tokens.version,
  }
}

export function render(mandate, format = 'markdown') {
  switch (format) {
    case 'json':
      return `${JSON.stringify(
        {
          title: mandate.title,
          body: mandate.body,
          slug: mandate.slug,
          lane: mandate.lane,
          template: mandate.template,
          labels: mandate.labels,
        },
        null,
        2,
      )}\n`
    case 'issue':
      return `${mandate.body}\n`
    case 'markdown':
      return `# ${mandate.title}\n\n${mandate.body}\n`
    default:
      throw new Error(
        `unknown format "${format}"; use markdown, issue or json`,
      )
  }
}

function parseArgs(argv) {
  const options = {}
  const words = []
  const valueFlags = {
    '--lane': 'lane',
    '--template': 'template',
    '--format': 'format',
    '--out': 'out',
    '--slug': 'slug',
    '--accent': 'accent',
    '--title': 'title',
    '--audience': 'audience',
    '--vertical': 'vertical',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--help' || argument === '-h') {
      options.help = true
    } else if (argument.startsWith('--')) {
      const equals = argument.indexOf('=')
      const flag = equals === -1 ? argument : argument.slice(0, equals)
      const key = valueFlags[flag]
      if (!key) throw new Error(`unknown option "${flag}"`)
      let value = equals === -1 ? undefined : argument.slice(equals + 1)
      if (value === undefined) {
        index += 1
        value = argv[index]
        if (value === undefined) throw new Error(`${flag} needs a value`)
      }
      options[key] = value
    } else {
      words.push(argument)
    }
  }

  return { options, shorthand: words.join(' ').trim() }
}

export function run(argv = [], { stdout = process.stdout, stderr = process.stderr } = {}) {
  let parsed
  try {
    parsed = parseArgs(argv)
  } catch (error) {
    stderr.write(`prompt-optimizer: ${error instanceof Error ? error.message : String(error)}\n\n${HELP}\n`)
    return 2
  }

  if (parsed.options.help) {
    stdout.write(`${HELP}\n`)
    return 0
  }

  const format = parsed.options.format ?? 'markdown'
  if (!['markdown', 'issue', 'json'].includes(format)) {
    stderr.write(`prompt-optimizer: unknown format "${format}"; use markdown, issue or json\n`)
    return 2
  }

  let mandate
  try {
    mandate = buildMandate(parsed.shorthand, {
      ...parsed.options,
      bannedPhrases: loadBannedPhrases(),
    })
  } catch (error) {
    stderr.write(`prompt-optimizer: ${error instanceof Error ? error.message : String(error)}\n`)
    return 2
  }

  for (const warning of mandate.warnings) {
    stderr.write(`prompt-optimizer: warning: ${warning}\n`)
  }

  let output
  try {
    output = render(mandate, format)
  } catch (error) {
    stderr.write(`prompt-optimizer: ${error instanceof Error ? error.message : String(error)}\n`)
    return 2
  }

  if (parsed.options.out) {
    const destination = resolve(parsed.options.out)
    try {
      mkdirSync(dirname(destination), { recursive: true })
      writeFileSync(destination, output)
    } catch (error) {
      stderr.write(
        `prompt-optimizer: cannot write ${destination}: ${
          error instanceof Error ? error.message : String(error)
        }\n`,
      )
      return 2
    }
    stderr.write(`prompt-optimizer: wrote ${parsed.options.out}\n`)
  } else {
    stdout.write(output)
  }

  return 0
}

const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(SCRIPT_PATH)

if (invokedDirectly) {
  process.exitCode = run(process.argv.slice(2))
}

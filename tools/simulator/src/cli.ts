/**
 * Simulator CLI (ticket 16). From the repo root:
 *
 *   corepack pnpm sim run --scenario scenario_1 --board crossroads --a sim:greedy --b sim:greedy \
 *     [--games 1000] [--seed 0] [--sim-equivalent] [--format md|json] [--out file]
 *   corepack pnpm sim parity   [--games 2000] [--other-games 1000] [--seed 0] [--out docs/balance/sim-v4-parity]
 *   corepack pnpm sim baseline [--games 1000] [--seed 0] [--out docs/balance/phase-1-baseline]
 *   corepack pnpm sim ranges   [--games 2000] [--seed 0] [--workers n] [--out docs/balance/ticket-08-range-experiments]
 *   `run --variant a|b|c|ab|ac|bc|abc` plays a range variant (phase 1.x ticket 08; data/ and the game are unchanged)
 *
 * Profiles: `sim:<mode>` (SIM_PROFILES, sim.py parity) or `game:<mode>`
 * (GAME_PROFILES, the web game), mode = greedy | tamer_rush | neutral.
 * `run` prints Markdown (default) or JSON; `parity` and `baseline` write
 * `<out>.md` and `<out>.json`. Same arguments → identical numbers.
 */
import { writeFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { AI_MODES, GAME_PROFILES, SIM_PROFILES, type AiMode, type AiProfile } from '@mt/ai'
import { ENGINE_VERSION } from '@mt/engine'
import { dataHash, type GameData } from '@mt/shared'
import { loadRepoData, REPO_ROOT, simEquivalentData, type DataOverride } from './data.ts'
import { aggregate, metricsTables, skillTable, type LabelledMetrics, type Metrics } from './metrics.ts'
import { loadSimV4, parityTable, runParity, type ParityResult } from './parity.ts'
import { rangeJobs, rangeTables, runRangeJobs } from './ranges.ts'
import { simulateGames } from './simulate.ts'
import { applyVariant, RANGE_VARIANTS, variantById } from './variants.ts'
import { cpus } from 'node:os'

export type Command = 'run' | 'parity' | 'baseline' | 'ranges'

export interface CliOptions {
  readonly command: Command
  readonly scenario: string
  readonly board: string
  readonly a: string
  readonly b: string
  readonly games: number | undefined
  readonly otherGames: number | undefined
  readonly seed: string
  readonly simEquivalent: boolean
  /** `run`: a range variant (ticket 08). */
  readonly variant: string | undefined
  /** `ranges`: worker threads. */
  readonly workers: number | undefined
  readonly format: 'md' | 'json'
  readonly out: string | undefined
}

const USAGE = 'usage: sim run|parity|baseline|ranges [--scenario id] [--board id] [--a sim:greedy] [--b sim:greedy] [--games n] [--other-games n] [--seed hex] [--sim-equivalent] [--variant id] [--workers n] [--format md|json] [--out path]'

/** Parse argv (without node and the script). Throws with a usage line on anything unknown. */
export function parseArgs(argv: readonly string[]): CliOptions {
  const [command, ...rest] = argv
  if (command !== 'run' && command !== 'parity' && command !== 'baseline' && command !== 'ranges') throw new Error(USAGE)
  const opts: Record<string, string | true> = {}
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i] ?? ''
    if (arg === '--') continue
    if (!arg.startsWith('--')) throw new Error(`unexpected "${arg}"\n${USAGE}`)
    const key = arg.slice(2)
    if (key === 'sim-equivalent') {
      opts[key] = true
      continue
    }
    const value = rest[++i]
    if (value === undefined || value.startsWith('--')) throw new Error(`--${key} needs a value\n${USAGE}`)
    opts[key] = value
  }
  const known = ['scenario', 'board', 'a', 'b', 'games', 'other-games', 'seed', 'sim-equivalent', 'variant', 'workers', 'format', 'out']
  for (const k of Object.keys(opts)) if (!known.includes(k)) throw new Error(`unknown option --${k}\n${USAGE}`)
  const str = (k: string, d: string) => (typeof opts[k] === 'string' ? opts[k] : d)
  const count = (k: string) => {
    if (opts[k] === undefined) return undefined
    const n = Number(opts[k])
    if (!Number.isInteger(n) || n < 1) throw new Error(`--${k} must be a positive integer`)
    return n
  }
  const seed = str('seed', '0')
  if (!/^[0-9a-fA-F]{1,16}$/.test(seed)) throw new Error('--seed must be 1–16 hex digits')
  const format = str('format', 'md')
  if (format !== 'md' && format !== 'json') throw new Error('--format must be md or json')
  for (const k of ['a', 'b']) if (opts[k] !== undefined) profileOf(str(k, ''))
  if (typeof opts.variant === 'string') variantById(opts.variant)
  return {
    command,
    scenario: str('scenario', 'scenario_1'),
    board: str('board', 'crossroads'),
    a: str('a', 'sim:greedy'),
    b: str('b', 'sim:greedy'),
    games: count('games'),
    otherGames: count('other-games'),
    seed,
    simEquivalent: opts['sim-equivalent'] === true,
    variant: typeof opts.variant === 'string' ? opts.variant : undefined,
    workers: count('workers'),
    format,
    out: typeof opts.out === 'string' ? opts.out : undefined,
  }
}

/** "sim:greedy" / "game:tamer_rush" → the profile. */
export function profileOf(name: string): AiProfile {
  const [kind, mode] = name.split(':')
  if ((kind !== 'sim' && kind !== 'game') || !AI_MODES.includes(mode as AiMode)) throw new Error(`profile must be sim:<mode> or game:<mode>, mode one of ${AI_MODES.join(', ')}; got "${name}"`)
  return (kind === 'sim' ? SIM_PROFILES : GAME_PROFILES)[mode as AiMode]
}

const log = (msg: string) => process.stderr.write(`${msg}\n`)
const resolveOut = (p: string) => (isAbsolute(p) ? p : join(REPO_ROOT, p))

function writeReport(out: string, md: string, json: unknown) {
  writeFileSync(resolveOut(`${out}.md`), md)
  writeFileSync(resolveOut(`${out}.json`), `${JSON.stringify(json, null, 2)}\n`)
  log(`wrote ${out}.md and ${out}.json`)
}

function header(title: string, command: string, data: GameData, seed: string): string[] {
  return [
    `# ${title}`,
    '',
    `Generated by \`${command}\` (tools/simulator, ticket 16). Engine ${ENGINE_VERSION}, base Dice Seed \`${seed}\` (Battle i plays seed base + (i+1)·0x9e3779b97f4a7c15 mod 2^64), data hash of the data played \`${dataHash(data).slice(0, 16)}…\`. Same command → same numbers.`,
    '',
  ]
}

function runCommand(o: CliOptions, data0: GameData): string {
  const base = o.simEquivalent ? simEquivalentData(data0) : { data: data0, overrides: [] as DataOverride[] }
  const { overrides } = base
  if (o.variant !== undefined && o.simEquivalent) throw new Error('--variant and --sim-equivalent do not go together')
  const variant = o.variant === undefined ? undefined : applyVariant(base.data, variantById(o.variant))
  const data = variant?.data ?? base.data
  const games = o.games ?? 1000
  const matchup = {
    scenario: o.scenario,
    board: o.board,
    profiles: { A: profileOf(o.a), B: profileOf(o.b) },
    ...(variant?.rules === undefined ? {} : { variantRules: variant.rules }),
  }
  const metrics = aggregate(simulateGames(data, matchup, games, o.seed))
  const config = { scenario: o.scenario, board: o.board, a: o.a, b: o.b, games, seed: o.seed, simEquivalent: o.simEquivalent, ...(o.variant === undefined ? {} : { variant: o.variant }), engine: ENGINE_VERSION, dataHash: dataHash(data) }
  if (o.format === 'json') return `${JSON.stringify({ config, overrides, metrics }, null, 2)}\n`
  const row: LabelledMetrics = { label: `${o.scenario} ${o.board} ${o.a} vs ${o.b}${o.variant === undefined ? '' : ` [${o.variant}]`}`, metrics }
  return `${metricsTables([row])}\n\n${skillTable([row])}\n`
}

function parityCommand(o: CliOptions, data0: GameData) {
  const { data, overrides } = simEquivalentData(data0)
  const games = o.games ?? 2000
  const other = o.otherGames ?? 1000
  const simV4 = loadSimV4()
  const results: ParityResult[] = runParity(data, {
    seed: o.seed,
    simV4,
    games: (c) => {
      const n = c.sameRules ? games : other
      log(`parity ${c.label}: ${n} Battles…`)
      return n
    },
  })
  const deciding = results.flatMap((r) => r.checks).filter((c) => c.decides)
  const pass = deciding.every((c) => c.pass)
  const out = o.out ?? 'docs/balance/sim-v4-parity'
  const cmd = `corepack pnpm sim parity --games ${games} --other-games ${other} --seed ${o.seed}`
  const rows = results.map((r) => ({ label: r.config.label, metrics: r.metrics }))
  const md = [
    ...header('Simulator parity with sim v4', cmd, data, o.seed),
    `**Verdict: ${pass ? 'PASS' : 'FAIL'}** — every U4 check (the configs whose rules match the engine) is ${pass ? 'within' : 'NOT all within'} tolerance.`,
    '',
    '## Conditions (sim-equivalent, test/tool only)',
    '',
    'Decision log 2026-10-16 and D-25: parity is checked under the conditions sim v4 ran with, to show the engine implements the rules; data/ and the game are unchanged. Values the override layer changed:',
    '',
    '| What | data/ | Simulated with |',
    '|---|---|---|',
    ...overrides.map((v) => `| ${v.what} | ${v.from} | ${v.to} |`),
    '',
    'AI: `SIM_PROFILES` (sim.py port incl. its cache quirk). Board: crossroads (sim v4 terrain). Not neutralised (statistical only, rules §21.7): deployment scores use the AI dice stream instead of `random.Random`, Burst hits targets in the chosen order rather than Unit order, every die comes from the engine stream (no ball-for-ball match).',
    '',
    `Tolerance: ±5 pp for shares; Turns per side ±5% of sim v4's mean. sim v4 sample: ${simV4['S1 U4']?.n ?? '?'} Battles per U4 config. SE of diff = sqrt(SE_ours² + SE_sim²).`,
    '',
    '## Parity checks',
    '',
    parityTable(results),
    '',
    '## All metrics (ours)',
    '',
    metricsTables(rows),
    '',
    '## Actions per Battle (ours)',
    '',
    skillTable(rows),
    '',
  ].join('\n')
  writeReport(out, md, { command: cmd, engine: ENGINE_VERSION, dataHash: dataHash(data), seed: o.seed, overrides, pass, results })
  log(`parity: ${pass ? 'PASS' : 'FAIL'}`)
}

export const BASELINE_SCENARIOS = ['scenario_1', 'scenario_2'] as const
export const BASELINE_BOARDS = ['crossroads', 'shallows'] as const
export const BASELINE_PROFILES = ['game:greedy', 'sim:greedy'] as const
const WATCHED_SKILLS = ['Hex', 'Blink', 'Mark', 'Camouflage', 'Pin'] as const

function baselineCommand(o: CliOptions, data: GameData) {
  const games = o.games ?? 1000
  const rows: LabelledMetrics[] = []
  for (const scenario of BASELINE_SCENARIOS)
    for (const board of BASELINE_BOARDS)
      for (const profile of BASELINE_PROFILES) {
        const label = `${scenario === 'scenario_1' ? 'S1' : 'S2'} ${board} ${profile}`
        log(`baseline ${label}: ${games} Battles…`)
        const p = profileOf(profile)
        rows.push({ label, metrics: aggregate(simulateGames(data, { scenario, board, profiles: { A: p, B: p } }, games, o.seed)) })
      }
  const simV4 = loadSimV4()
  const issues = (label: string, m: Metrics | undefined, sim?: { limit: number; winA: number; skill_per_game?: Record<string, number> }) =>
    m !== undefined
      ? `| ${label} | ${(100 * m.limit).toFixed(1)}% | ${(100 * m.winA).toFixed(1)}% | ${WATCHED_SKILLS.map((s) => (m.skillsPerGame[s] ?? 0).toFixed(2)).join(' | ')} | ${(m.hitsTakenPerGame.Tidewall ?? 0).toFixed(2)} | ${(m.hitsTakenPerGame.Tamer ?? 0).toFixed(2)} |`
      : `| ${label} | ${(100 * (sim?.limit ?? 0)).toFixed(1)}% | ${(100 * (sim?.winA ?? 0)).toFixed(1)}% | ${WATCHED_SKILLS.map((s) => (sim?.skill_per_game?.[s] ?? 0).toFixed(2)).join(' | ')} | – | – |`
  const out = o.out ?? 'docs/balance/phase-1-baseline'
  const cmd = `corepack pnpm sim baseline --games ${games} --seed ${o.seed}`
  const md = [
    ...header('Phase 1 balance baseline (real rules)', cmd, data, o.seed),
    `Real rules and data/ as shipped (Tidewall moves 2, kit stats). Both sides use the same AI profile: \`game:greedy\` = the web game's AI (GAME_PROFILES), \`sim:greedy\` = the sim.py port (SIM_PROFILES). ${games} Battles per row.`,
    '',
    '## Known issues from sim v4, re-measured',
    '',
    `| Config | 10-turn limit | A win | ${WATCHED_SKILLS.map((s) => `${s}/game`).join(' | ')} | Hits on Tidewall/game | Hits on Tamer/game |`,
    `|---|---|---|${WATCHED_SKILLS.map(() => '---').join('|')}|---|---|`,
    ...(['S1 U4', 'S2 U4'] as const).map((k) => issues(`sim v4 ${k} (reference)`, undefined, simV4[k] as never)),
    ...rows.map((r) => issues(r.label, r.metrics)),
    '',
    '## All metrics',
    '',
    metricsTables(rows),
    '',
    '## Actions per Battle',
    '',
    skillTable(rows),
    '',
  ].join('\n')
  writeReport(out, md, { command: cmd, engine: ENGINE_VERSION, dataHash: dataHash(data), seed: o.seed, games, rows })
}

async function rangesCommand(o: CliOptions, data: GameData): Promise<void> {
  const games = o.games ?? 2000
  const workers = o.workers ?? cpus().length
  const jobs = rangeJobs(games, o.seed)
  log(`ranges: ${jobs.length} sets of ${games} Battles (${jobs.length * games} in all) on up to ${workers} threads…`)
  const started = Date.now()
  const results = await runRangeJobs(jobs, workers, (r, done) =>
    log(`ranges ${done}/${jobs.length} ${r.variant} ${r.scenario} ${r.board}: A ${(100 * r.metrics.winA).toFixed(1)}%, limit ${(100 * r.metrics.limit).toFixed(1)}%, first attack after ${r.metrics.turnsBeforeFirstAttack.toFixed(2)} Turns`),
  )
  const out = o.out ?? 'docs/balance/ticket-08-range-experiments'
  const cmd = `corepack pnpm sim ranges --games ${games} --seed ${o.seed}`
  const md = [
    ...header('Range experiments (phase 1.x ticket 08): tables', cmd, data, o.seed),
    `Variants: ${RANGE_VARIANTS.map((v) => `**${v.id}** ${v.label}`).join('; ')}. Game AI (\`game:greedy\`) on both sides, ${games} Battles per set, sets = Scenario 1/2 x Crossroads/Shallows. Variants never touch data/ or the rules of the game; they exist only inside this run (tools/simulator/src/variants.ts).`,
    '',
    rangeTables(results),
  ].join('\n')
  writeReport(out, md, { command: cmd, engine: ENGINE_VERSION, dataHash: dataHash(data), seed: o.seed, games, seconds: Math.round((Date.now() - started) / 1000), results })
}

export async function main(argv: readonly string[]): Promise<void> {
  const o = parseArgs(argv)
  const data = loadRepoData()
  if (o.command === 'ranges') {
    await rangesCommand(o, data)
    return
  }
  if (o.command === 'run') {
    const text = runCommand(o, data)
    if (o.out !== undefined) writeFileSync(resolveOut(o.out), text)
    else process.stdout.write(text)
  } else if (o.command === 'parity') parityCommand(o, data)
  else baselineCommand(o, data)
}

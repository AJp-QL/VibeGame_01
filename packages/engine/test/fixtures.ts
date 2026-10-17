import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  loadGameData,
  SIDES,
  tileFromName,
  type Board,
  type Element,
  type GameData,
  type ElementWheel,
  type Scenario,
  type ScenarioTeam,
  type Side,
  type Skill,
  type Stats,
  type StatusType,
} from '@mt/shared'
import {
  applyAction,
  createBattle,
  recordReplay,
  replayBattle,
  type Action,
  type ApplyResult,
  type BattleState,
  type DiceSource,
  type ReplayHeader,
} from '../src/index.ts'

const DATA_DIR = fileURLToPath(new URL('../../../data/', import.meta.url))

function readDataDir(): Record<string, unknown> {
  const files: Record<string, unknown> = {}
  for (const entry of readdirSync(DATA_DIR, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const fullPath = join(entry.parentPath, entry.name)
    files[relative(DATA_DIR, fullPath).split(sep).join('/')] = JSON.parse(readFileSync(fullPath, 'utf8'))
  }
  return files
}

/** The real data/ folder, validated. */
export const gameData = loadGameData(readDataDir())

/**
 * A 9x9 Board for tests of other Board sizes (phase 1.x ticket 13). Not in data/:
 * it is loaded through the same schema as the real Boards. Forest on c2 and g8
 * (turned 180° onto each other), mountain-free, otherwise plain.
 */
export const arena: Board = loadGameData({
  ...readDataDir(),
  'boards/arena.json': {
    id: 'arena',
    name: 'Arena',
    rows: ['.........', '..F......', '.........', '.........', '....W....', '.........', '.........', '......F..', '.........'],
  },
}).boards.arena!

/**
 * Prototype kit stats of Scenario 1 (rules §20.2 before the ticket 19 tuning),
 * by side: Tamer, Monster 1, Monster 2. Rule tests keep these fixed numbers so
 * balance changes in data/ do not move them; derived.test.ts checks the real
 * data against §20.2.
 */
const KIT_STATS_SCENARIO_1: Readonly<Record<Side, readonly Stats[]>> = {
  A: [
    { pow: 10, agi: 12, vit: 12, int: 10, sen: 12, spi: 12 },
    { pow: 14, agi: 12, vit: 10, int: 8, sen: 12, spi: 8 },
    { pow: 8, agi: 12, vit: 8, int: 14, sen: 12, spi: 12 },
  ],
  B: [
    { pow: 10, agi: 12, vit: 12, int: 10, sen: 12, spi: 12 },
    { pow: 12, agi: 8, vit: 14, int: 8, sen: 10, spi: 12 },
    { pow: 12, agi: 12, vit: 10, int: 8, sen: 14, spi: 8 },
  ],
}

/** The real data/scenarios/scenario_1.json. */
export const dataScenario1: Scenario = gameData.scenarios.scenario_1!

/** Scenario 1 from data/ with the Prototype kit stats (see KIT_STATS_SCENARIO_1); the default of the rule tests. */
export const scenario1: Scenario = {
  ...dataScenario1,
  teams: Object.fromEntries(
    SIDES.map((side) => {
      const team = dataScenario1.teams[side]
      const stats = KIT_STATS_SCENARIO_1[side]
      return [side, { ...team, tamer: { ...team.tamer, stats: stats[0]! }, monsters: team.monsters.map((m, i) => ({ ...m, stats: stats[i + 1]! })) }]
    }),
  ) as unknown as Scenario['teams'],
}

/** data/ with Scenario 1 at the Prototype kit stats, for tests that go through Replays (which load Scenarios by id). */
export const kitGameData = { ...gameData, scenarios: { ...gameData.scenarios, scenario_1: scenario1 } }

type Tiles = readonly [string, string, string]

/** Where the walking skeleton used to start Scenario 1 (Tamer, Monster 1, Monster 2). */
export const DEFAULT_TILES: Readonly<Record<Side, Tiles>> = { A: ['d1', 'c2', 'e2'], B: ['d7', 'e6', 'c6'] }

export interface BattleOptions {
  /** Scenario to start from (default: Scenario 1). */
  readonly scenario?: Scenario
  /** Tamer, Monster 1, Monster 2 tiles per side, anywhere on the Board (defaults: DEFAULT_TILES). */
  readonly tiles?: Partial<Record<Side, Tiles>>
  /** The side that plays first (default A). */
  readonly firstSide?: Side
  /** Stat changes by Unit id ("A.tamer", "B.m2", …), on top of the Scenario's. */
  readonly stats?: Readonly<Record<string, Partial<Stats>>>
  /** Monster elements by Unit id ("A.m1", …), instead of the Scenario's. */
  readonly elements?: Readonly<Record<string, Element>>
  /** Skill data changes by skill id, on top of data/skills (e.g. a longer range). */
  readonly skills?: Readonly<Record<string, Partial<Skill>>>
  /** Status data changes by status id, on top of data/statuses. */
  readonly statuses?: Readonly<Record<string, Partial<StatusType>>>
  /** Loadouts by Unit id, instead of the Scenario's (e.g. to give team B a skill that applies Pin). */
  readonly loadouts?: Readonly<Record<string, readonly string[]>>
  /** Element wheel instead of data/elements. */
  readonly elementWheel?: ElementWheel
  /** Board to play on instead of Crossroads (e.g. `arena`, 9x9). */
  readonly board?: Board
  readonly dice?: DiceSource
  /**
   * Which sides start with Inspiration. Default: neither, so tests about
   * other rules resolve each action without pausing for the decision
   * (declining draws no dice, so the dice order is the same either way).
   */
  readonly inspiration?: Readonly<Record<Side, boolean>>
}

/** No side has Inspiration: actions never pause to ask (the fixtures' default). */
export const NO_INSPIRATION: Readonly<Record<Side, boolean>> = { A: false, B: false }

function withEdits(team: ScenarioTeam, side: Side, options: BattleOptions): ScenarioTeam {
  const edit = <T extends { readonly stats: Stats; readonly skills: readonly string[] }>(record: T, id: string): T => ({
    ...record,
    stats: { ...record.stats, ...options.stats?.[id] },
    skills: options.loadouts?.[id] ?? record.skills,
  })
  const [m1, m2] = team.monsters
  const monster = (record: typeof m1, id: string) => {
    const element = options.elements?.[id]
    return edit(element === undefined ? record : { ...record, element }, id)
  }
  return {
    ...team,
    tamer: edit(team.tamer, `${side}.tamer`),
    monsters: [monster(m1, `${side}.m1`), monster(m2, `${side}.m2`)],
  }
}

function setup(dice: DiceSource | undefined, options: BattleOptions = {}) {
  const base = options.scenario ?? scenario1
  return {
    scenario: {
      ...base,
      teams: { A: withEdits(base.teams.A, 'A', options), B: withEdits(base.teams.B, 'B', options) },
    },
    board: options.board ?? gameData.boards.crossroads!,
    species: gameData.species,
    skills: Object.fromEntries(
      Object.entries(gameData.skills).map(([id, skill]) => [id, { ...skill, ...options.skills?.[id] }]),
    ),
    statuses: Object.fromEntries(
      Object.entries(gameData.statuses).map(([id, status]) => [id, { ...status, ...options.statuses?.[id] }]),
    ),
    elementWheel: options.elementWheel ?? gameData.elementWheel,
    dice: dice ?? { seed: '0123456789abcdef' },
    inspiration: options.inspiration ?? NO_INSPIRATION,
  }
}

/**
 * A Battle on Crossroads (Scenario 1 unless told otherwise) already in play:
 * Round 1, Turn 1 of `firstSide`, Units on `tiles`, optionally built
 * differently. Skips deployment and initiative (no dice used).
 */
export function scenario1Battle(options: BattleOptions = {}): BattleState {
  const tiles = (side: Side) => {
    const [tamer, m1, m2] = (options.tiles?.[side] ?? DEFAULT_TILES[side]).map(tileFromName)
    return [tamer!, m1!, m2!] as const
  }
  return createBattle({
    ...setup(options.dice, options),
    preset: { tiles: { A: tiles('A'), B: tiles('B') }, firstSide: options.firstSide ?? 'A' },
  })
}

/**
 * Every Monster forest: the same element is neutral (rules §4.1), so element
 * gives no advantage or disadvantage. For tests about something else; keep
 * their Monsters off forest tiles (terrain match, rules §4.3).
 */
export const NEUTRAL_ELEMENTS: Readonly<Record<string, Element>> = {
  'A.m1': 'forest',
  'A.m2': 'forest',
  'B.m1': 'forest',
  'B.m2': 'forest',
}

/** A Scenario 1 Battle on Crossroads at the start of deployment (no Inspiration unless asked for). */
export function scenario1Deployment(dice?: DiceSource, inspiration?: Readonly<Record<Side, boolean>>, board?: Board): BattleState {
  return createBattle(setup(dice, { ...(inspiration === undefined ? {} : { inspiration }), ...(board === undefined ? {} : { board }) }))
}

type Applied = Extract<ApplyResult, { ok: true }>

function applied(result: ApplyResult): Applied {
  if (!result.ok) throw new Error(result.rejection.message)
  return result
}

/**
 * Deploy both sides of `scenario` on DEFAULT_TILES through the engine's
 * actions: returns the result of team B's Confirm, whose events hold the
 * reveal, the initiative rolls and the first Turn.
 */
export function deployBothSides(
  dice: DiceSource,
  scenario: Scenario = scenario1,
  inspiration: Readonly<Record<Side, boolean>> = NO_INSPIRATION,
): Applied {
  let state = createBattle(setup(dice, { scenario, inspiration }))
  for (const side of SIDES) {
    ;[`${side}.tamer`, `${side}.m1`, `${side}.m2`].forEach((unit, i) => {
      const to = tileFromName(DEFAULT_TILES[side][i]!)
      state = applied(applyAction(state, { type: 'deploy', unit, to })).state
    })
    if (side === 'A') state = applied(applyAction(state, { type: 'confirmDeployment' })).state
  }
  return applied(applyAction(state, { type: 'confirmDeployment' }))
}

/**
 * The same actions with a `declineInspiration` after every one that pauses for
 * Inspiration (rules §18). For Replay tests whose dice come from a Dice Seed:
 * which rolls are offered depends on the dice, so the answers are worked out
 * by playing the actions.
 */
export function declineEveryOffer(header: ReplayHeader, data: GameData, actions: readonly Action[]): Action[] {
  const start = replayBattle(recordReplay(header, data, []), data)
  if (!start.ok) throw new Error('replay failed to start')
  let state = start.final
  const out: Action[] = []
  const play = (action: Action) => {
    const result = applyAction(state, action)
    if (!result.ok) throw new Error(result.rejection.message)
    state = result.state
    out.push(action)
  }
  for (const action of actions) {
    play(action)
    while (state.pending?.kind === 'inspiration') play({ type: 'declineInspiration', side: state.pending.side })
  }
  return out
}

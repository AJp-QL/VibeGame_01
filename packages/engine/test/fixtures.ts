import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGameData, SIDES, tileFromName, type Scenario, type Side } from '@mt/shared'
import { applyAction, createBattle, type ApplyResult, type BattleState, type DiceSource } from '../src/index.ts'

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

export const scenario1: Scenario = gameData.scenarios.scenario_1!

type Tiles = readonly [string, string, string]

/** Where the walking skeleton used to start Scenario 1 (Tamer, Monster 1, Monster 2). */
export const DEFAULT_TILES: Readonly<Record<Side, Tiles>> = { A: ['d1', 'c2', 'e2'], B: ['d7', 'e6', 'c6'] }

export interface BattleOptions {
  /** Tamer, Monster 1, Monster 2 tiles per side, anywhere on the Board (defaults: DEFAULT_TILES). */
  readonly tiles?: Partial<Record<Side, Tiles>>
  /** The side that plays first (default A). */
  readonly firstSide?: Side
  readonly dice?: DiceSource
}

function setup(dice: DiceSource | undefined) {
  return {
    scenario: scenario1,
    board: gameData.boards.crossroads!,
    species: gameData.species,
    dice: dice ?? { seed: '0123456789abcdef' },
  }
}

/**
 * A Scenario 1 Battle on Crossroads already in play: Round 1, Turn 1 of
 * `firstSide`, Units on `tiles`. Skips deployment and initiative (no dice used).
 */
export function scenario1Battle(options: BattleOptions = {}): BattleState {
  const tiles = (side: Side) => {
    const [tamer, m1, m2] = (options.tiles?.[side] ?? DEFAULT_TILES[side]).map(tileFromName)
    return [tamer!, m1!, m2!] as const
  }
  return createBattle({
    ...setup(options.dice),
    preset: { tiles: { A: tiles('A'), B: tiles('B') }, firstSide: options.firstSide ?? 'A' },
  })
}

/** A Scenario 1 Battle on Crossroads at the start of deployment. */
export function scenario1Deployment(dice?: DiceSource): BattleState {
  return createBattle(setup(dice))
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
export function deployBothSides(dice: DiceSource, scenario: Scenario = scenario1): Applied {
  let state = createBattle({ ...setup(dice), scenario })
  for (const side of SIDES) {
    ;[`${side}.tamer`, `${side}.m1`, `${side}.m2`].forEach((unit, i) => {
      const to = tileFromName(DEFAULT_TILES[side][i]!)
      state = applied(applyAction(state, { type: 'deploy', unit, to })).state
    })
    if (side === 'A') state = applied(applyAction(state, { type: 'confirmDeployment' })).state
  }
  return applied(applyAction(state, { type: 'confirmDeployment' }))
}

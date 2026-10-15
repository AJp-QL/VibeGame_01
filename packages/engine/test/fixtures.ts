import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGameData, type Scenario, type Side } from '@mt/shared'
import { createBattle, type BattleState, type DiceSource } from '../src/index.ts'

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

type StartingTiles = readonly [string, string, string]

export interface BattleOptions {
  /** Tamer, Monster 1, Monster 2 tiles per side (defaults: the Scenario's). */
  readonly tiles?: Partial<Record<Side, StartingTiles>>
  readonly dice?: DiceSource
}

/** A Scenario 1 Battle on Crossroads, optionally with Units placed elsewhere. */
export function scenario1Battle(options: BattleOptions = {}): BattleState {
  const scenario: Scenario = {
    ...scenario1,
    teams: {
      A: { ...scenario1.teams.A, startingTiles: options.tiles?.A ?? scenario1.teams.A.startingTiles },
      B: { ...scenario1.teams.B, startingTiles: options.tiles?.B ?? scenario1.teams.B.startingTiles },
    },
  }
  return createBattle({
    scenario,
    board: gameData.boards.crossroads!,
    species: gameData.species,
    dice: options.dice ?? { seed: '0123456789abcdef' },
  })
}

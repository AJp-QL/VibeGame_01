import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGameData, type Scenario, type ScenarioTeam, type Side, type Skill, type Stats } from '@mt/shared'
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
  /** Scenario to start from (default: Scenario 1). */
  readonly scenario?: Scenario
  /** Tamer, Monster 1, Monster 2 tiles per side (defaults: the Scenario's). */
  readonly tiles?: Partial<Record<Side, StartingTiles>>
  /** Stat changes by Unit id ("A.tamer", "B.m2", …), on top of the Scenario's. */
  readonly stats?: Readonly<Record<string, Partial<Stats>>>
  /** Skill data changes by skill id, on top of data/skills (e.g. a longer range). */
  readonly skills?: Readonly<Record<string, Partial<Skill>>>
  readonly dice?: DiceSource
}

function withStats(team: ScenarioTeam, side: Side, stats: BattleOptions['stats']): ScenarioTeam {
  const edit = <T extends { readonly stats: Stats }>(record: T, id: string): T => ({
    ...record,
    stats: { ...record.stats, ...stats?.[id] },
  })
  const [m1, m2] = team.monsters
  return {
    ...team,
    tamer: edit(team.tamer, `${side}.tamer`),
    monsters: [edit(m1, `${side}.m1`), edit(m2, `${side}.m2`)],
  }
}

/** A Battle on Crossroads (Scenario 1 unless told otherwise), optionally with Units placed or built differently. */
export function scenario1Battle(options: BattleOptions = {}): BattleState {
  const base = options.scenario ?? scenario1
  const team = (side: Side): ScenarioTeam => ({
    ...withStats(base.teams[side], side, options.stats),
    startingTiles: options.tiles?.[side] ?? base.teams[side].startingTiles,
  })
  return createBattle({
    scenario: { ...base, teams: { A: team('A'), B: team('B') } },
    board: gameData.boards.crossroads!,
    species: gameData.species,
    skills: Object.fromEntries(
      Object.entries(gameData.skills).map(([id, skill]) => [id, { ...skill, ...options.skills?.[id] }]),
    ),
    dice: options.dice ?? { seed: '0123456789abcdef' },
  })
}

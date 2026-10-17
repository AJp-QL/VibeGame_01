import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyAction, createBattle, decidingSide, type Action, type BattleEvent, type BattleState } from '@mt/engine'
import { loadGameData, type Board, type Side } from '@mt/shared'
import { chooseAction, createAi, type AiProfile, type AiState } from '../src/index.ts'

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

export const gameData = loadGameData(readDataDir())

/** A 9x9 Board for tests of other Board sizes (phase 1.x ticket 13): loaded through the real schema, not part of data/. */
export const arena = loadGameData({
  ...readDataDir(),
  'boards/arena.json': {
    id: 'arena',
    name: 'Arena',
    rows: ['.........', '..F......', '.........', '.........', '....W....', '.........', '.........', '......F..', '.........'],
  },
}).boards.arena!

export function newBattle(scenarioId: string, boardId: string, seed: string, boardOverride?: Board): BattleState {
  const scenario = gameData.scenarios[scenarioId]
  const board = boardOverride ?? gameData.boards[boardId]
  if (scenario === undefined || board === undefined) throw new Error(`No ${scenarioId} / ${boardId}`)
  return createBattle({
    scenario,
    board,
    species: gameData.species,
    skills: gameData.skills,
    statuses: gameData.statuses,
    elementWheel: gameData.elementWheel,
    dice: { seed },
  })
}

export interface PlayedBattle {
  readonly initial: BattleState
  readonly final: BattleState
  readonly actions: readonly Action[]
  readonly events: readonly BattleEvent[]
  /** For each action: whether it was in legalActions of the state it was chosen in (checked only with `checkLegal`). */
  readonly illegal: readonly { index: number; action: Action }[]
}

/** Both sides AI: play until the Battle is over. */
export function playBattle(
  initial: BattleState,
  profiles: Readonly<Record<Side, AiProfile>>,
  options: { checkLegal?: (state: BattleState, action: Action) => boolean; maxActions?: number } = {},
): PlayedBattle {
  let state = initial
  const ais: Record<Side, AiState> = { A: createAi(initial, 'A', profiles.A), B: createAi(initial, 'B', profiles.B) }
  const actions: Action[] = []
  const events: BattleEvent[] = []
  const illegal: { index: number; action: Action }[] = []
  const max = options.maxActions ?? 5000
  while (state.outcome === null) {
    if (actions.length >= max) throw new Error(`No outcome after ${max} actions`)
    const side = decidingSide(state)
    const choice = chooseAction(state, ais[side])
    ais[side] = choice.ai
    if (options.checkLegal !== undefined && !options.checkLegal(state, choice.action)) {
      illegal.push({ index: actions.length, action: choice.action })
    }
    const result = applyAction(state, choice.action)
    if (!result.ok) throw new Error(`AI action rejected: ${JSON.stringify(choice.action)}: ${result.rejection.message}`)
    actions.push(choice.action)
    events.push(...result.events)
    state = result.state
  }
  return { initial, final: state, actions, events, illegal }
}

/** Dice Seed number i as 16 hex digits. */
export function seedOf(i: number): string {
  return (BigInt(i) * 0x9e3779b97f4a7c15n & 0xffffffffffffffffn).toString(16).padStart(16, '0')
}

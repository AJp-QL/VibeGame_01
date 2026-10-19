import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData } from '@mt/shared'
import { createBattle } from '@mt/engine'
import {
  battleSetup,
  canStart,
  defaultChoice,
  aiOpponent,
  isModeAvailable,
  menuBoards,
  menuScenarios,
  type BattleChoice,
} from '../src/battleChoice.ts'

const DATA_DIR = fileURLToPath(new URL('../../../data/', import.meta.url))

function gameData() {
  const files: Record<string, unknown> = {}
  for (const entry of readdirSync(DATA_DIR, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const fullPath = join(entry.parentPath, entry.name)
    files[relative(DATA_DIR, fullPath).split(sep).join('/')] = JSON.parse(readFileSync(fullPath, 'utf8'))
  }
  return loadGameData(files)
}

const data = gameData()
const SEED = '0123456789abcdef'

describe('menu: what it offers (spec user stories 8–9)', () => {
  it('offers Scenario 1 (early game) and Scenario 2 (mid game), in id order', () => {
    expect(menuScenarios(data).map((s) => s.id)).toEqual(['scenario_1', 'scenario_2'])
  })

  it('offers every Board in data/, in id order', () => {
    const boards = menuBoards(data)
    expect(boards.map((b) => b.id)).toEqual(['crossroads', 'grand_crossroads', 'shallows', 'wide_shallows'])
  })

  it('starts on Scenario 1, its own Board, Hotseat, human as team A', () => {
    expect(defaultChoice(data)).toEqual({ scenarioId: 'scenario_1', boardId: 'crossroads', mode: 'hotseat', humanSide: 'A' })
  })

  it('starts "vs AI" with the team chosen: the AI plays the other team (ticket 15)', () => {
    expect(isModeAvailable('hotseat')).toBe(true)
    expect(isModeAvailable('ai')).toBe(true)
    const vsAi: BattleChoice = { ...defaultChoice(data), mode: 'ai', humanSide: 'B' }
    expect(canStart(data, vsAi)).toBe(true)
    expect(battleSetup(data, vsAi, SEED).dice).toEqual({ seed: SEED })
    expect(aiOpponent(vsAi)?.side).toBe('A')
    expect(aiOpponent({ ...vsAi, humanSide: 'A' })?.side).toBe('B')
    expect(aiOpponent(defaultChoice(data))).toBeUndefined()
  })

  it('cannot start a Scenario or Board that is not in data/', () => {
    expect(canStart(data, { ...defaultChoice(data), boardId: 'nowhere' })).toBe(false)
    expect(canStart(data, { ...defaultChoice(data), scenarioId: 'scenario_9' })).toBe(false)
  })
})

describe('menu: starting a Battle uses the choices', () => {
  for (const scenario of ['scenario_1', 'scenario_2']) {
    for (const board of ['crossroads', 'grand_crossroads', 'shallows', 'wide_shallows']) {
      it(`${scenario} on ${board}`, () => {
        const choice: BattleChoice = { scenarioId: scenario, boardId: board, mode: 'hotseat', humanSide: 'A' }
        expect(canStart(data, choice)).toBe(true)
        const state = createBattle(battleSetup(data, choice, SEED))
        expect(state.phase).toBe('deployment')
        expect([state.scenarioId, state.boardId]).toEqual([scenario, board])
        expect(state.terrain).toEqual(data.boards[board]!.terrain)
      })
    }
  }

  it('Scenario 2 brings the mid-game Units: Tamer Level 6, Monsters 4 Star', () => {
    const state = createBattle(battleSetup(data, { ...defaultChoice(data), scenarioId: 'scenario_2' }, SEED))
    const roster = state.deployment?.roster ?? []
    expect(roster.map((u) => (u.kind === 'tamer' ? `${u.id} Level ${u.level}` : `${u.id} ${u.star} Star`))).toEqual([
      'A.tamer Level 6',
      'A.m1 4 Star',
      'A.m2 4 Star',
      'B.tamer Level 6',
      'B.m1 4 Star',
      'B.m2 4 Star',
    ])
  })
})

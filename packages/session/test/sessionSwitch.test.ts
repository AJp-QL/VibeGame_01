import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, tileFromName, type Side } from '@mt/shared'
import { createBattle, type BattleSetup } from '@mt/engine'
import { actionAtStake, createBattleSession, movedWithoutAction } from '../src/index.ts'

// What the UI needs to warn before an Action is thrown away (spec user stories 28-31):
// the Unit playing now when it can still use its Action, and the Units that moved
// but have not used their Action. Both come from the engine's legal actions.

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
const TILES: Readonly<Record<Side, readonly [string, string, string]>> = { A: ['a1', 'd4', 'g1'], B: ['a7', 'd5', 'g7'] }

function newSession() {
  const tiles = (side: Side) => {
    const [tamer, m1, m2] = TILES[side].map(tileFromName)
    return [tamer!, m1!, m2!] as const
  }
  const setup: BattleSetup = {
    scenario: data.scenarios.scenario_1!,
    board: data.boards.crossroads!,
    species: data.species,
    skills: data.skills,
    statuses: data.statuses,
    elementWheel: data.elementWheel,
    dice: { seed: '0123456789abcdef' },
    preset: { tiles: { A: tiles('A'), B: tiles('B') }, firstSide: 'A' as const },
  }
  return createBattleSession(createBattle(setup))
}

describe('BattleSession: an Action at stake when another Unit starts', () => {
  it('at the start of a Turn nobody is playing, so nothing is at stake', () => {
    const snapshot = newSession().getSnapshot()
    expect(snapshot.actionAtStake).toBeNull()
    expect(snapshot.movedWithoutAction).toEqual([])
  })

  it('a Unit that moved can still act: its Action is at stake, and End Turn lists it', () => {
    const session = newSession()
    session.selectUnit('A.m1')
    const to = session.getSnapshot().reachable[0]
    if (to === undefined) throw new Error('Fangrel has no tile to move to')
    session.input({ type: 'tapTile', tile: to })
    const snapshot = session.getSnapshot()
    expect(snapshot.state.activations.current).toBe('A.m1')
    expect(snapshot.actionAtStake).toBe('A.m1')
    expect(snapshot.movedWithoutAction).toEqual(['A.m1'])
    expect(actionAtStake(snapshot.state)).toBe('A.m1')
    expect(movedWithoutAction(snapshot.state)).toEqual(['A.m1'])
  })

  it('a Unit that has used its Action has nothing at stake, whether it moved or not', () => {
    const session = newSession()
    session.selectUnit('A.m1')
    session.defend()
    const snapshot = session.getSnapshot()
    expect(snapshot.state.activations.current).toBe('A.m1')
    expect(snapshot.actionAtStake).toBeNull()
    expect(snapshot.movedWithoutAction).toEqual([])
  })

  it('a Unit that moved and then used its Action is not listed either', () => {
    const session = newSession()
    session.selectUnit('A.m1')
    const to = session.getSnapshot().reachable[0]
    if (to === undefined) throw new Error('Fangrel has no tile to move to')
    session.input({ type: 'tapTile', tile: to })
    session.defend()
    const snapshot = session.getSnapshot()
    expect(snapshot.actionAtStake).toBeNull()
    expect(snapshot.movedWithoutAction).toEqual([])
  })

  it('a Monster that has not started is not "at stake": only the Unit playing now is', () => {
    const session = newSession()
    session.selectUnit('A.m2')
    const snapshot = session.getSnapshot()
    expect(snapshot.actionAtStake).toBeNull()
    expect(snapshot.movedWithoutAction).toEqual([])
  })

  it('the other side has none of it during a Turn that is not theirs, and a new Turn clears it', () => {
    const session = newSession()
    session.selectUnit('A.m1')
    const to = session.getSnapshot().reachable[0]
    if (to === undefined) throw new Error('Fangrel has no tile to move to')
    session.input({ type: 'tapTile', tile: to })
    session.endTurn()
    session.continueHotseat()
    const snapshot = session.getSnapshot()
    expect(snapshot.state.sideToAct).toBe('B')
    expect(snapshot.actionAtStake).toBeNull()
    expect(snapshot.movedWithoutAction).toEqual([])
  })
})

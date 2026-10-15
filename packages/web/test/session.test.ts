import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, tileFromName, tileName } from '@mt/shared'
import { createBattle, legalActions } from '@mt/engine'
import { createBattleSession } from '../src/session.ts'

// The session holds no rules: tapping reproduces what the engine says.

const DATA_DIR = fileURLToPath(new URL('../../../data/', import.meta.url))

function newSession() {
  const files: Record<string, unknown> = {}
  for (const entry of readdirSync(DATA_DIR, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue
    const fullPath = join(entry.parentPath, entry.name)
    files[relative(DATA_DIR, fullPath).split(sep).join('/')] = JSON.parse(readFileSync(fullPath, 'utf8'))
  }
  const data = loadGameData(files)
  const state = createBattle({
    scenario: data.scenarios.scenario_1!,
    board: data.boards.crossroads!,
    species: data.species,
    dice: { seed: '0123456789abcdef' },
  })
  return createBattleSession(state)
}

describe('BattleSession (tap Unit → see reachable tiles → tap tile)', () => {
  it('selecting a Unit of the side to act shows exactly its legal Moves', () => {
    const session = newSession()
    session.input({ type: 'tapUnit', unit: 'A.m1' })
    const { state, selectedUnit, reachable } = session.getSnapshot()
    const legal = legalActions(state).flatMap((a) => (a.type === 'move' && a.unit === 'A.m1' ? [tileName(a.to)] : []))
    expect(selectedUnit).toBe('A.m1')
    expect(reachable.map(tileName).sort()).toEqual(legal.sort())
  })

  it('tapping a reachable tile moves the Unit and notifies subscribers', () => {
    const session = newSession()
    let notified = 0
    session.subscribe(() => notified++)
    session.input({ type: 'tapUnit', unit: 'A.m1' })
    session.input({ type: 'tapTile', tile: tileFromName('c4') })
    const snapshot = session.getSnapshot()
    expect(snapshot.state.units.find((u) => u.id === 'A.m1')?.tile).toEqual(tileFromName('c4'))
    expect(snapshot.events).toMatchObject([{ type: 'unitMoved', unit: 'A.m1' }])
    expect(snapshot.revision).toBe(1)
    expect(snapshot.selectedUnit).toBeNull()
    expect(notified).toBe(2)
  })

  it('tapping a Unit of the other side or an unreachable tile selects nothing', () => {
    const session = newSession()
    session.input({ type: 'tapUnit', unit: 'B.m2' })
    expect(session.getSnapshot().selectedUnit).toBeNull()
    session.input({ type: 'tapUnit', unit: 'A.m1' })
    session.input({ type: 'tapTile', tile: tileFromName('c7') })
    expect(session.getSnapshot()).toMatchObject({ selectedUnit: null, revision: 0 })
  })

  it('End Turn hands the Turn to the other side', () => {
    const session = newSession()
    session.endTurn()
    expect(session.getSnapshot().state.sideToAct).toBe('B')
    expect(session.getSnapshot().log.map((e) => e.type)).toEqual(['turnEnded', 'turnStarted'])
  })
})

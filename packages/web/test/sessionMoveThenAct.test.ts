import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, tileFromName, type Side } from '@mt/shared'
import { createBattle } from '@mt/engine'
import { createBattleSession } from '../src/session.ts'

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

// Fangrel (A.m1) on d5, two tiles from Tamer B on d7: one Move brings it next to it.
const TILES: Readonly<Record<Side, readonly [string, string, string]>> = { A: ['c4', 'd5', 'g1'], B: ['d7', 'a5', 'g7'] }

function playingSession() {
  const tiles = (side: Side) => {
    const [tamer, m1, m2] = TILES[side].map(tileFromName)
    return [tamer!, m1!, m2!] as const
  }
  return createBattleSession(
    createBattle({
      scenario: data.scenarios.scenario_1!,
      board: data.boards.crossroads!,
      species: data.species,
      skills: data.skills,
      statuses: data.statuses,
      elementWheel: data.elementWheel,
      dice: { rolls: [15, 4] },
      preset: { tiles: { A: tiles('A'), B: tiles('B') }, firstSide: 'A' },
      inspiration: { A: false, B: false },
    }),
  )
}

describe('BattleSession: Move then Action (rules §17: each Unit gets a Move and an Action)', () => {
  it('after a Move the Unit stays selected with its attack and skills available', () => {
    const s = playingSession()
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    s.input({ type: 'tapTile', tile: tileFromName('d6') })
    const snapshot = s.getSnapshot()
    expect(snapshot.log.at(-1)).toMatchObject({ type: 'unitMoved', unit: 'A.m1' })
    expect(snapshot.selectedUnit).toBe('A.m1')
    expect(snapshot.canAttack).toBe(true)
    expect(snapshot.skills.filter((b) => b.usable).map((b) => b.skill)).toContain('heavy_blow')
  })

  it('the attack after the Move goes through, and a Unit with nothing left to do is deselected', () => {
    const s = playingSession()
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    s.input({ type: 'tapTile', tile: tileFromName('d6') })
    s.chooseAttack()
    s.input({ type: 'tapUnit', unit: 'B.tamer' })
    s.confirmAttack()
    const snapshot = s.getSnapshot()
    expect(snapshot.actions.map((a) => a.type)).toEqual(['move', 'basicAttack'])
    expect(snapshot.selectedUnit).toBeNull()
  })

  it('after an Action first, the Unit stays selected so it can still Move', () => {
    const s = playingSession()
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    s.chooseSkill('pack_howl')
    s.confirmAttack()
    const snapshot = s.getSnapshot()
    expect(snapshot.selectedUnit).toBe('A.m1')
    expect(snapshot.reachable.length).toBeGreaterThan(0)
  })
})

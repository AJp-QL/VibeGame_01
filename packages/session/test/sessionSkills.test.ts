import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, tileFromName, tileName, type Side } from '@mt/shared'
import { createBattle, previewAction, type DiceSource } from '@mt/engine'
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

type Tiles = Readonly<Record<Side, readonly [string, string, string]>>

// Fangrel (A.m1) on d6 next to Tamer B on d7 (no Monster of team B next to it);
// Fangrel's Tamer on c6 next to it.
const NEAR: Tiles = { A: ['c6', 'd6', 'g1'], B: ['d7', 'a5', 'g7'] }

/** A Battle in play, Turn 1 of team A, Units on NEAR. */
function playingSession(dice: DiceSource = { seed: '0123456789abcdef' }) {
  const tiles = (side: Side) => {
    const [tamer, m1, m2] = NEAR[side].map(tileFromName)
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
      dice,
      preset: { tiles: { A: tiles('A'), B: tiles('B') }, firstSide: 'A' },
      // Inspiration has its own tests (sessionInspiration.test.ts): no pauses here.
      inspiration: { A: false, B: false },
    }),
  )
}

describe('BattleSession: skills (rules §13, §15)', () => {
  it('the selected Unit shows its loadout with cooldowns from the engine', () => {
    const s = playingSession()
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    expect(s.getSnapshot().skills.map((b) => [b.skill, b.cooldown, b.usable])).toEqual([
      ['heavy_blow', 0, true],
      ['rend', 0, true],
      ['hit_and_run', 0, true],
      ['pack_howl', 0, true],
    ])
    s.input({ type: 'tapUnit', unit: 'A.m2' })
    // Wispling on g1: every enemy is 6 away, so only Blink can be used.
    expect(s.getSnapshot().skills.map((b) => [b.skill, b.implemented, b.usable])).toEqual([
      ['element_bolt', true, false],
      ['burst', true, false],
      ['hex', true, false],
      ['blink', true, true],
    ])
  })

  it('choose a skill → its targets light up → tap one → engine preview → confirm; then it shows its cooldown', () => {
    const s = playingSession({ rolls: [10, 3, 5] })
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    s.chooseSkill('heavy_blow')
    expect(s.getSnapshot()).toMatchObject({ mode: 'skill', pendingSkill: 'heavy_blow', reachable: [] })
    expect(s.getSnapshot().targets.map(tileName)).toEqual(['d7'])
    s.input({ type: 'tapUnit', unit: 'B.tamer' })
    const snapshot = s.getSnapshot()
    const action = { type: 'useSkill', unit: 'A.m1', skill: 'heavy_blow', target: 'B.tamer' } as const
    const expected = previewAction(snapshot.state, action)
    expect(snapshot.ready).toEqual(action)
    expect(expected.ok && snapshot.preview).toEqual(expected.ok && expected.preview)
    s.confirmAttack()
    expect(s.getSnapshot().log.map((e) => e.type)).toEqual(['skillUsed', 'attackRolled', 'damageDealt'])
    expect(s.getSnapshot().actions).toEqual([action])
    // Still selected (it can Move): the skill now shows its cooldown.
    expect(s.getSnapshot().selectedUnit).toBe('A.m1')
    expect(s.getSnapshot().skills.find((b) => b.skill === 'heavy_blow')).toMatchObject({ cooldown: 2, usable: false })
  })

  it('cancel steps back out of a skill without acting', () => {
    const s = playingSession()
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    s.chooseSkill('rend')
    s.input({ type: 'tapUnit', unit: 'B.tamer' })
    expect(s.getSnapshot().preview).toMatchObject({ type: 'attack', skill: 'rend', statuses: [{ status: 'bleed' }] })
    s.cancel()
    expect(s.getSnapshot()).toMatchObject({ mode: 'skill', pendingTarget: null, preview: null })
    s.cancel()
    expect(s.getSnapshot()).toMatchObject({ mode: 'move', pendingSkill: null, selectedUnit: 'A.m1', revision: 0 })
  })

  it('a skill without a target (Pack Howl) previews as soon as it is chosen', () => {
    const s = playingSession()
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    s.chooseSkill('pack_howl')
    expect(s.getSnapshot().preview).toEqual({
      type: 'effect',
      skill: 'pack_howl',
      user: 'A.m1',
      units: ['A.tamer', 'A.m1'],
      statuses: ['rallied'],
    })
    s.confirmAttack()
    const units = s.getSnapshot().state.units
    expect(units.find((u) => u.id === 'A.tamer')?.statuses).toEqual([{ id: 'rallied', turnsLeft: 2, skipCountdown: true }])
  })

  it('after Hit and Run the step tiles light up; tapping one steps, and the Unit can still Move', () => {
    const s = playingSession({ rolls: [12, 5] })
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    s.chooseSkill('hit_and_run')
    s.input({ type: 'tapUnit', unit: 'B.tamer' })
    s.confirmAttack()
    let snapshot = s.getSnapshot()
    expect(snapshot.state.pending).toMatchObject({ kind: 'retreat', unit: 'A.m1' })
    expect(snapshot.selectedUnit).toBe('A.m1')
    // Empty neighbours of d6 in reading order (c6 holds Tamer A, d7 Tamer B).
    expect(snapshot.reachable.map(tileName)).toEqual(['c5', 'd5', 'e5', 'e6', 'c7', 'e7'])
    s.endTurn()
    expect(s.getSnapshot().rejection).toBe('decision-pending')
    s.input({ type: 'tapTile', tile: tileFromName('d5') })
    snapshot = s.getSnapshot()
    expect(snapshot.log.at(-1)).toEqual({ type: 'unitRetreated', unit: 'A.m1', from: tileFromName('d6'), to: tileFromName('d5') })
    expect(snapshot.selectedUnit).toBe('A.m1')
    expect(snapshot.reachable.length).toBeGreaterThan(0)
  })

  it('"stay" answers the step without moving', () => {
    const s = playingSession({ rolls: [2] })
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    s.chooseSkill('hit_and_run')
    s.input({ type: 'tapUnit', unit: 'B.tamer' })
    s.confirmAttack()
    s.stayInPlace()
    expect(s.getSnapshot().log.at(-1)).toEqual({ type: 'retreatDeclined', unit: 'A.m1' })
    expect(s.getSnapshot().state.pending).toBeNull()
  })

  it('tapping a Unit of the other side shows its card (statuses) without selecting it', () => {
    const s = playingSession()
    s.input({ type: 'tapUnit', unit: 'B.m1' })
    expect(s.getSnapshot()).toMatchObject({ selectedUnit: null, inspectedUnit: 'B.m1' })
    s.cancel()
    expect(s.getSnapshot().inspectedUnit).toBeNull()
  })
})

import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, tileFromName, tileName, type Side } from '@mt/shared'
import { createBattle, previewAction, type Action, type DiceSource } from '@mt/engine'
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
const t = tileFromName

// Wispling (A.m2) on d2, Fangrel (A.m1) on c3, Tamer A on a1;
// Tidewall (B.m1) on d4, Quillfox (B.m2) on e5, Tamer B on g7.
const TILES: Readonly<Record<Side, readonly [string, string, string]>> = { A: ['a1', 'c3', 'd2'], B: ['g7', 'd4', 'e5'] }

function playingSession(dice: DiceSource = { seed: '0123456789abcdef' }) {
  const tiles = (side: Side) => {
    const [tamer, m1, m2] = TILES[side].map(t)
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
      inspiration: { A: false, B: false },
    }),
  )
}

describe('BattleSession: Burst (centre → targets in order → preview per target → confirm)', () => {
  it('lights up the centres, then the area and the enemies in it; targets are taken in the order tapped', () => {
    const s = playingSession()
    s.input({ type: 'tapUnit', unit: 'A.m2' })
    s.chooseSkill('burst')
    let snap = s.getSnapshot()
    expect(snap).toMatchObject({ mode: 'skill', pendingSkill: 'burst', pendingTile: null, area: [], targets: [], ready: null })
    expect(snap.tileChoices.map(tileName)).toContain('d4')
    expect(snap.tileChoices.map(tileName)).not.toContain('d2') // no enemy next to Wispling

    // Tidewall stands on d4: tapping it picks its tile as the centre.
    s.input({ type: 'tapUnit', unit: 'B.m1' })
    snap = s.getSnapshot()
    expect(snap.pendingTile).toEqual(t('d4'))
    expect(snap.tileChoices).toEqual([])
    expect(snap.area.map(tileName)).toEqual(['c3', 'd3', 'e3', 'c4', 'd4', 'e4', 'c5', 'd5', 'e5'])
    // Fangrel on c3 is in the area but never a target.
    expect(snap.targets.map(tileName)).toEqual(['d4', 'e5'])
    expect(snap.ready).toBeNull()

    s.input({ type: 'tapUnit', unit: 'B.m2' })
    snap = s.getSnapshot()
    expect(snap.chosenTargets).toEqual(['B.m2'])
    expect(snap.targets.map(tileName)).toEqual(['d4'])
    expect(snap.preview).toMatchObject({ type: 'area', attacks: [{ target: 'B.m2' }] })

    s.input({ type: 'tapUnit', unit: 'B.m1' })
    snap = s.getSnapshot()
    const action: Action = { type: 'useSkill', unit: 'A.m2', skill: 'burst', tile: t('d4'), targets: ['B.m2', 'B.m1'] }
    expect(snap.chosenTargets).toEqual(['B.m2', 'B.m1'])
    expect(snap.targets).toEqual([]) // 2 chosen: no more
    expect(snap.ready).toEqual(action)
    const expected = previewAction(snap.state, action)
    expect(expected.ok && snap.preview).toEqual(expected.ok && expected.preview)

    s.confirmAttack()
    snap = s.getSnapshot()
    expect(snap.actions).toEqual([action])
    expect(snap.log[0]).toEqual({ type: 'skillUsed', unit: 'A.m2', skill: 'burst', targets: ['B.m2', 'B.m1'], tile: t('d4') })
    expect(snap.log.flatMap((e) => (e.type === 'attackRolled' ? [e.target] : []))).toEqual(['B.m2', 'B.m1'])
    expect(snap).toMatchObject({ mode: 'move', pendingTile: null, chosenTargets: [], area: [] })
  })

  it('tapping a chosen target drops it; Cancel steps back one choice at a time', () => {
    const s = playingSession()
    s.input({ type: 'tapUnit', unit: 'A.m2' })
    s.chooseSkill('burst')
    s.input({ type: 'tapTile', tile: t('e4') }) // an empty centre
    expect(s.getSnapshot().pendingTile).toEqual(t('e4'))
    s.input({ type: 'tapUnit', unit: 'B.m1' })
    s.input({ type: 'tapUnit', unit: 'B.m2' })
    s.input({ type: 'tapUnit', unit: 'B.m1' }) // drops Tidewall and everything after it
    expect(s.getSnapshot().chosenTargets).toEqual([])
    s.input({ type: 'tapUnit', unit: 'B.m2' })
    s.cancel()
    expect(s.getSnapshot()).toMatchObject({ chosenTargets: [], pendingTile: t('e4'), mode: 'skill' })
    s.cancel()
    expect(s.getSnapshot()).toMatchObject({ pendingTile: null, mode: 'skill' })
    expect(s.getSnapshot().tileChoices.length).toBeGreaterThan(0)
    s.cancel()
    expect(s.getSnapshot()).toMatchObject({ mode: 'move', pendingSkill: null, selectedUnit: 'A.m2', revision: 0 })
  })

  it('tapping another centre after one was picked starts over from it', () => {
    const s = playingSession()
    s.input({ type: 'tapUnit', unit: 'A.m2' })
    s.chooseSkill('burst')
    s.input({ type: 'tapTile', tile: t('e4') })
    s.input({ type: 'tapUnit', unit: 'B.m2' })
    s.input({ type: 'tapTile', tile: t('d5') })
    expect(s.getSnapshot()).toMatchObject({ pendingTile: t('d5'), chosenTargets: [] })
  })
})

describe('BattleSession: Blink (destination → preview → confirm)', () => {
  it('lights up the empty tiles 1–2 away; the teleport uses the Move, the Action stays', () => {
    const s = playingSession()
    s.input({ type: 'tapUnit', unit: 'A.m2' })
    s.chooseSkill('blink')
    let snap = s.getSnapshot()
    expect(snap.tileChoices.map(tileName)).toContain('f3')
    expect(snap.tileChoices.map(tileName)).not.toContain('d4') // Tidewall
    expect(snap.tileChoices.map(tileName)).not.toContain('g2') // 3 away
    s.input({ type: 'tapTile', tile: t('f3') })
    snap = s.getSnapshot()
    expect(snap.ready).toEqual({ type: 'useSkill', unit: 'A.m2', skill: 'blink', tile: t('f3') })
    expect(snap.preview).toEqual({ type: 'effect', skill: 'blink', user: 'A.m2', units: ['A.m2'], statuses: [] })
    s.confirmAttack()
    snap = s.getSnapshot()
    expect(snap.log.at(-1)).toEqual({ type: 'unitTeleported', unit: 'A.m2', skill: 'blink', from: t('d2'), to: t('f3') })
    // Still selected: it has its Action left.
    expect(snap.selectedUnit).toBe('A.m2')
    expect(snap.reachable).toEqual([])
    expect(snap.skills.map((b) => [b.skill, b.usable])).toEqual([
      ['element_bolt', true],
      ['burst', true],
      ['hex', true],
      ['blink', false],
    ])
  })
})

import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, tileFromName, type ScenarioTeam, type Side } from '@mt/shared'
import { createBattle, type DiceSource } from '@mt/engine'
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

// Quillfox (B.m2) on e7 (forest), Tidewall (B.m1) on f3 next to Fangrel (A.m1, e4),
// Wispling (A.m2) on c3, 4 from Quillfox. Every Monster mountain (neutral everywhere here).
const TILES: Readonly<Record<Side, readonly [string, string, string]>> = { A: ['a1', 'e4', 'c3'], B: ['g7', 'f3', 'e7'] }

/** Team B (Quillfox) plays first. */
function session(dice: DiceSource) {
  const tiles = (side: Side) => {
    const [tamer, m1, m2] = TILES[side].map(tileFromName)
    return [tamer!, m1!, m2!] as const
  }
  const mountain = (team: ScenarioTeam): ScenarioTeam => {
    const [m1, m2] = team.monsters
    return { ...team, monsters: [{ ...m1, element: 'mountain' }, { ...m2, element: 'mountain' }] }
  }
  const scenario = data.scenarios.scenario_1!
  return createBattleSession(
    createBattle({
      scenario: { ...scenario, teams: { A: mountain(scenario.teams.A), B: mountain(scenario.teams.B) } },
      board: data.boards.crossroads!,
      species: data.species,
      skills: data.skills,
      statuses: data.statuses,
      elementWheel: data.elementWheel,
      dice,
      preset: { tiles: { A: tiles('A'), B: tiles('B') }, firstSide: 'B' },
      inspiration: { A: false, B: false },
    }),
  )
}

describe('BattleSession: Quillfox (ticket 10)', () => {
  it("lists Quillfox's four skills as usable", () => {
    const s = session({ rolls: [] })
    s.input({ type: 'tapUnit', unit: 'B.m2' })
    expect(s.getSnapshot().skills.map((b) => [b.skill, b.implemented, b.usable])).toEqual([
      ['long_shot', true, true],
      ['pin', true, true],
      ['mark', true, true],
      ['camouflage', true, true],
    ])
  })

  it('Camouflage previews at once (no target), then Quillfox is Hidden', () => {
    const s = session({ rolls: [] })
    s.input({ type: 'tapUnit', unit: 'B.m2' })
    s.chooseSkill('camouflage')
    expect(s.getSnapshot().preview).toMatchObject({ type: 'effect', skill: 'camouflage', statuses: ['hidden'] })
    s.confirmAttack()
    expect(s.getSnapshot().units.find((u) => u.id === 'B.m2')?.statuses).toEqual([{ id: 'hidden', whileOn: 'forest' }])
  })

  it('Camouflage is free (ticket 27, D-28): Quillfox stays selected and can still Move and use Long Shot', () => {
    const s = session({ rolls: [15, 4] })
    s.input({ type: 'tapUnit', unit: 'B.m2' })
    s.chooseSkill('camouflage')
    s.confirmAttack()
    const after = s.getSnapshot()
    expect(after.selectedUnit).toBe('B.m2')
    expect(after.skills.map((b) => [b.skill, b.usable])).toEqual([
      ['long_shot', true],
      ['pin', true],
      ['mark', true],
      ['camouflage', false],
    ])
    expect(after.skills.find((b) => b.skill === 'camouflage')).toMatchObject({ free: true, usedThisActivation: true, cooldown: 0 })
    expect(after.reachable.length).toBeGreaterThan(0)
    s.chooseSkill('long_shot')
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    s.confirmAttack()
    // The attack roll ended Hidden; Camouflage was already used this activation.
    expect(s.getSnapshot().units.find((u) => u.id === 'B.m2')?.statuses).toEqual([])
  })

  it('act, then hide: after Long Shot Quillfox stays selected with Camouflage usable', () => {
    const s = session({ rolls: [15, 4] })
    s.input({ type: 'tapUnit', unit: 'B.m2' })
    s.chooseSkill('long_shot')
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    s.confirmAttack()
    const after = s.getSnapshot()
    expect(after.selectedUnit).toBe('B.m2')
    expect(after.skills.find((b) => b.skill === 'camouflage')).toMatchObject({ usable: true, free: true, usedThisActivation: false })
    expect(after.skills.find((b) => b.skill === 'long_shot')?.usable).toBe(false)
    s.chooseSkill('camouflage')
    s.confirmAttack()
    expect(s.getSnapshot().units.find((u) => u.id === 'B.m2')?.statuses).toEqual([{ id: 'hidden', whileOn: 'forest' }])
    // Move left: still selected; Hidden ends if it walks off forest.
    expect(s.getSnapshot().selectedUnit).toBe('B.m2')
  })

  it('a Hidden enemy 2 or more tiles away is shown as not selectable, with the reason', () => {
    const s = session({ rolls: [] })
    s.input({ type: 'tapUnit', unit: 'B.m2' })
    s.chooseSkill('camouflage')
    s.confirmAttack()
    s.endTurn()
    s.input({ type: 'tapUnit', unit: 'A.m2' })
    s.chooseSkill('element_bolt')
    const snapshot = s.getSnapshot()
    expect(snapshot.blocked).toEqual([{ unit: 'B.m2', tile: tileFromName('e7'), reason: 'target-hidden', blockedBy: [] }])
    expect(snapshot.blockedTargets).toEqual([tileFromName('e7')])
    expect(snapshot.targets).not.toContainEqual(tileFromName('e7'))
    // Tapping it says why instead of dropping the selection.
    s.input({ type: 'tapUnit', unit: 'B.m2' })
    expect(s.getSnapshot()).toMatchObject({ rejection: 'target-hidden', selectedUnit: 'A.m2', preview: null })
  })

  it('Burst: a Hidden enemy in the area is shown as not selectable, with the reason (ticket 17)', () => {
    const s = session({ rolls: [] })
    s.input({ type: 'tapUnit', unit: 'B.m2' })
    s.chooseSkill('camouflage')
    s.confirmAttack()
    s.endTurn()
    s.input({ type: 'tapUnit', unit: 'A.m2' })
    s.chooseSkill('burst')
    const e7 = tileFromName('e7')!
    const centre = s.getSnapshot().tileChoices.find((t) => Math.max(Math.abs(t.x - e7.x), Math.abs(t.y - e7.y)) <= 1)
    if (centre === undefined) throw new Error('expected a Burst centre next to e7')
    s.input({ type: 'tapTile', tile: centre })
    const snapshot = s.getSnapshot()
    expect(snapshot.blocked).toContainEqual({ unit: 'B.m2', tile: e7, reason: 'target-hidden', blockedBy: [] })
    expect(snapshot.blockedTargets).toContainEqual(e7)
    expect(snapshot.targets).not.toContainEqual(e7)
    // Tapping it says why and keeps the centre.
    s.input({ type: 'tapUnit', unit: 'B.m2' })
    expect(s.getSnapshot()).toMatchObject({ rejection: 'target-hidden', selectedUnit: 'A.m2', pendingTile: centre, chosenTargets: [] })
  })

  it('after a Mark hits, an ally attacking the Marked Unit previews advantage from Marked', () => {
    const s = session({ rolls: [12] })
    s.input({ type: 'tapUnit', unit: 'B.m2' })
    s.chooseSkill('mark')
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    expect(s.getSnapshot().preview).toMatchObject({ type: 'attack', skill: 'mark', damage: null })
    s.confirmAttack()
    s.input({ type: 'tapUnit', unit: 'B.m1' })
    s.chooseAttack()
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    expect(s.getSnapshot().preview).toMatchObject({
      type: 'attack',
      rollMode: 'advantage',
      rollModeSources: [{ kind: 'status', effect: 'advantage', status: 'marked', holder: 'target' }],
    })
  })
})

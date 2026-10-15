import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadGameData, tileFromName, tileName, type ScenarioTeam, type Side } from '@mt/shared'
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

// Fangrel (A.m1) on d4 between Tidewall (B.m1, d5) and Quillfox (B.m2, c5); every Monster forest (neutral).
const TILES: Readonly<Record<Side, readonly [string, string, string]>> = { A: ['a1', 'd4', 'g1'], B: ['a7', 'd5', 'c5'] }

/** Team B (Tidewall) plays first. */
function session(dice: DiceSource) {
  const tiles = (side: Side) => {
    const [tamer, m1, m2] = TILES[side].map(tileFromName)
    return [tamer!, m1!, m2!] as const
  }
  const forest = (team: ScenarioTeam): ScenarioTeam => {
    const [m1, m2] = team.monsters
    return { ...team, monsters: [{ ...m1, element: 'forest' }, { ...m2, element: 'forest' }] }
  }
  const scenario = data.scenarios.scenario_1!
  return createBattleSession(
    createBattle({
      scenario: { ...scenario, teams: { A: forest(scenario.teams.A), B: forest(scenario.teams.B) } },
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

describe('BattleSession: Tidewall (ticket 08)', () => {
  it('lists Tidewall\'s skills as usable, Pincer Guard as Passive', () => {
    const s = session({ rolls: [] })
    s.input({ type: 'tapUnit', unit: 'B.m1' })
    expect(s.getSnapshot().skills.map((b) => [b.skill, b.implemented, b.usable])).toEqual([
      ['taunt', true, true],
      ['shield_bash', true, true],
      ['counter', true, true],
      ['pincer_guard', false, false],
    ])
  })

  it('Shield Bash through the session: preview, confirm, then the push is in the events and on the Board', () => {
    const s = session({ rolls: [15, 3, 4] })
    s.input({ type: 'tapUnit', unit: 'B.m1' })
    s.chooseSkill('shield_bash')
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    expect(s.getSnapshot().preview).toMatchObject({ type: 'attack', skill: 'shield_bash' })
    s.confirmAttack()
    const snapshot = s.getSnapshot()
    expect(snapshot.events.map((e) => e.type)).toContain('unitPushed')
    expect(tileName(snapshot.units.find((u) => u.id === 'A.m1')!.tile)).toBe('d3')
  })

  it('a Taunted Unit can only aim at its taunter and cannot Defend while it can reach it', () => {
    const s = session({ rolls: [5] })
    s.input({ type: 'tapUnit', unit: 'B.m1' })
    s.chooseSkill('taunt')
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    s.confirmAttack()
    s.endTurn()
    s.input({ type: 'tapUnit', unit: 'A.m1' })
    const snapshot = s.getSnapshot()
    expect(snapshot.canDefend).toBe(false)
    expect(snapshot.skills.find((b) => b.skill === 'pack_howl')?.usable).toBe(false)
    // Quillfox on c5 is next to Fangrel too, but only Tidewall can be attacked.
    s.chooseAttack()
    expect(s.getSnapshot().targets.map(tileName)).toEqual(['d5'])
  })
})

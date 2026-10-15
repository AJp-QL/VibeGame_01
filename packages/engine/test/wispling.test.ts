import { describe, expect, it } from 'vitest'
import { isOnBoard, tileFromName, type Tile } from '@mt/shared'
import {
  applyAction,
  distance,
  legalActions,
  previewAction,
  recordReplay,
  replayBattle,
  unitSkills,
  type Action,
  type ApplyResult,
  type BattleEvent,
  type BattleState,
  type UnitId,
  type UnitStatus,
} from '../src/index.ts'
import { gameData, NEUTRAL_ELEMENTS, scenario1Battle, type BattleOptions } from './fixtures.ts'

// Wispling (A.m2, Flying, 1 Star) on d2: attack +2 (SEN mod +1, proficiency 1),
// INT mod +2, Save DC (INT) 11. Fangrel (A.m1) on b3, Tamer A on a1.
// Tidewall (B.m1) on d4, 2 away: Ward 11 (SPI mod +1), HP 31.
// Quillfox (B.m2) on e5, 3 away: Guard 11 but Ward 9 (SPI mod −1), HP 19.
// Tamer B on g7, 5 away. Every Monster forest (neutral); Ground Units off forest and desert tiles.
const TILES = { A: ['a1', 'b3', 'd2'], B: ['g7', 'd4', 'e5'] } as const

function battle(options: BattleOptions = {}): BattleState {
  return scenario1Battle({ tiles: TILES, elements: NEUTRAL_ELEMENTS, ...options })
}

function accepted(result: ApplyResult): { state: BattleState; events: readonly BattleEvent[] } {
  if (!result.ok) throw new Error(result.rejection.message)
  return result
}

const t = (name: string): Tile => tileFromName(name)
const code = (result: ApplyResult) => (result.ok ? 'accepted' : result.rejection.code)
const unit = (state: BattleState, id: UnitId) => state.units.find((u) => u.id === id)
const rollsUsed = (state: BattleState) => (state.dice.kind === 'scripted' ? state.dice.position : NaN)
const types = (events: readonly BattleEvent[]) => events.map((e) => e.type)
const endTurn = (state: BattleState) => accepted(applyAction(state, { type: 'endTurn' }))

const bolt = (state: BattleState, target: UnitId, user: UnitId = 'A.m2') =>
  applyAction(state, { type: 'useSkill', unit: user, skill: 'element_bolt', target })
const hex = (state: BattleState, target: UnitId) => applyAction(state, { type: 'useSkill', unit: 'A.m2', skill: 'hex', target })
const burstAction = (centre: string, targets: readonly UnitId[], user: UnitId = 'A.m2'): Action => ({
  type: 'useSkill',
  unit: user,
  skill: 'burst',
  tile: t(centre),
  targets,
})
const burst = (state: BattleState, centre: string, targets: readonly UnitId[], user: UnitId = 'A.m2') =>
  applyAction(state, burstAction(centre, targets, user))
const blinkAction = (to: Tile, user: UnitId = 'A.m2'): Action => ({ type: 'useSkill', unit: user, skill: 'blink', tile: to })
const legalUses = (state: BattleState, skill: string, user: UnitId = 'A.m2') =>
  legalActions(state).flatMap((a) => (a.type === 'useSkill' && a.unit === user && a.skill === skill ? [a] : []))

/** The state with `status` put on a Unit directly (a status no landed skill can give yet, e.g. Hidden). */
function withStatus(state: BattleState, id: UnitId, status: UnitStatus): BattleState {
  return { ...state, units: state.units.map((u) => (u.id === id ? { ...u, statuses: [...u.statuses, status] } : u)) }
}

describe('Wispling loadout', () => {
  it('all four skills are in the game now', () => {
    expect(unitSkills(battle(), 'A.m2')).toEqual([
      { skill: 'element_bolt', tier: 'minor', cooldown: 0, spent: false, implemented: true },
      { skill: 'burst', tier: 'major', cooldown: 0, spent: false, implemented: true },
      { skill: 'hex', tier: 'major', cooldown: 0, spent: false, implemented: true },
      { skill: 'blink', tier: 'minor', cooldown: 0, spent: false, implemented: true },
    ])
  })

  it('every legal action is accepted, Wispling skills included', () => {
    const state = battle()
    const actions = legalActions(state)
    for (const skill of ['element_bolt', 'burst', 'hex', 'blink']) expect(legalUses(state, skill).length).toBeGreaterThan(0)
    for (const action of actions) expect(applyAction(state, action).ok, JSON.stringify(action)).toBe(true)
  })
})

describe('Element Bolt: Minor, elemental 1d8, range 4 (rules §10.1, §15.1)', () => {
  it('d20 + SEN mod + proficiency against Ward (not Guard), damage 1d8 + INT mod', () => {
    // Quillfox: Ward 9, Guard 11. 8 + 2 = 10 hits Ward 9 (it would miss Guard 11).
    const { state, events } = accepted(bolt(battle({ dice: { rolls: [8, 5] } }), 'B.m2'))
    expect(events).toEqual([
      { type: 'skillUsed', unit: 'A.m2', skill: 'element_bolt', targets: ['B.m2'] },
      {
        type: 'attackRolled',
        attacker: 'A.m2',
        target: 'B.m2',
        skill: 'element_bolt',
        rollMode: 'normal',
        rolls: [8],
        natural: 8,
        attackBonus: 2,
        total: 10,
        defence: 9,
        defenceKind: 'ward',
        hit: true,
        critical: false,
      },
      // INT mod +2 (POW mod −1 and SEN mod +1 would give other totals).
      {
        type: 'damageDealt',
        source: 'A.m2',
        target: 'B.m2',
        skill: 'element_bolt',
        dice: { count: 1, sides: 8 },
        rolls: [5],
        modifier: 2,
        amount: 7,
        hpBefore: 19,
        hpAfter: 12,
      },
    ])
    expect(unit(state, 'A.m2')).toMatchObject({ hasActed: true, hasMoved: false })
  })

  it('reaches 4: Quillfox at 3 is offered, Tamer B at 5 is out of range', () => {
    const state = battle()
    expect(legalUses(state, 'element_bolt').map((a) => a.target)).toEqual(['B.m1', 'B.m2'])
    expect(code(bolt(state, 'B.tamer'))).toBe('out-of-range')
    expect(code(bolt(state, 'A.m1'))).toBe('not-an-enemy')
  })

  it('uses the element wheel (rules §4.2): mountain Wispling against desert Tidewall has advantage', () => {
    const state = scenario1Battle({ tiles: TILES })
    const result = previewAction(state, { type: 'useSkill', unit: 'A.m2', skill: 'element_bolt', target: 'B.m1' })
    expect(result).toMatchObject({ ok: true, preview: { rollMode: 'advantage', rollModeSources: [{ kind: 'element', effect: 'advantage' }] } })
  })

  it('line of sight (rules §7): Flying Wispling sees over Units; a Ground user with Element Bolt is blocked', () => {
    // Fangrel on d1 with Element Bolt, Wispling on d2 and Tamer A on d3, Tidewall on d4.
    const state = battle({ tiles: { A: ['d3', 'd1', 'd2'], B: TILES.B }, loadouts: { 'A.m1': ['element_bolt'] } })
    expect(bolt(state, 'B.m1', 'A.m1')).toMatchObject({
      ok: false,
      rejection: { code: 'no-line-of-sight', blockedBy: ['A.m2', 'A.tamer'] },
    })
    // Wispling on d2 past Tamer A on d3.
    expect(code(bolt(state, 'B.m1'))).toBe('accepted')
  })

  it('preview: hit chance against Ward, damage range with INT mod; no dice drawn', () => {
    const state = battle({ dice: { rolls: [] } })
    const before = structuredClone(state)
    expect(previewAction(state, { type: 'useSkill', unit: 'A.m2', skill: 'element_bolt', target: 'B.m2' })).toMatchObject({
      ok: true,
      preview: {
        type: 'attack',
        attackBonus: 2,
        defence: 9,
        defenceKind: 'ward',
        hitChance: { numerator: 14, denominator: 20 },
        damage: { dice: { count: 1, sides: 8 }, modifier: 2, min: 3, max: 10 },
        criticalDamage: { dice: { count: 2, sides: 8 }, modifier: 2, min: 4, max: 18 },
      },
    })
    expect(state).toEqual(before)
  })
})

describe('Hex: Major, Weakened 2, save SPI (rules §11, §14.2, §15.1)', () => {
  it('the target saves d20 + SPI mod against the INT Save DC 11; failing gives Weakened 2', () => {
    const { state, events } = accepted(hex(battle({ dice: { rolls: [5] } }), 'B.m1'))
    expect(events).toEqual([
      { type: 'skillUsed', unit: 'A.m2', skill: 'hex', targets: ['B.m1'] },
      {
        type: 'saveRolled',
        unit: 'B.m1',
        source: 'A.m2',
        skill: 'hex',
        status: 'weakened',
        stat: 'spi',
        roll: 5,
        modifier: 1,
        total: 6,
        dc: 11,
        saved: false,
      },
      { type: 'statusApplied', unit: 'B.m1', status: { id: 'weakened', turnsLeft: 2 } },
    ])
    expect(unit(state, 'B.m1')?.statuses).toEqual([{ id: 'weakened', turnsLeft: 2 }])
    expect(unit(state, 'A.m2')?.skillsUsed).toEqual({ hex: 1 })
  })

  it('a save that reaches the DC resists: 10 + 1 = 11', () => {
    const { state, events } = accepted(hex(battle({ dice: { rolls: [10] } }), 'B.m1'))
    expect(events.at(-1)).toMatchObject({ type: 'saveRolled', total: 11, dc: 11, saved: true })
    expect(unit(state, 'B.m1')?.statuses).toEqual([])
  })

  it('reaches 3: Quillfox at 3 yes, Tamer B at 5 no', () => {
    const state = battle()
    expect(legalUses(state, 'hex').map((a) => a.target)).toEqual(['B.m1', 'B.m2'])
    expect(code(hex(state, 'B.tamer'))).toBe('out-of-range')
  })

  it('preview: the chance the save fails (DC 11, SPI mod +1: 1–9 fail, 9 of 20)', () => {
    expect(previewAction(battle(), { type: 'useSkill', unit: 'A.m2', skill: 'hex', target: 'B.m1' })).toEqual({
      ok: true,
      preview: {
        type: 'save',
        skill: 'hex',
        user: 'A.m2',
        target: 'B.m1',
        statuses: [
          { status: 'weakened', target: 'B.m1', save: { stat: 'spi', dc: 11, modifier: 1, failChance: { numerator: 9, denominator: 20 } } },
        ],
      },
    })
  })
})

describe('Weakened: every damage the Unit deals −2, at least 1 (rules §10.3, §14.2)', () => {
  // Fangrel (A.m1) on c3 next to Tidewall (B.m1) on d4. Tidewall: attack +1, POW mod +1. Fangrel: Guard 11.
  const NEXT_TO: BattleOptions = { tiles: { A: ['a1', 'c3', 'd2'], B: TILES.B } }
  const tidewallHits = (rolls: number[]) => {
    const hexed = accepted(hex(battle({ ...NEXT_TO, dice: { rolls: [5, ...rolls] } }), 'B.m1')).state
    return endTurn(hexed).state
  }

  it('Tidewall Weakened: 1d8 + POW mod 1 − 2', () => {
    const state = tidewallHits([15, 6])
    const { events } = accepted(applyAction(state, { type: 'basicAttack', unit: 'B.m1', target: 'A.m1' }))
    expect(events.at(-1)).toMatchObject({
      type: 'damageDealt',
      source: 'B.m1',
      rolls: [6],
      modifier: -1,
      statusModifiers: [{ status: 'weakened', bonus: -2 }],
      amount: 5,
    })
  })

  it('damage is still at least 1: 1 + 1 − 2 = 0 → 1', () => {
    const state = tidewallHits([15, 1])
    const { events } = accepted(applyAction(state, { type: 'basicAttack', unit: 'B.m1', target: 'A.m1' }))
    expect(events.at(-1)).toMatchObject({ type: 'damageDealt', modifier: -1, amount: 1 })
  })

  it('preview shows it: 1d8 − 1, from 1 to 7; without Weakened 1d8 + 1', () => {
    const action = { type: 'basicAttack', unit: 'B.m1', target: 'A.m1' } as const
    expect(previewAction(tidewallHits([]), action)).toMatchObject({
      ok: true,
      preview: { damage: { modifier: -1, statusModifiers: [{ status: 'weakened', bonus: -2 }], min: 1, max: 7 } },
    })
    const plain = previewAction(battle({ ...NEXT_TO, firstSide: 'B' }), action)
    expect(plain).toMatchObject({ ok: true, preview: { damage: { modifier: 1, min: 2, max: 9 } } })
    expect(plain.ok && plain.preview?.type === 'attack' && plain.preview.damage).not.toHaveProperty('statusModifiers')
  })

  it('given on the enemy\'s Turn, it lasts the 2 next Turns of the holder\'s side, ending as the second one ends', () => {
    let state = accepted(hex(battle({ dice: { rolls: [5] } }), 'B.m1')).state
    const weakened = () => unit(state, 'B.m1')?.statuses
    state = endTurn(state).state // team B, Turn 1
    expect(weakened()).toEqual([{ id: 'weakened', turnsLeft: 2 }])
    state = endTurn(state).state // team A, Turn 2
    expect(weakened()).toEqual([{ id: 'weakened', turnsLeft: 1 }])
    state = endTurn(state).state // team B, Turn 2: still Weakened
    expect(weakened()).toEqual([{ id: 'weakened', turnsLeft: 1 }])
    const end = endTurn(state)
    expect(end.events).toContainEqual({ type: 'statusEnded', unit: 'B.m1', status: 'weakened' })
    expect(unit(end.state, 'B.m1')?.statuses).toEqual([])
  })

  it('does not stack: Hex again resets it to 2 (Hex made Minor here so it can be used on the next Turn)', () => {
    let state = accepted(hex(battle({ skills: { hex: { tier: 'minor' } }, dice: { rolls: [5, 5] } }), 'B.m1')).state
    state = endTurn(endTurn(state).state).state // team A, Turn 2: 1 left
    expect(unit(state, 'B.m1')?.statuses).toEqual([{ id: 'weakened', turnsLeft: 1 }])
    const again = accepted(hex(state, 'B.m1'))
    expect(again.events.at(-1)).toEqual({ type: 'statusApplied', unit: 'B.m1', status: { id: 'weakened', turnsLeft: 2 }, refreshed: true })
    expect(unit(again.state, 'B.m1')?.statuses).toEqual([{ id: 'weakened', turnsLeft: 2 }])
  })
})

describe('Burst: Major, elemental 1d6 on up to 2 chosen enemies around a centre (rules §15.1, D-14)', () => {
  it('each target is a full attack, in the order chosen (rules §21.4)', () => {
    // Quillfox first: 12 + 2 = 14 hits Ward 9, 3 + 2 = 5; then Tidewall: 4 + 2 = 6 misses Ward 11.
    const { state, events } = accepted(burst(battle({ dice: { rolls: [12, 3, 4] } }), 'd4', ['B.m2', 'B.m1']))
    expect(types(events)).toEqual(['skillUsed', 'attackRolled', 'damageDealt', 'attackRolled'])
    expect(events[0]).toEqual({ type: 'skillUsed', unit: 'A.m2', skill: 'burst', targets: ['B.m2', 'B.m1'] })
    expect(events[1]).toMatchObject({ target: 'B.m2', skill: 'burst', defenceKind: 'ward', defence: 9, total: 14, hit: true })
    expect(events[2]).toMatchObject({ target: 'B.m2', dice: { count: 1, sides: 6 }, rolls: [3], modifier: 2, amount: 5 })
    expect(events[3]).toMatchObject({ target: 'B.m1', defence: 11, total: 6, hit: false })
    expect(unit(state, 'A.m2')).toMatchObject({ hasActed: true, hasMoved: false, skillsUsed: { burst: 1 } })
  })

  it('the other order with the same dice: Tidewall takes the first roll', () => {
    const { events } = accepted(burst(battle({ dice: { rolls: [12, 3, 4] } }), 'd4', ['B.m1', 'B.m2']))
    expect(events.slice(1).map((e) => [e.type, 'target' in e ? e.target : null])).toEqual([
      ['attackRolled', 'B.m1'],
      ['damageDealt', 'B.m1'],
      ['attackRolled', 'B.m2'],
    ])
  })

  it('one target is enough', () => {
    const { events } = accepted(burst(battle({ dice: { rolls: [2] } }), 'd4', ['B.m1']))
    expect(types(events)).toEqual(['skillUsed', 'attackRolled'])
  })

  it('at most 2 targets, at least 1, each once', () => {
    // Tamer B on e4: centre e4 covers all three enemies.
    const state = battle({ tiles: { A: TILES.A, B: ['e4', 'd4', 'e5'] } })
    expect(code(burst(state, 'e4', ['B.tamer', 'B.m1', 'B.m2']))).toBe('invalid-target')
    expect(code(burst(state, 'e4', []))).toBe('invalid-target')
    expect(code(burst(state, 'e4', ['B.m1', 'B.m1']))).toBe('invalid-target')
    expect(code(applyAction(state, { type: 'useSkill', unit: 'A.m2', skill: 'burst', targets: ['B.m1'] }))).toBe('invalid-target')
    expect(code(applyAction(state, { type: 'useSkill', unit: 'A.m2', skill: 'burst', tile: t('e4') }))).toBe('invalid-target')
    expect(code(applyAction(state, { type: 'useSkill', unit: 'A.m2', skill: 'burst', target: 'B.m1' }))).toBe('invalid-target')
    expect(legalUses(state, 'burst').every((a) => (a.targets?.length ?? 0) >= 1 && (a.targets?.length ?? 0) <= 2)).toBe(true)
  })

  it('legalActions: each centre with every ordered choice of the enemies in its area', () => {
    const atD4 = legalUses(battle(), 'burst').filter((a) => a.tile?.x === 3 && a.tile.y === 3)
    expect(atD4.map((a) => a.targets)).toEqual([['B.m1'], ['B.m1', 'B.m2'], ['B.m2'], ['B.m2', 'B.m1']])
  })

  it('the centre is 0 to 3 tiles away and its area must hold a target', () => {
    const state = battle()
    const centres = legalUses(state, 'burst').map((a) => a.tile!)
    expect(centres.every((c) => distance(c, t('d2')) <= 3)).toBe(true)
    // No enemy within 1 of d2: Burst on its own tile is not offered.
    expect(centres.some((c) => c.x === 3 && c.y === 1)).toBe(false)
    // d6 is 4 away, though Quillfox on e5 is next to it.
    expect(code(burst(state, 'd6', ['B.m2']))).toBe('out-of-range')
    expect(code(burst(state, 'd5', ['B.m2']))).toBe('accepted')
    // Quillfox on e3 next to Wispling: Burst on Wispling's own tile.
    const close = battle({ tiles: { A: TILES.A, B: ['g7', 'd4', 'e3'] } })
    expect(legalUses(close, 'burst')).toContainEqual(burstAction('d2', ['B.m2']))
    expect(code(burst(close, 'd2', ['B.m2']))).toBe('accepted')
  })

  it('only enemies in the 3x3 area around the centre', () => {
    expect(code(burst(battle(), 'c3', ['B.m2']))).toBe('out-of-range')
    expect(code(burst(battle(), 'g7', ['B.tamer']))).toBe('out-of-range')
  })

  it('no friendly fire: allies in the area are never targets', () => {
    // Fangrel on c3 stands in the area around d4.
    const state = battle({ tiles: { A: ['a1', 'c3', 'd2'], B: TILES.B } })
    expect(code(burst(state, 'd4', ['A.m1']))).toBe('not-an-enemy')
    expect(code(burst(state, 'd4', ['B.m1', 'A.m1']))).toBe('not-an-enemy')
    expect(legalUses(state, 'burst').flatMap((a) => a.targets ?? []).every((id) => id.startsWith('B.'))).toBe(true)
  })

  it('line of sight only to the centre (rules §7.1): a Ground user is blocked on the way to the centre, never per target', () => {
    // Fangrel on d1 with Burst, Wispling on d2 right in front.
    const state = battle({ tiles: { A: ['a1', 'd1', 'd2'], B: TILES.B }, loadouts: { 'A.m1': ['burst'] } })
    const blocked = burst(state, 'd4', ['B.m1'], 'A.m1')
    expect(blocked).toMatchObject({ ok: false, rejection: { code: 'no-line-of-sight', blockedBy: ['A.m2'] } })
    expect(previewAction(state, burstAction('d4', ['B.m1'], 'A.m1'))).toEqual({ ok: false, rejection: !blocked.ok && blocked.rejection })
    // Centre e3: the line d1 → e3 passes e2 only. Tidewall on d4 is behind Wispling from d1, but targets are not checked.
    expect(code(bolt(battle({ tiles: { A: ['a1', 'd1', 'd2'], B: TILES.B }, loadouts: { 'A.m1': ['element_bolt'] } }), 'B.m1', 'A.m1'))).toBe('no-line-of-sight')
    expect(code(burst(state, 'e3', ['B.m1'], 'A.m1'))).toBe('accepted')
  })

  it('a Flying user needs no line of sight to the centre', () => {
    // Wispling on d1, Fangrel on d2 in front.
    expect(code(burst(battle({ tiles: { A: ['a1', 'd2', 'd1'], B: TILES.B } }), 'd4', ['B.m1']))).toBe('accepted')
  })

  it('a Hidden enemy 2 or more tiles from the user cannot be chosen; next to the user it can (rules §8.2)', () => {
    const far = withStatus(battle(), 'B.m2', { id: 'hidden' })
    expect(code(burst(far, 'd4', ['B.m2']))).toBe('invalid-target')
    expect(legalUses(far, 'burst').flatMap((a) => a.targets ?? [])).not.toContain('B.m2')
    const near = withStatus(battle({ tiles: { A: TILES.A, B: ['g7', 'd4', 'e3'] } }), 'B.m2', { id: 'hidden' })
    expect(code(burst(near, 'd3', ['B.m2']))).toBe('accepted')
  })

  it('Inspiration is offered on each target\'s attack roll separately (rules §18)', () => {
    let state = battle({ inspiration: { A: true, B: false }, dice: { rolls: [12, 3, 4, 15, 2] } })
    let step = accepted(burst(state, 'd4', ['B.m2', 'B.m1']))
    expect(types(step.events)).toEqual(['skillUsed', 'attackRolled', 'inspirationOffered'])
    expect(step.events[1]).toMatchObject({ target: 'B.m2', rolls: [12] })
    step = accepted(applyAction(step.state, { type: 'declineInspiration', side: 'A' }))
    expect(types(step.events)).toEqual(['inspirationDeclined', 'damageDealt', 'attackRolled', 'inspirationOffered'])
    expect(step.events[2]).toMatchObject({ target: 'B.m1', rolls: [4], hit: false })
    step = accepted(applyAction(step.state, { type: 'useInspiration', side: 'A' }))
    expect(types(step.events)).toEqual(['inspirationUsed', 'attackRolled', 'damageDealt'])
    expect(step.events[1]).toMatchObject({ target: 'B.m1', rolls: [15], hit: true, rerolled: true })
    state = step.state
    expect(unit(state, 'B.m1')?.hp).toBe(27)
    expect(unit(state, 'B.m2')?.hp).toBe(14)
    expect(state.inspiration.A).toBe(false)
  })

  it('stops as soon as the Battle ends: the second target is not attacked (rules §19.1)', () => {
    // INT 30 (mod +10) and a 3d6 Burst (data change): a critical deals 6d6 + 10 to Tamer B (HP 25).
    // Tamer B on e4 is next to Tidewall: protected, so the attack roll has disadvantage (2 d20s).
    const state = battle({
      tiles: { A: TILES.A, B: ['e4', 'd4', 'e5'] },
      stats: { 'A.m2': { int: 30 } },
      skills: { burst: { damage: { count: 3, sides: 6 } } },
      dice: { rolls: [20, 20, 6, 6, 6, 6, 6, 6] },
    })
    const { state: after, events } = accepted(burst(state, 'e4', ['B.tamer', 'B.m1']))
    expect(types(events)).toEqual(['skillUsed', 'attackRolled', 'damageDealt', 'unitDown', 'battleEnded'])
    expect(after.outcome).toEqual({ winner: 'A', cause: 'tamerDown' })
  })

  it('preview: one attack per target in the order chosen (advantage and Tamer protection per target); no dice, no change', () => {
    const state = battle({ tiles: { A: TILES.A, B: ['e4', 'd4', 'e5'] }, dice: { rolls: [] } })
    const before = structuredClone(state)
    const result = previewAction(state, burstAction('e4', ['B.m2', 'B.tamer']))
    expect(result).toMatchObject({
      ok: true,
      preview: {
        type: 'area',
        skill: 'burst',
        user: 'A.m2',
        centre: t('e4'),
        area: ['d3', 'e3', 'f3', 'd4', 'e4', 'f4', 'd5', 'e5', 'f5'].map(t),
        attacks: [
          {
            type: 'attack',
            target: 'B.m2',
            rollMode: 'normal',
            defenceKind: 'ward',
            hitChance: { numerator: 14, denominator: 20 },
            damage: { dice: { count: 1, sides: 6 }, modifier: 2, min: 3, max: 8 },
          },
          {
            type: 'attack',
            target: 'B.tamer',
            rollMode: 'disadvantage',
            rollModeSources: [{ kind: 'tamerProtection' }],
            defence: 11,
          },
        ],
      },
    })
    expect(state).toEqual(before)
    expect(rollsUsed(state)).toBe(0)
  })
})

describe('Blink: Minor, replaces the Move, teleport 1–2 tiles (rules §15.1, D-13)', () => {
  it('teleports to an empty tile: no dice, the Move used, the Action left', () => {
    const { state, events } = accepted(applyAction(battle({ dice: { rolls: [] } }), blinkAction(t('f3'))))
    expect(events).toEqual([
      { type: 'skillUsed', unit: 'A.m2', skill: 'blink', targets: [] },
      { type: 'unitTeleported', unit: 'A.m2', skill: 'blink', from: t('d2'), to: t('f3') },
    ])
    expect(unit(state, 'A.m2')).toMatchObject({ tile: t('f3'), hasMoved: true, hasActed: false })
    expect(rollsUsed(state)).toBe(0)
    expect(state.activations).toMatchObject({ current: 'A.m2', started: ['A.m2'] })
  })

  it('after Blink: no Move and no second Blink, but the Action is still there', () => {
    const state = accepted(applyAction(battle({ dice: { rolls: [2] } }), blinkAction(t('f3')))).state
    expect(code(applyAction(state, { type: 'move', unit: 'A.m2', to: t('f4') }))).toBe('already-moved')
    expect(code(applyAction(state, blinkAction(t('f4'))))).toBe('already-moved')
    expect(legalActions(state).some((a) => a.type === 'move' && a.unit === 'A.m2')).toBe(false)
    expect(legalUses(state, 'blink')).toEqual([])
    expect(code(bolt(state, 'B.m1'))).toBe('accepted')
  })

  it('after a Move, no Blink', () => {
    const state = accepted(applyAction(battle(), { type: 'move', unit: 'A.m2', to: t('e2') })).state
    expect(code(applyAction(state, blinkAction(t('e4'))))).toBe('already-moved')
    expect(legalUses(state, 'blink')).toEqual([])
  })

  it('reaches exactly 1 to 2 tiles, only empty tiles on the Board', () => {
    const state = battle()
    expect(code(applyAction(state, blinkAction(t('g2'))))).toBe('out-of-range') // 3 away
    expect(code(applyAction(state, blinkAction(t('d2'))))).toBe('out-of-range') // its own tile
    expect(code(applyAction(state, blinkAction(t('d4'))))).toBe('tile-occupied') // Tidewall
    expect(code(applyAction(state, blinkAction(t('b3'))))).toBe('tile-occupied') // Fangrel
    expect(code(applyAction(state, blinkAction({ x: 3, y: -1 })))).toBe('off-board')
    expect(code(applyAction(state, { type: 'useSkill', unit: 'A.m2', skill: 'blink' }))).toBe('invalid-target')
    expect(code(applyAction(state, { type: 'useSkill', unit: 'A.m2', skill: 'blink', target: 'B.m1' }))).toBe('invalid-target')
    const expected: Tile[] = []
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const tile = { x, y }
        const d = distance(tile, t('d2'))
        if (isOnBoard(tile) && d >= 1 && d <= 2 && !state.units.some((u) => u.tile.x === x && u.tile.y === y)) expected.push(tile)
      }
    }
    expect(legalUses(state, 'blink').map((a) => a.tile)).toEqual(expected)
    // 20 tiles within 2 of d2 on the Board (rows 1–4, columns b–f), minus d2 itself, Fangrel's b3 and Tidewall's d4.
    expect(expected).toHaveLength(17)
  })

  it('works while Pinned (D-13): Move range is 0, Blink still goes 2', () => {
    const pinned = withStatus(battle(), 'A.m2', { id: 'pin', turnsLeft: 1 })
    expect(legalActions(pinned).some((a) => a.type === 'move' && a.unit === 'A.m2')).toBe(false)
    expect(legalUses(pinned, 'blink').length).toBeGreaterThan(0)
    expect(accepted(applyAction(pinned, blinkAction(t('f4')))).state.units.find((u) => u.id === 'A.m2')?.tile).toEqual(t('f4'))
  })

  it('preview: nothing to roll, the Wispling itself moves', () => {
    expect(previewAction(battle(), blinkAction(t('f3')))).toEqual({
      ok: true,
      preview: { type: 'effect', skill: 'blink', user: 'A.m2', units: ['A.m2'], statuses: [] },
    })
  })
})

describe('Replay records and replays Wispling skills', () => {
  it('Element Bolt, Hex, Burst and Blink replay to the same Battle', () => {
    const tiles = (side: 'A' | 'B') => {
      const [tamer, m1, m2] = TILES[side].map(t)
      return [tamer!, m1!, m2!] as const
    }
    const header = {
      scenarioId: 'scenario_1',
      boardId: 'crossroads',
      mode: 'hotseat',
      diceSeed: '0123456789abcdef',
      preset: { tiles: { A: tiles('A'), B: tiles('B') }, firstSide: 'A' },
    } as const
    const start = replayBattle(recordReplay(header, gameData, []), gameData)
    if (!start.ok) throw new Error('replay failed')
    // Play through the engine, declining every Inspiration offer, and keep each action.
    const actions: Action[] = []
    let state = start.final
    const play = (action: Action) => {
      state = accepted(applyAction(state, action)).state
      actions.push(action)
      while (state.pending?.kind === 'inspiration') play({ type: 'declineInspiration', side: state.pending.side })
    }
    play(blinkAction(t('e3')))
    play(burstAction('d4', ['B.m2', 'B.m1']))
    play({ type: 'endTurn' })
    play({ type: 'endTurn' })
    play({ type: 'useSkill', unit: 'A.m2', skill: 'hex', target: 'B.m1' })
    play({ type: 'endTurn' })
    play({ type: 'endTurn' })
    play({ type: 'useSkill', unit: 'A.m2', skill: 'element_bolt', target: 'B.m1' })
    const replay = recordReplay(header, gameData, actions)
    const first = replayBattle(replay, gameData)
    const second = replayBattle(JSON.parse(JSON.stringify(replay)), gameData)
    if (!first.ok || !second.ok) throw new Error('replay failed')
    expect(first.final).toEqual(state)
    expect(second.final).toEqual(first.final)
    const events = first.steps.flatMap((s) => s.events)
    expect(events).toContainEqual(expect.objectContaining({ type: 'unitTeleported', to: t('e3') }))
    expect(events.filter((e) => e.type === 'attackRolled' && e.skill === 'burst').map((e) => 'target' in e && e.target)).toEqual(['B.m2', 'B.m1'])
    expect(events).toContainEqual(expect.objectContaining({ type: 'saveRolled', skill: 'hex' }))
  })
})

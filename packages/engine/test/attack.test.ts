import { describe, expect, it } from 'vitest'
import { tileFromName } from '@mt/shared'
import {
  applyAction,
  legalActions,
  previewAction,
  type Action,
  type ApplyResult,
  type AttackPreview,
  type BattleEvent,
  type BattleState,
  type UnitId,
} from '../src/index.ts'
import { scenario1Battle, scenario1Deployment, type BattleOptions } from './fixtures.ts'

// Board for most tests: Fangrel (A.m1, d4) next to Tidewall (B.m1, d5);
// everyone else far apart. Every Scenario 1 Guard is 11 (rules §20.2).
const TILES = { A: ['a1', 'd4', 'g1'], B: ['a7', 'd5', 'g7'] } as const

function battle(options: BattleOptions = {}): BattleState {
  return scenario1Battle({ tiles: TILES, ...options })
}

function attack(state: BattleState, unit: UnitId, target: UnitId): ApplyResult {
  return applyAction(state, { type: 'basicAttack', unit, target })
}

function accepted(result: ApplyResult): { state: BattleState; events: readonly BattleEvent[] } {
  if (!result.ok) throw new Error(result.rejection.message)
  return result
}

function preview(state: BattleState, unit: UnitId, target: UnitId): AttackPreview {
  const result = previewAction(state, { type: 'basicAttack', unit, target })
  if (!result.ok || result.preview === null) throw new Error('expected an attack preview')
  return result.preview
}

const hpOf = (state: BattleState, unit: UnitId) => state.units.find((u) => u.id === unit)?.hp

/** How many scripted rolls the Battle has used so far. */
const rollsUsed = (state: BattleState) => (state.dice.kind === 'scripted' ? state.dice.position : NaN)

describe('attack roll: d20 + SEN mod + proficiency against Guard (rules §10.2)', () => {
  it('Fangrel (+2) rolling 9 makes 11 against Guard 11 and hits', () => {
    const { state, events } = accepted(attack(battle({ dice: { rolls: [9, 5] } }), 'A.m1', 'B.m1'))
    expect(events[0]).toEqual({
      type: 'attackRolled',
      attacker: 'A.m1',
      target: 'B.m1',
      skill: 'basic_attack',
      rollMode: 'normal',
      rolls: [9],
      natural: 9,
      attackBonus: 2,
      total: 11,
      defence: 11,
      defenceKind: 'guard',
      hit: true,
      critical: false,
    })
    expect(events[1]).toEqual({
      type: 'damageDealt',
      source: 'A.m1',
      target: 'B.m1',
      skill: 'basic_attack',
      dice: { count: 1, sides: 8 },
      rolls: [5],
      modifier: 2,
      amount: 7,
      hpBefore: 31,
      hpAfter: 24,
    })
    expect(events).toHaveLength(2)
    expect(hpOf(state, 'B.m1')).toBe(24)
    expect(rollsUsed(state)).toBe(2)
  })

  it('Fangrel rolling 8 makes 10 against Guard 11 and misses: no damage dice are rolled', () => {
    const { state, events } = accepted(attack(battle({ dice: { rolls: [8] } }), 'A.m1', 'B.m1'))
    expect(events).toEqual([expect.objectContaining({ type: 'attackRolled', natural: 8, total: 10, hit: false })])
    expect(hpOf(state, 'B.m1')).toBe(31)
    expect(rollsUsed(state)).toBe(1)
  })

  it('the attack uses the Unit\'s Action whether it hits or misses', () => {
    for (const rolls of [[8], [9, 5]]) {
      const { state } = accepted(attack(battle({ dice: { rolls } }), 'A.m1', 'B.m1'))
      expect(state.units.find((u) => u.id === 'A.m1')?.hasActed).toBe(true)
      expect(attack(state, 'A.m1', 'B.m1')).toMatchObject({ ok: false, rejection: { code: 'already-acted' } })
    }
  })
})

describe('physical damage modifier by distance (rules §10.1)', () => {
  // Quillfox: POW 12 (+1), SEN 14 (+2). Basic Attack reaches 1; a longer range
  // in the skill data shows the distance rule (ranges are data, spec "Data").
  it('at distance 1 adds POW mod', () => {
    const state = endTurn(battle({ tiles: { A: ['a1', 'd4', 'g1'], B: ['a7', 'g7', 'd5'] }, dice: { rolls: [12, 4] } }))
    expect(preview(state, 'B.m2', 'A.m1').damage).toMatchObject({ modifier: 1, min: 2, max: 9 })
    expect(accepted(attack(state, 'B.m2', 'A.m1')).events[1]).toMatchObject({ rolls: [4], modifier: 1, amount: 5 })
  })

  it('at distance 2 or more adds SEN mod', () => {
    const state = endTurn(
      battle({
        tiles: { A: ['a1', 'd4', 'g1'], B: ['a7', 'g7', 'd7'] },
        skills: { basic_attack: { range: 4 } },
        dice: { rolls: [12, 4] },
      }),
    )
    expect(preview(state, 'B.m2', 'A.m1')).toMatchObject({ distance: 3, damage: { modifier: 2, min: 3, max: 10 } })
    expect(accepted(attack(state, 'B.m2', 'A.m1')).events[1]).toMatchObject({ rolls: [4], modifier: 2, amount: 6 })
  })
})

describe('Tamer Basic Attack rolls 1d6 (rules §10.3)', () => {
  it('a Tamer hit rolls one d6 with POW mod 0', () => {
    // Tamer A (a6) next to Tamer B (a7).
    const state = battle({ tiles: { A: ['a6', 'd4', 'g1'], B: ['a7', 'd5', 'g7'] }, dice: { rolls: [15, 6] } })
    expect(preview(state, 'A.tamer', 'B.tamer').damage).toEqual({ dice: { count: 1, sides: 6 }, modifier: 0, min: 1, max: 6 })
    const { events } = accepted(attack(state, 'A.tamer', 'B.tamer'))
    expect(events[1]).toMatchObject({ dice: { count: 1, sides: 6 }, rolls: [6], amount: 6, hpAfter: 19 })
  })

  it('the damage die is a d6: a scripted 7 cannot be rolled on it', () => {
    const state = battle({ tiles: { A: ['a6', 'd4', 'g1'], B: ['a7', 'd5', 'g7'] }, dice: { rolls: [15, 7] } })
    expect(() => attack(state, 'A.tamer', 'B.tamer')).toThrow(/d6/)
  })
})

describe('critical and natural 1 (rules §10.2, §10.3)', () => {
  it('a natural 20 is a critical: twice the damage dice, modifier added once', () => {
    const { state, events } = accepted(attack(battle({ dice: { rolls: [20, 3, 8] } }), 'A.m1', 'B.m1'))
    expect(events[0]).toMatchObject({ natural: 20, hit: true, critical: true })
    expect(events[1]).toMatchObject({ dice: { count: 2, sides: 8 }, rolls: [3, 8], modifier: 2, amount: 13 })
    expect(hpOf(state, 'B.m1')).toBe(18)
    expect(rollsUsed(state)).toBe(3)
  })

  it('a natural 20 hits even when no other roll could', () => {
    // Tidewall AGI 30: Guard 10 + 10 + 2 = 22; Fangrel +2 reaches at most 21.
    const state = battle({ stats: { 'B.m1': { agi: 30 } }, dice: { rolls: [19, 20, 1, 1] } })
    expect(preview(state, 'A.m1', 'B.m1')).toMatchObject({ defence: 22, hitChance: { numerator: 1, denominator: 20 } })
    expect(accepted(attack(state, 'A.m1', 'B.m1')).events[0]).toMatchObject({ natural: 19, total: 21, hit: false })
    const secondTry = battle({ stats: { 'B.m1': { agi: 30 } }, dice: { rolls: [20, 1, 1] } })
    expect(accepted(attack(secondTry, 'A.m1', 'B.m1')).events[0]).toMatchObject({ natural: 20, hit: true, critical: true })
  })

  it('a natural 1 always misses, even when the total would reach Guard', () => {
    // Fangrel SEN 30: attack bonus 10 + 1 = 11; 1 + 11 = 12 ≥ Guard 11.
    const state = battle({ stats: { 'A.m1': { sen: 30 } }, dice: { rolls: [1] } })
    const { events } = accepted(attack(state, 'A.m1', 'B.m1'))
    expect(events).toEqual([expect.objectContaining({ natural: 1, total: 12, defence: 11, hit: false, critical: false })])
    expect(preview(state, 'A.m1', 'B.m1').hitChance).toEqual({ numerator: 19, denominator: 20 })
  })

  it('damage is at least 1 on a hit', () => {
    // Fangrel POW 1: mod −5; a roll of 1 makes −4.
    const state = battle({ stats: { 'A.m1': { pow: 1 } }, dice: { rolls: [15, 1] } })
    expect(accepted(attack(state, 'A.m1', 'B.m1')).events[1]).toMatchObject({ rolls: [1], modifier: -5, amount: 1 })
  })
})

describe('preview: exact odds, no state change, no dice used (rules §21.1)', () => {
  const matchups = [
    { name: 'Fangrel +2 against Guard 11', options: {}, unit: 'A.m1', target: 'B.m1', hits: 12 },
    { name: 'natural 1 decides (+11 against 11)', options: { stats: { 'A.m1': { sen: 30 } } }, unit: 'A.m1', target: 'B.m1', hits: 19 },
    { name: 'only natural 20 hits (+2 against 22)', options: { stats: { 'B.m1': { agi: 30 } } }, unit: 'A.m1', target: 'B.m1', hits: 1 },
    { name: 'low Guard (+2 against 7)', options: { stats: { 'B.m1': { agi: 1 } } }, unit: 'A.m1', target: 'B.m1', hits: 16 },
  ] as const

  for (const { name, options, unit, target, hits } of matchups) {
    it(`hit and critical chance equal what applyAction does on each of the 20 faces: ${name}`, () => {
      const p = preview(battle(options), unit, target)
      let hitFaces = 0
      let criticalFaces = 0
      for (let face = 1; face <= 20; face++) {
        const { events } = accepted(attack(battle({ ...options, dice: { rolls: [face, 1, 1] } }), unit, target))
        const roll = events[0]
        if (roll?.type !== 'attackRolled') throw new Error('expected an attack roll first')
        if (roll.hit) hitFaces++
        if (roll.critical) criticalFaces++
      }
      expect(p.hitChance).toEqual({ numerator: hits, denominator: 20 })
      expect(p.hitChance.numerator).toBe(hitFaces)
      expect(p.criticalChance).toEqual({ numerator: criticalFaces, denominator: 20 })
      expect(criticalFaces).toBe(1)
    })
  }

  it('damage ranges equal the lowest and highest damage applyAction can deal', () => {
    const p = preview(battle(), 'A.m1', 'B.m1')
    expect(p.damage).toEqual({ dice: { count: 1, sides: 8 }, modifier: 2, min: 3, max: 10 })
    expect(p.criticalDamage).toEqual({ dice: { count: 2, sides: 8 }, modifier: 2, min: 4, max: 18 })
    const amount = (rolls: number[]) => {
      const event = accepted(attack(battle({ dice: { rolls } }), 'A.m1', 'B.m1')).events[1]
      return event?.type === 'damageDealt' ? event.amount : NaN
    }
    expect([amount([15, 1]), amount([15, 8])]).toEqual([p.damage.min, p.damage.max])
    expect([amount([20, 1, 1]), amount([20, 8, 8])]).toEqual([p.criticalDamage.min, p.criticalDamage.max])
  })

  it('does not change the state or draw dice (seeded and scripted)', () => {
    for (const dice of [{ seed: 'deadbeefcafef00d' }, { rolls: [9, 5] }]) {
      const state = battle({ dice })
      const before = structuredClone(state)
      preview(state, 'A.m1', 'B.m1')
      preview(state, 'A.m1', 'B.m1')
      expect(state).toEqual(before)
      // The attack after the previews still gets the first rolls of the stream.
      const afterPreview = accepted(attack(state, 'A.m1', 'B.m1'))
      const withoutPreview = accepted(attack(battle({ dice }), 'A.m1', 'B.m1'))
      expect(afterPreview).toEqual(withoutPreview)
    }
  })

  it('an illegal attack has no preview, with the same reason applyAction gives', () => {
    const state = battle()
    const action: Action = { type: 'basicAttack', unit: 'A.m1', target: 'B.m2' }
    const rejected = applyAction(state, action)
    expect(previewAction(state, action)).toEqual({ ok: false, rejection: !rejected.ok && rejected.rejection })
    expect(previewAction(state, { type: 'endTurn' })).toEqual({ ok: true, preview: null })
  })
})

describe('legal Basic Attacks (rules §8.1, §17.4)', () => {
  const attacks = (state: BattleState) =>
    legalActions(state).flatMap((a) => (a.type === 'basicAttack' ? [`${a.unit}>${a.target}`] : []))

  it('are offered against every enemy at distance 1, by every Unit that has not acted', () => {
    // Fangrel d4 touches Tidewall d5 and Quillfox e5; the Tamer at d3 touches no enemy.
    const state = scenario1Battle({ tiles: { A: ['d3', 'd4', 'g1'], B: ['a7', 'd5', 'e5'] } })
    expect(attacks(state).sort()).toEqual(['A.m1>B.m1', 'A.m1>B.m2'])
    for (const action of legalActions(state)) {
      expect(applyAction(state, action).ok).toBe(true)
    }
  })

  it('are gone for a Unit once it acted, but it can still Move, and back next Turn', () => {
    const acted = accepted(attack(battle({ dice: { rolls: [8, 8] } }), 'A.m1', 'B.m1')).state
    expect(attacks(acted)).toEqual([])
    expect(applyAction(acted, { type: 'move', unit: 'A.m1', to: tileFromName('c3') }).ok).toBe(true)
    const nextTurn = endTurn(endTurn(acted))
    expect(attacks(nextTurn)).toEqual(['A.m1>B.m1'])
  })

  it('a Unit can Move first and then attack', () => {
    const moved = accepted(
      applyAction(scenario1Battle({ tiles: { A: ['a1', 'd3', 'g1'], B: ['a7', 'd5', 'g7'] } }), {
        type: 'move',
        unit: 'A.m1',
        to: tileFromName('d4'),
      }),
    ).state
    expect(attacks(moved)).toEqual(['A.m1>B.m1'])
  })
})

describe('illegal attacks are rejected with a reason and the state unchanged', () => {
  const state = battle()
  const before = structuredClone(state)
  const acted = accepted(attack(battle({ dice: { rolls: [8] } }), 'A.m1', 'B.m1')).state

  const illegal = [
    ['a target out of range', () => attack(state, 'A.m1', 'B.m2'), 'out-of-range'],
    ['its own side\'s Unit', () => attack(state, 'A.m1', 'A.tamer'), 'not-an-enemy'],
    ['itself', () => attack(state, 'A.m1', 'A.m1'), 'not-an-enemy'],
    ['by a Unit of the side not to act', () => attack(state, 'B.m1', 'A.m1'), 'not-your-turn'],
    ['an unknown target', () => attack(state, 'A.m1', 'B.m9'), 'unknown-unit'],
    ['by an unknown Unit', () => attack(state, 'A.m9', 'B.m1'), 'unknown-unit'],
  ] as const

  for (const [what, attempt, code] of illegal) {
    it(`attacking ${what}: ${code}`, () => {
      const result = attempt()
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.rejection.code).toBe(code)
      expect(result.rejection.message).not.toBe('')
      expect(result.state).toBe(state)
      expect(state).toEqual(before)
    })
  }

  it('attacking during deployment: wrong-phase', () => {
    const deploying = scenario1Deployment()
    const action: Action = { type: 'basicAttack', unit: 'A.m1', target: 'B.m1' }
    expect(applyAction(deploying, action)).toMatchObject({ ok: false, rejection: { code: 'wrong-phase' } })
    expect(previewAction(deploying, action)).toMatchObject({ ok: false, rejection: { code: 'wrong-phase' } })
  })

  it('attacking after another Unit started its activation: activation-over (rules §17.4)', () => {
    let s = accepted(applyAction(state, { type: 'move', unit: 'A.m1', to: tileFromName('c4') })).state
    s = accepted(applyAction(s, { type: 'move', unit: 'A.tamer', to: tileFromName('b1') })).state
    expect(attack(s, 'A.m1', 'B.m1')).toMatchObject({ ok: false, rejection: { code: 'activation-over' } })
  })

  it('attacking with a third Unit on the first Turn of the side that starts: activation-limit (rules §17.3)', () => {
    let s = accepted(applyAction(state, { type: 'move', unit: 'A.tamer', to: tileFromName('b1') })).state
    s = accepted(applyAction(s, { type: 'move', unit: 'A.m2', to: tileFromName('f1') })).state
    expect(attack(s, 'A.m1', 'B.m1')).toMatchObject({ ok: false, rejection: { code: 'activation-limit' } })
    expect(legalActions(s).some((a) => a.type === 'basicAttack')).toBe(false)
  })

  it('an attack starts the Unit\'s activation: it can still Move after, but an earlier Unit cannot resume', () => {
    const attacked = accepted(attack(battle({ dice: { rolls: [8] } }), 'A.m1', 'B.m1')).state
    expect(attacked.activations).toMatchObject({ current: 'A.m1', started: ['A.m1'] })
    const moved = accepted(applyAction(attacked, { type: 'move', unit: 'A.m2', to: tileFromName('f1') })).state
    expect(applyAction(moved, { type: 'move', unit: 'A.m1', to: tileFromName('c3') })).toMatchObject({
      ok: false,
      rejection: { code: 'activation-over' },
    })
  })

  it('attacking twice in one Turn: already-acted, state unchanged', () => {
    const snapshot = structuredClone(acted)
    const result = attack(acted, 'A.m1', 'B.m1')
    expect(result).toMatchObject({ ok: false, rejection: { code: 'already-acted' } })
    expect(result.state).toBe(acted)
    expect(acted).toEqual(snapshot)
  })
})

function endTurn(state: BattleState): BattleState {
  return accepted(applyAction(state, { type: 'endTurn' })).state
}

import { describe, expect, it } from 'vitest'
import { tileFromName, tileName, type Element, type Tile } from '@mt/shared'
import {
  applyAction,
  legalActions,
  previewAction,
  recordReplay,
  replayBattle,
  unitSkills,
  type Action,
  type ApplyResult,
  type AttackPreview,
  type BattleEvent,
  type BattleState,
  type UnitId,
  type UnitStatus,
} from '../src/index.ts'
import { gameData, kitGameData, scenario1Battle, type BattleOptions } from './fixtures.ts'

// Quillfox (B.m2, 1 Star) on e7 (forest): attack +3 (SEN mod +2, proficiency 1),
// damage + SEN mod +2 from distance 2 (POW mod +1 at 1), Save DC (SEN) 11, Guard 11, HP 19.
// Tidewall (B.m1) on f3, next to Fangrel; Tamer B on g7.
// Fangrel (A.m1) on e4, 3 from Quillfox: Guard 11, VIT mod 0, HP 19, attack +2, POW mod +2.
// Wispling (A.m2, Flying) on c3, 4 from Quillfox. Tamer A on a1, 6 away.
// Every Monster mountain: neutral to each other and to every tile they stand on here.
const TILES = { A: ['a1', 'e4', 'c3'], B: ['g7', 'f3', 'e7'] } as const
const MOUNTAIN: Readonly<Record<string, Element>> = { 'A.m1': 'mountain', 'A.m2': 'mountain', 'B.m1': 'mountain', 'B.m2': 'mountain' }

function battle(options: BattleOptions = {}): BattleState {
  return scenario1Battle({ tiles: TILES, elements: MOUNTAIN, firstSide: 'B', ...options })
}

function accepted(result: ApplyResult): { state: BattleState; events: readonly BattleEvent[] } {
  if (!result.ok) throw new Error(result.rejection.message)
  return result
}

const t = (name: string): Tile => tileFromName(name)
const code = (result: ApplyResult) => (result.ok ? 'accepted' : result.rejection.code)
const unit = (state: BattleState, id: UnitId) => state.units.find((u) => u.id === id)
const types = (events: readonly BattleEvent[]) => events.map((e) => e.type)
const endTurn = (state: BattleState) => accepted(applyAction(state, { type: 'endTurn' })).state
const skill = (user: UnitId, id: string, target?: UnitId): Action =>
  target === undefined ? { type: 'useSkill', unit: user, skill: id } : { type: 'useSkill', unit: user, skill: id, target }
const act = (state: BattleState, action: Action) => accepted(applyAction(state, action))
const legalUses = (state: BattleState, id: string, user: UnitId = 'B.m2') =>
  legalActions(state).flatMap((a) => (a.type === 'useSkill' && a.unit === user && a.skill === id ? [a] : []))
const attackPreview = (state: BattleState, action: Action): AttackPreview => {
  const result = previewAction(state, action)
  if (!result.ok || result.preview?.type !== 'attack') throw new Error('no attack preview')
  return result.preview
}
/** Put a status on a Unit directly, for situations no skill of phase 1 can make. */
function withStatus(state: BattleState, id: UnitId, status: UnitStatus): BattleState {
  return { ...state, units: state.units.map((u) => (u.id === id ? { ...u, statuses: [...u.statuses, status] } : u)) }
}
const HIDDEN: UnitStatus = { id: 'hidden', whileOn: 'forest' }

describe('Quillfox loadout', () => {
  it('all four skills are in the game now', () => {
    expect(unitSkills(battle(), 'B.m2')).toEqual([
      { skill: 'long_shot', tier: 'minor', cooldown: 0, spent: false, implemented: true },
      { skill: 'pin', tier: 'major', cooldown: 0, spent: false, implemented: true },
      { skill: 'mark', tier: 'minor', cooldown: 0, spent: false, implemented: true },
      { skill: 'camouflage', tier: 'minor', cooldown: 0, spent: false, implemented: true, free: true, usedThisActivation: false },
    ])
  })

  it('every legal action is accepted, Quillfox skills included', () => {
    const state = battle()
    for (const id of ['long_shot', 'pin', 'mark', 'camouflage']) expect(legalUses(state, id).length).toBeGreaterThan(0)
    for (const action of legalActions(state)) expect(applyAction(state, action).ok, JSON.stringify(action)).toBe(true)
  })
})

describe('Long Shot: Minor, physical 1d8, range 4 (rules §10.1, §15.1)', () => {
  it('from distance 2 or more: d20 + attack bonus against Guard, damage 1d8 + SEN mod', () => {
    const { state, events } = act(battle({ dice: { rolls: [10, 5] } }), skill('B.m2', 'long_shot', 'A.m1'))
    expect(events).toEqual([
      { type: 'skillUsed', unit: 'B.m2', skill: 'long_shot', targets: ['A.m1'] },
      {
        type: 'attackRolled',
        attacker: 'B.m2',
        target: 'A.m1',
        skill: 'long_shot',
        rollMode: 'normal',
        rolls: [10],
        natural: 10,
        attackBonus: 3,
        total: 13,
        defence: 11,
        defenceKind: 'guard',
        hit: true,
        critical: false,
      },
      {
        type: 'damageDealt',
        source: 'B.m2',
        target: 'A.m1',
        skill: 'long_shot',
        dice: { count: 1, sides: 8 },
        rolls: [5],
        modifier: 2,
        amount: 7,
        hpBefore: 19,
        hpAfter: 12,
      },
    ])
    expect(unit(state, 'B.m2')).toMatchObject({ hasActed: true, hasMoved: false })
  })

  it('at distance 1 the damage mod is POW mod (rules §15.1)', () => {
    const state = battle({ tiles: { A: TILES.A, B: ['g7', 'f3', 'e5'] }, dice: { rolls: [10, 5] } })
    expect(attackPreview(state, skill('B.m2', 'long_shot', 'A.m1')).damage).toMatchObject({ modifier: 1, min: 2, max: 9 })
    const { events } = act(state, skill('B.m2', 'long_shot', 'A.m1'))
    expect(events[2]).toMatchObject({ type: 'damageDealt', modifier: 1, amount: 6 })
  })

  it('reaches 4: Wispling at 4 is offered, Tamer A at 6 is out of range', () => {
    const state = battle()
    expect(legalUses(state, 'long_shot').map((a) => a.target)).toEqual(['A.m1', 'A.m2'])
    expect(code(applyAction(state, skill('B.m2', 'long_shot', 'A.tamer')))).toBe('out-of-range')
  })

  it('needs line of sight from distance 2 (rules §7)', () => {
    // Tidewall on e6 stands between Quillfox (e7) and Fangrel (e4).
    const state = battle({ tiles: { A: TILES.A, B: ['g7', 'e6', 'e7'] } })
    const result = applyAction(state, skill('B.m2', 'long_shot', 'A.m1'))
    expect(result.ok ? null : result.rejection).toMatchObject({ code: 'no-line-of-sight', blockedBy: ['B.m1'] })
    expect(legalUses(state, 'long_shot').map((a) => a.target)).not.toContain('A.m1')
  })

  it('preview: exact odds and damage ranges', () => {
    const preview = attackPreview(battle(), skill('B.m2', 'long_shot', 'A.m1'))
    expect(preview).toMatchObject({
      distance: 3,
      rollMode: 'normal',
      attackBonus: 3,
      defence: 11,
      hitChance: { numerator: 13, denominator: 20 },
      criticalChance: { numerator: 1, denominator: 20 },
      damage: { dice: { count: 1, sides: 8 }, modifier: 2, min: 3, max: 10 },
      criticalDamage: { dice: { count: 2, sides: 8 }, modifier: 2, min: 4, max: 18 },
      statuses: [],
    })
  })
})

describe('Pin: Major, physical 1d6 + Pin (save VIT), range 4 (rules §14.2, §15.1)', () => {
  it('on a hit: damage, then the target saves VIT against the SEN Save DC; failing, it is Pinned', () => {
    const { state, events } = act(battle({ dice: { rolls: [15, 3, 5] } }), skill('B.m2', 'pin', 'A.m1'))
    expect(types(events)).toEqual(['skillUsed', 'attackRolled', 'damageDealt', 'saveRolled', 'statusApplied'])
    expect(events[2]).toMatchObject({ dice: { count: 1, sides: 6 }, rolls: [3], modifier: 2, amount: 5, hpAfter: 14 })
    expect(events[3]).toEqual({
      type: 'saveRolled',
      unit: 'A.m1',
      source: 'B.m2',
      skill: 'pin',
      status: 'pin',
      stat: 'vit',
      roll: 5,
      modifier: 0,
      total: 5,
      dc: 11,
      saved: false,
    })
    expect(unit(state, 'A.m1')?.statuses).toEqual([{ id: 'pin', turnsLeft: 1 }])
  })

  it('a passed save, or a miss, gives no Pin', () => {
    const saved = act(battle({ dice: { rolls: [15, 3, 11] } }), skill('B.m2', 'pin', 'A.m1'))
    expect(saved.events.at(-1)).toMatchObject({ type: 'saveRolled', total: 11, saved: true })
    expect(unit(saved.state, 'A.m1')?.statuses).toEqual([])
    const missed = act(battle({ dice: { rolls: [7] } }), skill('B.m2', 'pin', 'A.m1'))
    expect(types(missed.events)).toEqual(['skillUsed', 'attackRolled'])
  })

  it('the Pinned Unit cannot move for its next Turn but can still act; Hit and Run offers no step; Pin ends with that Turn', () => {
    let state = act(battle({ dice: { rolls: [15, 3, 5, 10, 4] } }), skill('B.m2', 'pin', 'A.m1')).state
    state = endTurn(state)
    expect(legalActions(state).some((a) => a.type === 'move' && a.unit === 'A.m1')).toBe(false)
    expect(code(applyAction(state, { type: 'move', unit: 'A.m1', to: t('e3') }))).toBe('out-of-reach')
    expect(legalActions(state)).toContainEqual({ type: 'basicAttack', unit: 'A.m1', target: 'B.m1' })
    const hitAndRun = act(state, skill('A.m1', 'hit_and_run', 'B.m1'))
    expect(types(hitAndRun.events)).toEqual(['skillUsed', 'attackRolled', 'damageDealt'])
    expect(hitAndRun.state.pending).toBeNull()
    const ended = accepted(applyAction(hitAndRun.state, { type: 'endTurn' }))
    expect(ended.events).toContainEqual({ type: 'statusEnded', unit: 'A.m1', status: 'pin' })
  })

  it('cooldown: used on Turn N, usable again on Turn N + 2 of its side (rules §13.2)', () => {
    let state = act(battle({ dice: { rolls: [7] } }), skill('B.m2', 'pin', 'A.m1')).state
    state = endTurn(endTurn(state))
    expect(code(applyAction(state, skill('B.m2', 'pin', 'A.m1')))).toBe('on-cooldown')
    state = endTurn(endTurn(state))
    expect(legalUses(state, 'pin').length).toBeGreaterThan(0)
  })

  it('preview: hit odds, damage and the chance the target fails its save', () => {
    const preview = attackPreview(battle(), skill('B.m2', 'pin', 'A.m1'))
    expect(preview.damage).toMatchObject({ dice: { count: 1, sides: 6 }, modifier: 2, min: 3, max: 8 })
    expect(preview.statuses).toEqual([
      { status: 'pin', target: 'A.m1', save: { stat: 'vit', dc: 11, modifier: 0, failChance: { numerator: 10, denominator: 20 } } },
    ])
  })
})

describe('Mark: Minor, physical attack roll without damage, Marked 1 on a hit, range 5 (rules §14.2, §15.1, D-22)', () => {
  it('on a hit: no damage dice, Marked with no save', () => {
    const { state, events } = act(battle({ dice: { rolls: [12] } }), skill('B.m2', 'mark', 'A.m1'))
    expect(types(events)).toEqual(['skillUsed', 'attackRolled', 'statusApplied'])
    expect(events[1]).toMatchObject({ skill: 'mark', natural: 12, total: 15, defence: 11, hit: true })
    expect(events[2]).toEqual({ type: 'statusApplied', unit: 'A.m1', status: { id: 'marked', turnsLeft: 1, countedOn: 'B', skipCountdown: true } })
    expect(unit(state, 'A.m1')?.hp).toBe(19)
    // Only the attack roll was drawn.
    expect(state.dice.kind === 'scripted' ? state.dice.position : NaN).toBe(1)
  })

  it('a miss gives nothing', () => {
    const { state, events } = act(battle({ dice: { rolls: [5] } }), skill('B.m2', 'mark', 'A.m1'))
    expect(types(events)).toEqual(['skillUsed', 'attackRolled'])
    expect(unit(state, 'A.m1')?.statuses).toEqual([])
  })

  it('reaches 5', () => {
    // Quillfox on e6, Tamer A on a1 5 away with nothing on the line (d5, c4, c3, b2).
    const state = battle({ tiles: { A: ['a1', 'g1', 'g2'], B: ['g7', 'a7', 'e6'] } })
    expect(legalUses(state, 'mark').map((a) => a.target)).toContain('A.tamer')
    expect(code(applyAction(state, skill('B.m2', 'long_shot', 'A.tamer')))).toBe('out-of-range')
    expect(code(applyAction(battle(), skill('B.m2', 'mark', 'A.tamer')))).toBe('out-of-range')
  })

  it('preview: hit odds, no damage, Marked with no save', () => {
    const preview = attackPreview(battle(), skill('B.m2', 'mark', 'A.m1'))
    expect(preview).toMatchObject({
      hitChance: { numerator: 13, denominator: 20 },
      damage: null,
      criticalDamage: null,
      statuses: [{ status: 'marked', target: 'A.m1', save: null }],
    })
  })

  it('every attacker gets advantage against the Marked Unit: allies Basic Attack and skills (rules §5.1)', () => {
    const marked = act(battle({ dice: { rolls: [12, 3, 17, 4] } }), skill('B.m2', 'mark', 'A.m1')).state
    const basic: Action = { type: 'basicAttack', unit: 'B.m1', target: 'A.m1' }
    const preview = attackPreview(marked, basic)
    expect(preview.rollMode).toBe('advantage')
    expect(preview.rollModeSources).toEqual([{ kind: 'status', effect: 'advantage', status: 'marked', holder: 'target' }])
    expect(preview.hitChance.denominator).toBe(400)
    expect(attackPreview(marked, skill('B.m1', 'shield_bash', 'A.m1')).rollMode).toBe('advantage')
    const { events } = act(marked, basic)
    expect(events[0]).toMatchObject({ type: 'attackRolled', rollMode: 'advantage', rolls: [3, 17], natural: 17 })
    // Before the Mark: no advantage.
    expect(attackPreview(battle(), basic).rollMode).toBe('normal')
  })

  it('Marked 1 lasts through the other side\'s Turn and the next Turn of the side that gave it, then ends at its end (D-03)', () => {
    const MARKED = { id: 'marked', turnsLeft: 1, countedOn: 'B' }
    const basic: Action = { type: 'basicAttack', unit: 'B.m1', target: 'A.m1' }
    let state = act(battle({ dice: { rolls: [12] } }), skill('B.m2', 'mark', 'A.m1')).state
    // The end of team B's Turn (the giver's) does not count; team A's Turn never counts it.
    state = endTurn(state)
    expect(unit(state, 'A.m1')?.statuses).toEqual([MARKED])
    state = endTurn(state)
    expect(state.sideToAct).toBe('B')
    expect(unit(state, 'A.m1')?.statuses).toEqual([MARKED])
    expect(attackPreview(state, basic).rollMode).toBe('advantage')
    // It ends at the end of team B's next Turn.
    const ended = accepted(applyAction(state, { type: 'endTurn' }))
    expect(ended.events).toContainEqual({ type: 'statusEnded', unit: 'A.m1', status: 'marked' })
    expect(unit(ended.state, 'A.m1')?.statuses).toEqual([])
    expect(attackPreview(endTurn(ended.state), basic).rollMode).toBe('normal')
  })

  it('an ally acting on the giver\'s next Turn attacks the Marked Unit with advantage; the preview names Marked as the source', () => {
    // Quillfox Marks Fangrel A, both sides pass, then Tidewall attacks it on team B's next Turn.
    let state = act(battle({ dice: { rolls: [12, 3, 17, 4] } }), skill('B.m2', 'mark', 'A.m1')).state
    state = endTurn(endTurn(state))
    const basic: Action = { type: 'basicAttack', unit: 'B.m1', target: 'A.m1' }
    const preview = attackPreview(state, basic)
    expect(preview.rollMode).toBe('advantage')
    expect(preview.rollModeSources).toEqual([{ kind: 'status', effect: 'advantage', status: 'marked', holder: 'target' }])
    const { events } = act(state, basic)
    expect(events[0]).toMatchObject({ type: 'attackRolled', attacker: 'B.m1', rollMode: 'advantage', rolls: [3, 17], natural: 17 })
  })

  it('Marking again resets it, never stacks: a new Mark on the next Turn lasts until the end of the Turn after', () => {
    // The second Mark rolls with advantage: its target is still Marked.
    let state = act(battle({ dice: { rolls: [12, 12, 12] } }), skill('B.m2', 'mark', 'A.m1')).state
    state = endTurn(endTurn(state))
    const again = act(state, skill('B.m2', 'mark', 'A.m1'))
    expect(again.events).toContainEqual({
      type: 'statusApplied',
      unit: 'A.m1',
      status: { id: 'marked', turnsLeft: 1, countedOn: 'B', skipCountdown: true },
      refreshed: true,
    })
    expect(unit(again.state, 'A.m1')?.statuses).toHaveLength(1)
    state = endTurn(again.state)
    expect(unit(state, 'A.m1')?.statuses).toEqual([{ id: 'marked', turnsLeft: 1, countedOn: 'B' }])
    state = endTurn(endTurn(state))
    expect(unit(state, 'A.m1')?.statuses).toEqual([])
  })

  it('a counterattack against the Marked Unit has advantage too', () => {
    // Quillfox Marks Fangrel, Tidewall takes Counter; on team A's Turn Fangrel attacks Tidewall.
    let state = act(battle({ dice: { rolls: [12, 10, 4, 2, 15, 5, 5] } }), skill('B.m2', 'mark', 'A.m1')).state
    state = endTurn(act(state, skill('B.m1', 'counter')).state)
    const { events } = act(state, { type: 'basicAttack', unit: 'A.m1', target: 'B.m1' })
    expect(events[0]).toMatchObject({ type: 'attackRolled', attacker: 'A.m1', rollMode: 'normal' })
    const counter = events.find((e) => e.type === 'attackRolled' && e.attacker === 'B.m1')
    expect(counter).toMatchObject({ skill: 'counterattack', rollMode: 'advantage', rolls: [2, 15], natural: 15 })
  })

  it('a full attack roll: at distance 1 a Countering target counterattacks (D-22, rules §14.2)', () => {
    // Fangrel takes Counter on team A's Turn; Quillfox on e5 Marks it from distance 1.
    let state = battle({
      tiles: { A: TILES.A, B: ['g7', 'a7', 'e5'] },
      firstSide: 'A',
      loadouts: { 'A.m1': ['counter'] },
      dice: { rolls: [12, 15, 5] },
    })
    state = endTurn(act(state, skill('A.m1', 'counter')).state)
    const { events } = act(state, skill('B.m2', 'mark', 'A.m1'))
    expect(types(events)).toEqual([
      'skillUsed',
      'attackRolled',
      'statusApplied',
      'counterattack',
      'attackRolled',
      'damageDealt',
      'statusEnded',
    ])
    expect(events[5]).toMatchObject({ source: 'A.m1', target: 'B.m2', amount: 7 })
  })

  it('a full attack roll: Tamer protection gives it disadvantage (rules §9)', () => {
    // Quillfox on e6, Tamer A on a1 5 away with Fangrel next to it on b1.
    const state = battle({ tiles: { A: ['a1', 'b1', 'g2'], B: ['g7', 'a7', 'e6'] } })
    expect(attackPreview(state, skill('B.m2', 'mark', 'A.tamer')).rollMode).toBe('disadvantage')
  })

  it('a missed attack roll: Inspiration is offered, and the roll ends the user\'s Hidden (rules §8.2, §18)', () => {
    let state = battle({ inspiration: { A: false, B: true }, dice: { rolls: [3] } })
    state = endTurn(endTurn(act(state, skill('B.m2', 'camouflage')).state))
    const offered = act(state, skill('B.m2', 'mark', 'A.m1'))
    expect(types(offered.events)).toEqual(['skillUsed', 'attackRolled', 'inspirationOffered'])
    expect(unit(offered.state, 'B.m2')?.statuses).toEqual([HIDDEN])
    const { state: after, events } = act(offered.state, { type: 'declineInspiration', side: 'B' })
    expect(events).toEqual([
      { type: 'inspirationDeclined', side: 'B' },
      { type: 'statusEnded', unit: 'B.m2', status: 'hidden', cause: 'attackRoll' },
    ])
    expect(unit(after, 'B.m2')?.statuses).toEqual([])
  })
})

describe('Camouflage: Minor, Hidden while on forest (rules §8.2, §15.1, D-18)', () => {
  it('on forest: the user becomes Hidden for as long as it stays on forest', () => {
    const { state, events } = act(battle(), skill('B.m2', 'camouflage'))
    expect(events).toEqual([
      { type: 'skillUsed', unit: 'B.m2', skill: 'camouflage', targets: ['B.m2'] },
      { type: 'statusApplied', unit: 'B.m2', status: HIDDEN },
    ])
    // A free skill (D-28): neither the Move nor the Action is used.
    expect(unit(state, 'B.m2')).toMatchObject({ hasActed: false, hasMoved: false, statuses: [HIDDEN] })
    // No duration: it stays through the end of Turns while Quillfox stays on forest.
    expect(unit(endTurn(endTurn(state)), 'B.m2')?.statuses).toEqual([HIDDEN])
  })

  it('only on forest: elsewhere it is refused and not offered', () => {
    const state = battle({ tiles: { A: TILES.A, B: ['g7', 'f3', 'e6'] } })
    expect(code(applyAction(state, skill('B.m2', 'camouflage')))).toBe('wrong-terrain')
    expect(legalUses(state, 'camouflage')).toEqual([])
    // Move onto forest first, then Camouflage (rules §15.1).
    const moved = act(state, { type: 'move', unit: 'B.m2', to: t('e7') }).state
    expect(code(applyAction(moved, skill('B.m2', 'camouflage')))).toBe('accepted')
  })

  it('preview: who gets what, nothing to roll', () => {
    expect(previewAction(battle(), skill('B.m2', 'camouflage'))).toEqual({
      ok: true,
      preview: { type: 'effect', skill: 'camouflage', user: 'B.m2', units: ['B.m2'], statuses: ['hidden'] },
    })
  })
})

describe('Camouflage is free: no Move, no Action, once per activation (rules §15.1, §17.4, D-28)', () => {
  const longShot = skill('B.m2', 'long_shot', 'A.m1')

  it('hide, then act: the Action is still there (and the attack roll ends Hidden)', () => {
    const hidden = act(battle(), skill('B.m2', 'camouflage')).state
    expect(code(applyAction(hidden, longShot))).toBe('accepted')
    expect(unit(act(hidden, longShot).state, 'B.m2')?.statuses).toEqual([])
  })

  it('act, then hide: after Long Shot and a Move onto forest Camouflage is still legal, and Hidden lasts the Turn', () => {
    const state = battle({ tiles: { A: TILES.A, B: ['g7', 'f3', 'e6'] } })
    let s = act(state, { type: 'move', unit: 'B.m2', to: t('e7') }).state
    s = act(s, longShot).state
    expect(unit(s, 'B.m2')).toMatchObject({ hasMoved: true, hasActed: true })
    expect(legalUses(s, 'camouflage')).toEqual([skill('B.m2', 'camouflage')])
    s = act(s, skill('B.m2', 'camouflage')).state
    expect(unit(endTurn(s), 'B.m2')?.statuses).toEqual([HIDDEN])
  })

  it('once per activation: a second use is refused; usable again in its next activation', () => {
    const s = act(act(battle(), skill('B.m2', 'camouflage')).state, longShot).state
    expect(code(applyAction(s, skill('B.m2', 'camouflage')))).toBe('on-cooldown')
    expect(legalUses(s, 'camouflage')).toEqual([])
    expect(unitSkills(s, 'B.m2').find((x) => x.skill === 'camouflage')).toMatchObject({ cooldown: 0, free: true, usedThisActivation: true })
    const next = endTurn(endTurn(s))
    expect(unitSkills(next, 'B.m2').find((x) => x.skill === 'camouflage')?.usedThisActivation).toBe(false)
    expect(code(applyAction(next, skill('B.m2', 'camouflage')))).toBe('accepted')
  })

  it('it starts the activation, and ends with it like any other use', () => {
    const s = act(battle(), skill('B.m2', 'camouflage')).state
    expect(s.activations.current).toBe('B.m2')
    expect(s.activations.started).toEqual(['B.m2'])
    // Another Unit starts: Quillfox's activation is over, Camouflage included.
    const other = act(act(battle(), longShot).state, { type: 'defend', unit: 'B.m1' }).state
    expect(code(applyAction(other, skill('B.m2', 'camouflage')))).toBe('activation-over')
  })

  it('Taunted binds the Move and the Action, not Camouflage', () => {
    const taunted = withStatus(battle(), 'B.m2', { id: 'taunted', turnsLeft: 1, source: 'A.m1' })
    expect(code(applyAction(taunted, { type: 'defend', unit: 'B.m2' }))).toBe('taunted')
    const hidden = act(taunted, skill('B.m2', 'camouflage')).state
    expect(code(applyAction(hidden, longShot))).toBe('accepted')
  })
})

describe('Hidden (rules §8.1, §8.2)', () => {
  /** Quillfox Hidden on e7 and team A to act; Fangrel next to it on d6. */
  function hiddenQuillfox(options: BattleOptions = {}): BattleState {
    const state = battle({ tiles: { A: ['a1', 'd6', 'c3'], B: ['g7', 'f3', 'e7'] }, ...options })
    return endTurn(act(state, skill('B.m2', 'camouflage')).state)
  }

  it('enemies cannot aim at it from distance 2 or more: attacks, save skills and Burst alike', () => {
    const state = hiddenQuillfox()
    // Wispling on c3, 4 away: Element Bolt.
    const bolt = applyAction(state, skill('A.m2', 'element_bolt', 'B.m2'))
    expect(bolt.ok ? null : bolt.rejection).toMatchObject({ code: 'target-hidden' })
    expect(previewAction(state, skill('A.m2', 'element_bolt', 'B.m2'))).toMatchObject({ ok: false, rejection: { code: 'target-hidden' } })
    expect(legalUses(state, 'element_bolt', 'A.m2').map((a) => a.target)).not.toContain('B.m2')
    // Hex (save SPI, range 3) from c5, 2 away.
    const close = act(state, { type: 'move', unit: 'A.m2', to: t('c5') }).state
    expect(code(applyAction(close, skill('A.m2', 'hex', 'B.m2')))).toBe('target-hidden')
    // Burst centred next to it: Quillfox is 2 or more from the user, so it cannot be chosen.
    expect(code(applyAction(close, { type: 'useSkill', unit: 'A.m2', skill: 'burst', tile: t('d7'), targets: ['B.m2'] }))).toBe(
      'target-hidden',
    )
  })

  it('at distance 1 it can be targeted as usual', () => {
    const state = hiddenQuillfox()
    expect(legalActions(state)).toContainEqual({ type: 'basicAttack', unit: 'A.m1', target: 'B.m2' })
    expect(legalUses(state, 'hit_and_run', 'A.m1').map((a) => a.target)).toContain('B.m2')
  })

  it('ends after the Unit makes an attack roll, hit or miss', () => {
    let state = battle({ dice: { rolls: [2] } })
    state = endTurn(endTurn(act(state, skill('B.m2', 'camouflage')).state))
    const { state: after, events } = act(state, skill('B.m2', 'long_shot', 'A.m1'))
    expect(types(events)).toEqual(['skillUsed', 'attackRolled', 'statusEnded'])
    expect(events[1]).toMatchObject({ hit: false })
    expect(events[2]).toEqual({ type: 'statusEnded', unit: 'B.m2', status: 'hidden', cause: 'attackRoll' })
    expect(unit(after, 'B.m2')?.statuses).toEqual([])
  })

  it('a counterattack is an attack roll too: it ends the counterattacker\'s Hidden', () => {
    // Quillfox with Counter (loadout change): Camouflage on Turn 1, Counter on Turn 2; Fangrel attacks it from d6.
    let state = battle({
      tiles: { A: ['a1', 'd6', 'c3'], B: ['g7', 'f3', 'e7'] },
      loadouts: { 'B.m2': ['camouflage', 'counter'] },
      dice: { rolls: [5, 15, 4] },
    })
    state = endTurn(endTurn(act(state, skill('B.m2', 'camouflage')).state))
    state = endTurn(act(state, skill('B.m2', 'counter')).state)
    const { events, state: after } = act(state, { type: 'basicAttack', unit: 'A.m1', target: 'B.m2' })
    expect(types(events)).toEqual(['attackRolled', 'counterattack', 'attackRolled', 'damageDealt', 'statusEnded', 'statusEnded'])
    expect(events[4]).toEqual({ type: 'statusEnded', unit: 'B.m2', status: 'hidden', cause: 'attackRoll' })
    expect(events[5]).toEqual({ type: 'statusEnded', unit: 'B.m2', status: 'countering' })
    expect(unit(after, 'B.m2')?.statuses).toEqual([])
  })

  it('ends when a Move ends off forest; a Move that only passes other tiles keeps it (D-18)', () => {
    const hidden = act(battle(), skill('B.m2', 'camouflage')).state
    const off = act(hidden, { type: 'move', unit: 'B.m2', to: t('e6') })
    expect(off.events).toEqual([
      { type: 'unitMoved', unit: 'B.m2', from: t('e7'), to: t('e6'), path: [t('e6')] },
      { type: 'statusEnded', unit: 'B.m2', status: 'hidden', cause: 'terrain' },
    ])
    // e7 to f4 (forest) through tiles that are not forest.
    const on = act(hidden, { type: 'move', unit: 'B.m2', to: t('f4') })
    expect(types(on.events)).toEqual(['unitMoved'])
    expect(on.events[0]).toMatchObject({ type: 'unitMoved' })
    const path = on.events[0]?.type === 'unitMoved' ? on.events[0].path.map(tileName) : []
    expect(path.slice(0, -1).length).toBeGreaterThan(0)
    expect(unit(on.state, 'B.m2')?.statuses).toEqual([HIDDEN])
  })

  it('ends when a push moves the Unit off forest (rules §6.4)', () => {
    // Quillfox Hidden on f4 (forest); Fangrel with Shield Bash (loadout change) on f5 pushes it to f3.
    let state = battle({
      tiles: { A: ['a1', 'f5', 'c3'], B: ['g7', 'a7', 'f4'] },
      loadouts: { 'A.m1': ['shield_bash'] },
      dice: { rolls: [15, 3, 3] },
    })
    state = endTurn(act(state, skill('B.m2', 'camouflage')).state)
    const { events, state: after } = act(state, skill('A.m1', 'shield_bash', 'B.m2'))
    expect(types(events)).toEqual(['skillUsed', 'attackRolled', 'damageDealt', 'unitPushed', 'statusEnded'])
    expect(events[3]).toMatchObject({ unit: 'B.m2', from: t('f4'), to: t('f3') })
    expect(events[4]).toEqual({ type: 'statusEnded', unit: 'B.m2', status: 'hidden', cause: 'terrain' })
    expect(unit(after, 'B.m2')?.statuses).toEqual([])
  })

  it('is checked for every Unit at the end of every Turn (rules §17.4)', () => {
    // A Hidden Unit off forest (no phase 1 skill makes this before Attune, ticket 11).
    const state = withStatus(battle(), 'B.m1', HIDDEN)
    const { events } = accepted(applyAction(state, { type: 'endTurn' }))
    expect(events).toContainEqual({ type: 'statusEnded', unit: 'B.m1', status: 'hidden', cause: 'terrain' })
    expect(types(events).indexOf('statusEnded')).toBeLessThan(types(events).indexOf('turnStarted'))
  })
})

describe('Replay records and replays Quillfox skills', () => {
  it('Camouflage, Mark, Long Shot and Pin replay to the same Battle', () => {
    const tiles = (side: 'A' | 'B') => {
      const [tamer, m1, m2] = TILES[side].map(t)
      return [tamer!, m1!, m2!] as const
    }
    const header = {
      scenarioId: 'scenario_1',
      boardId: 'crossroads',
      mode: 'hotseat',
      diceSeed: '0123456789abcdef',
      preset: { tiles: { A: tiles('A'), B: tiles('B') }, firstSide: 'B' },
    } as const
    const start = replayBattle(recordReplay(header, kitGameData, []), kitGameData)
    if (!start.ok) throw new Error('replay failed')
    const actions: Action[] = []
    let state = start.final
    const play = (action: Action) => {
      state = accepted(applyAction(state, action)).state
      actions.push(action)
      while (state.pending?.kind === 'inspiration') play({ type: 'declineInspiration', side: state.pending.side })
    }
    play(skill('B.m2', 'camouflage'))
    play({ type: 'endTurn' })
    play({ type: 'endTurn' })
    play(skill('B.m2', 'mark', 'A.m1'))
    play({ type: 'basicAttack', unit: 'B.m1', target: 'A.m1' })
    play({ type: 'endTurn' })
    play({ type: 'endTurn' })
    play(skill('B.m2', 'pin', 'A.m1'))
    play({ type: 'endTurn' })
    play({ type: 'endTurn' })
    play(skill('B.m2', 'long_shot', 'A.m2'))
    const replay = recordReplay(header, kitGameData, actions)
    const first = replayBattle(replay, kitGameData)
    const second = replayBattle(JSON.parse(JSON.stringify(replay)), kitGameData)
    if (!first.ok || !second.ok) throw new Error('replay failed')
    expect(first.final).toEqual(state)
    expect(second.final).toEqual(first.final)
    const events = first.steps.flatMap((s) => s.events)
    expect(events).toContainEqual({ type: 'statusApplied', unit: 'B.m2', status: HIDDEN })
    expect(events).toContainEqual({ type: 'statusEnded', unit: 'B.m2', status: 'hidden', cause: 'attackRoll' })
    expect(events.filter((e) => e.type === 'attackRolled').map((e) => 'skill' in e && e.skill)).toEqual(
      expect.arrayContaining(['mark', 'basic_attack', 'pin', 'long_shot']),
    )
  })
})

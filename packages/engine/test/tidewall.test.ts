import { describe, expect, it } from 'vitest'
import { tileFromName, type Side } from '@mt/shared'
import {
  applyAction,
  decidingSide,
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
} from '../src/index.ts'
import { gameData, kitGameData, NEUTRAL_ELEMENTS, scenario1Battle, type BattleOptions } from './fixtures.ts'

// Tidewall's loadout (rules §15.1): Taunt, Shield Bash, Counter, Pincer Guard.
// Every Monster forest (neutral) and off forest, water and desert tiles, so
// no element or terrain advantage. 1 Star numbers (rules §20.2):
// - Fangrel (A.m1): attack +2, POW mod +2, Guard 11, HP 19, SPI mod −1.
// - Tidewall (B.m1): attack +1, POW mod +1, Guard 11, HP 31, Save DC (VIT) 11.
// Tidewall hits Fangrel on a d20 of 10 or more; Fangrel hits Tidewall on 9 or more.
const TILES = { A: ['a1', 'd4', 'g1'], B: ['a7', 'd5', 'g7'] } as const

function battle(options: BattleOptions = {}): BattleState {
  return scenario1Battle({ elements: NEUTRAL_ELEMENTS, ...options, tiles: { ...TILES, ...options.tiles } })
}

function accepted(result: ApplyResult): { state: BattleState; events: readonly BattleEvent[] } {
  if (!result.ok) throw new Error(result.rejection.message)
  return result
}

const act = (state: BattleState, action: Action) => accepted(applyAction(state, action))
const skill = (unit: UnitId, id: string, target?: UnitId): Action => ({
  type: 'useSkill',
  unit,
  skill: id,
  ...(target !== undefined ? { target } : {}),
})
const attack = (unit: UnitId, target: UnitId): Action => ({ type: 'basicAttack', unit, target })
const move = (unit: UnitId, to: string): Action => ({ type: 'move', unit, to: tileFromName(to) })
const defend = (unit: UnitId): Action => ({ type: 'defend', unit })
const endTurn = (state: BattleState) => act(state, { type: 'endTurn' })
const code = (result: ApplyResult) => (result.ok ? 'accepted' : result.rejection.code)
const types = (events: readonly BattleEvent[]) => events.map((e) => e.type)
const unit = (state: BattleState, id: UnitId) => state.units.find((u) => u.id === id)
const tileOf = (state: BattleState, id: UnitId) => {
  const tile = unit(state, id)?.tile
  return tile === undefined ? undefined : `${'abcdefg'[tile.x]}${tile.y + 1}`
}
const rollsUsed = (state: BattleState) => (state.dice.kind === 'scripted' ? state.dice.position : NaN)
const actionsOf = (state: BattleState, id: UnitId) => legalActions(state).filter((a) => 'unit' in a && a.unit === id)
const has = (state: BattleState, action: Action) =>
  legalActions(state).some((a) => JSON.stringify(a) === JSON.stringify(action))

/** Team B (Tidewall) plays first; team A's Fangrel has Countering when `counterFor` is given. */
function tidewallFirst(options: BattleOptions = {}): BattleState {
  return battle({ firstSide: 'B', ...options })
}

/** Team B's Tidewall uses Counter on its Turn 1, then team A's Turn 1 starts. */
function counteringTidewall(options: BattleOptions = {}): BattleState {
  const used = act(tidewallFirst(options), skill('B.m1', 'counter'))
  return endTurn(used.state).state
}

describe('Shield Bash: 2d6 + POW mod, then push 1 tile (rules §6.4, §15.1)', () => {
  it('hits for 2d6 + POW mod and pushes straight away from Tidewall; the push is not a Move and uses no dice', () => {
    const { state, events } = act(tidewallFirst({ dice: { rolls: [15, 3, 4] } }), skill('B.m1', 'shield_bash', 'A.m1'))
    expect(types(events)).toEqual(['skillUsed', 'attackRolled', 'damageDealt', 'unitPushed'])
    expect(events[1]).toMatchObject({ attacker: 'B.m1', target: 'A.m1', natural: 15, total: 16, hit: true })
    expect(events[2]).toMatchObject({ dice: { count: 2, sides: 6 }, rolls: [3, 4], modifier: 1, amount: 8, hpAfter: 11 })
    expect(events[3]).toEqual({ type: 'unitPushed', unit: 'A.m1', by: 'B.m1', from: tileFromName('d4'), to: tileFromName('d3') })
    expect(tileOf(state, 'A.m1')).toBe('d3')
    expect(rollsUsed(state)).toBe(3)
    expect(unit(state, 'A.m1')).toMatchObject({ hasMoved: false, hasActed: false })
    expect(unit(state, 'B.m1')).toMatchObject({ hasActed: true, skillsUsed: { shield_bash: 1 } })
  })

  it('a Minor skill: no cooldown', () => {
    const { state } = act(tidewallFirst({ dice: { rolls: [2] } }), skill('B.m1', 'shield_bash', 'A.m1'))
    expect(unitSkills(state, 'B.m1').find((s) => s.skill === 'shield_bash')).toMatchObject({ tier: 'minor', cooldown: 0 })
  })

  it('pushes diagonally when the target is diagonally adjacent', () => {
    const state = tidewallFirst({ tiles: { B: ['a7', 'e5', 'g7'] }, dice: { rolls: [15, 1, 1] } })
    const { events, state: after } = act(state, skill('B.m1', 'shield_bash', 'A.m1'))
    expect(events.at(-1)).toEqual({ type: 'unitPushed', unit: 'A.m1', by: 'B.m1', from: tileFromName('d4'), to: tileFromName('c3') })
    expect(tileOf(after, 'A.m1')).toBe('c3')
  })

  it('does not push into a tile with a Unit on it, and nothing else happens instead', () => {
    const state = tidewallFirst({ tiles: { A: ['d3', 'd4', 'g1'] }, dice: { rolls: [15, 1, 1] } })
    const { events, state: after } = act(state, skill('B.m1', 'shield_bash', 'A.m1'))
    expect(types(events)).toEqual(['skillUsed', 'attackRolled', 'damageDealt', 'pushBlocked'])
    expect(events[3]).toEqual({ type: 'pushBlocked', unit: 'A.m1', by: 'B.m1', tile: tileFromName('d3'), blockedBy: 'A.tamer' })
    expect(tileOf(after, 'A.m1')).toBe('d4')
    expect(unit(after, 'A.m1')?.hp).toBe(16)
    expect(rollsUsed(after)).toBe(3)
  })

  it('does not push off the Board (straight or diagonal)', () => {
    for (const [fangrel, tidewall] of [
      ['a1', 'b2'],
      ['a2', 'b2'],
    ] as const) {
      const state = tidewallFirst({ tiles: { A: ['e1', fangrel, 'g1'], B: ['a7', tidewall, 'g7'] }, dice: { rolls: [15, 1, 1] } })
      const { events, state: after } = act(state, skill('B.m1', 'shield_bash', 'A.m1'))
      expect(events.at(-1)).toMatchObject({ type: 'pushBlocked', unit: 'A.m1', blockedBy: 'offBoard' })
      expect(tileOf(after, 'A.m1')).toBe(fangrel)
    }
  })

  it('a miss neither damages nor pushes', () => {
    const { state, events } = act(tidewallFirst({ dice: { rolls: [9] } }), skill('B.m1', 'shield_bash', 'A.m1'))
    expect(types(events)).toEqual(['skillUsed', 'attackRolled'])
    expect(tileOf(state, 'A.m1')).toBe('d4')
  })

  it('a target that goes down is not pushed', () => {
    // Critical: 4d6 + 1 = 25 against Fangrel's 19 HP.
    const { events } = act(tidewallFirst({ dice: { rolls: [20, 6, 6, 6, 6] } }), skill('B.m1', 'shield_bash', 'A.m1'))
    expect(types(events)).toEqual(['skillUsed', 'attackRolled', 'damageDealt', 'unitDown'])
  })

  it('a Pinned Unit is still pushed (rules §6.4, §14.2), though it cannot Move', () => {
    // Tidewall with a Rend that gives Pin for 2 Turns (data change only) on Turn 1, Shield Bash on Turn 2.
    let state = tidewallFirst({
      loadouts: { 'B.m1': ['rend', 'shield_bash'] },
      skills: { rend: { applies: [{ status: 'pin', save: 'vit' }] } },
      statuses: { pin: { duration: { kind: 'turns', turns: 2 } } },
      dice: { rolls: [15, 1, 1, 15, 1, 1] },
    })
    state = act(state, skill('B.m1', 'rend', 'A.m1')).state
    state = endTurn(endTurn(state).state).state // team A's Turn 1, then team B's Turn 2
    expect(unit(state, 'A.m1')?.statuses).toContainEqual({ id: 'pin', turnsLeft: 1 })
    const { events, state: after } = act(state, skill('B.m1', 'shield_bash', 'A.m1'))
    expect(events.at(-1)).toMatchObject({ type: 'unitPushed', unit: 'A.m1', to: tileFromName('d3') })
    expect(tileOf(after, 'A.m1')).toBe('d3')
    expect(unit(after, 'A.m1')?.statuses).toContainEqual({ id: 'pin', turnsLeft: 1 })
  })

  it('the counterattack of a Countering target resolves before the push (ruling round 3, rules §10.5 steps 6–7)', () => {
    // Team A's Fangrel with Counter (loadout change) uses it on team A's Turn 1.
    let state = battle({ loadouts: { 'A.m1': ['counter'] }, dice: { rolls: [15, 3, 4, 15, 5] } })
    state = endTurn(act(state, skill('A.m1', 'counter')).state).state
    const { events, state: after } = act(state, skill('B.m1', 'shield_bash', 'A.m1'))
    expect(types(events)).toEqual([
      'skillUsed',
      'attackRolled',
      'damageDealt',
      'counterattack',
      'attackRolled',
      'damageDealt',
      'statusEnded',
      'unitPushed',
    ])
    expect(events[3]).toEqual({ type: 'counterattack', unit: 'A.m1', target: 'B.m1', dice: { count: 1, sides: 8 } })
    expect(events[4]).toMatchObject({ attacker: 'A.m1', target: 'B.m1', skill: 'counterattack', natural: 15, hit: true })
    expect(events[5]).toMatchObject({ source: 'A.m1', target: 'B.m1', rolls: [5], modifier: 2, amount: 7, hpAfter: 24 })
    expect(events[6]).toEqual({ type: 'statusEnded', unit: 'A.m1', status: 'countering' })
    expect(tileOf(after, 'A.m1')).toBe('d3')
  })

  it('no push when the counterattack downs Tidewall', () => {
    // Fangrel with Counter and Pincer Guard: a critical counterattack, 4d8 + 2 = 34 against 31 HP.
    let state = battle({ loadouts: { 'A.m1': ['counter', 'pincer_guard'] }, dice: { rolls: [15, 1, 1, 20, 8, 8, 8, 8] } })
    state = endTurn(act(state, skill('A.m1', 'counter')).state).state
    const { events, state: after } = act(state, skill('B.m1', 'shield_bash', 'A.m1'))
    expect(types(events).slice(-5)).toEqual(['counterattack', 'attackRolled', 'damageDealt', 'unitDown', 'statusEnded'])
    expect(tileOf(after, 'A.m1')).toBe('d4')
    expect(after.outcome).toBeNull()
  })

  it('preview: hit chance and 2d6 + POW mod damage, without rolling', () => {
    const state = tidewallFirst({ dice: { rolls: [] } })
    const result = previewAction(state, skill('B.m1', 'shield_bash', 'A.m1'))
    if (!result.ok || result.preview?.type !== 'attack') throw new Error('expected an attack preview')
    expect(result.preview).toMatchObject({
      skill: 'shield_bash',
      attackBonus: 1,
      defence: 11,
      hitChance: { numerator: 11, denominator: 20 },
      damage: { dice: { count: 2, sides: 6 }, modifier: 1, min: 3, max: 13 },
      criticalDamage: { dice: { count: 4, sides: 6 }, modifier: 1, min: 5, max: 25 },
    })
    expect(result.preview.counterattack).toBeUndefined()
  })
})

describe('Counter and Countering (rules §14.2, D-23)', () => {
  it('Counter is a Minor skill on Tidewall itself: Countering, until the start of its side\'s next Turn', () => {
    const state = tidewallFirst()
    expect(previewAction(state, skill('B.m1', 'counter'))).toEqual({
      ok: true,
      preview: { type: 'effect', skill: 'counter', user: 'B.m1', units: ['B.m1'], statuses: ['countering'] },
    })
    const { state: after, events } = act(state, skill('B.m1', 'counter'))
    expect(events).toEqual([
      { type: 'skillUsed', unit: 'B.m1', skill: 'counter', targets: ['B.m1'] },
      { type: 'statusApplied', unit: 'B.m1', status: { id: 'countering' } },
    ])
    expect(unit(after, 'B.m1')?.hasActed).toBe(true)
    // Through team A's Turn; ends when team B's next Turn starts.
    const teamA = endTurn(after)
    expect(unit(teamA.state, 'B.m1')?.statuses).toEqual([{ id: 'countering' }])
    const teamB = endTurn(teamA.state)
    expect(teamB.events).toContainEqual({ type: 'statusEnded', unit: 'B.m1', status: 'countering' })
    expect(unit(teamB.state, 'B.m1')?.statuses).toEqual([])
  })

  it('an attack that hits from distance 1 is answered with a counterattack: 2d8 + POW mod with Pincer Guard', () => {
    const state = counteringTidewall({ dice: { rolls: [15, 4, 12, 3, 5] } })
    const { events, state: after } = act(state, attack('A.m1', 'B.m1'))
    expect(types(events)).toEqual(['attackRolled', 'damageDealt', 'counterattack', 'attackRolled', 'damageDealt', 'statusEnded'])
    expect(events[2]).toEqual({ type: 'counterattack', unit: 'B.m1', target: 'A.m1', dice: { count: 2, sides: 8 } })
    expect(events[3]).toMatchObject({ attacker: 'B.m1', target: 'A.m1', skill: 'counterattack', natural: 12, total: 13, defence: 11, hit: true })
    expect(events[4]).toMatchObject({ source: 'B.m1', target: 'A.m1', skill: 'counterattack', dice: { count: 2, sides: 8 }, rolls: [3, 5], modifier: 1, amount: 9, hpAfter: 10 })
    expect(events[5]).toEqual({ type: 'statusEnded', unit: 'B.m1', status: 'countering' })
    expect(unit(after, 'B.m1')?.statuses).toEqual([])
    expect(rollsUsed(after)).toBe(5)
    // Counts as team B's damage (rules §19.2).
    expect(after.damageDealt).toEqual({ A: 6, B: 9 })
  })

  it('a miss is answered too (D-23)', () => {
    const { events } = act(counteringTidewall({ dice: { rolls: [2, 15, 3, 5] } }), attack('A.m1', 'B.m1'))
    expect(types(events)).toEqual(['attackRolled', 'counterattack', 'attackRolled', 'damageDealt', 'statusEnded'])
    expect(events[0]).toMatchObject({ hit: false })
  })

  it('without Pincer Guard the counterattack rolls Countering\'s own 1d8', () => {
    const state = counteringTidewall({ loadouts: { 'B.m1': ['counter'] }, dice: { rolls: [15, 4, 12, 3] } })
    const { events } = act(state, attack('A.m1', 'B.m1'))
    expect(events[2]).toMatchObject({ type: 'counterattack', dice: { count: 1, sides: 8 } })
    expect(events[4]).toMatchObject({ dice: { count: 1, sides: 8 }, rolls: [3], amount: 4 })
  })

  it('a counterattack can miss and roll a critical like any attack roll', () => {
    const missed = act(counteringTidewall({ dice: { rolls: [15, 4, 1] } }), attack('A.m1', 'B.m1'))
    expect(types(missed.events).slice(2)).toEqual(['counterattack', 'attackRolled', 'statusEnded'])
    const critical = act(counteringTidewall({ dice: { rolls: [15, 4, 20, 1, 2, 3, 4] } }), attack('A.m1', 'B.m1'))
    expect(critical.events[4]).toMatchObject({ dice: { count: 4, sides: 8 }, rolls: [1, 2, 3, 4], amount: 11 })
  })

  it('counterattacks once: the next attack gets none', () => {
    let state = counteringTidewall({ tiles: { A: ['a1', 'd4', 'e4'] }, dice: { rolls: [15, 4, 12, 3, 5, 15, 4] } })
    state = act(state, attack('A.m1', 'B.m1')).state
    const second = act(state, attack('A.m2', 'B.m1'))
    expect(types(second.events)).toEqual(['attackRolled', 'damageDealt'])
  })

  it('no counterattack against an attack from distance 2 (a longer Basic Attack, data change only)', () => {
    const state = counteringTidewall({ tiles: { A: ['a1', 'd3', 'g1'] }, skills: { basic_attack: { range: 2 } }, dice: { rolls: [15, 4] } })
    const { events, state: after } = act(state, attack('A.m1', 'B.m1'))
    expect(types(events)).toEqual(['attackRolled', 'damageDealt'])
    expect(unit(after, 'B.m1')?.statuses).toEqual([{ id: 'countering' }])
  })

  it('no counterattack when the attack downs the Countering Unit', () => {
    // A critical Heavy Blow: 4d8 + 2 = 34 against Tidewall's 31 HP.
    const { events } = act(counteringTidewall({ dice: { rolls: [20, 8, 8, 8, 8] } }), skill('A.m1', 'heavy_blow', 'B.m1'))
    expect(types(events)).toEqual(['skillUsed', 'attackRolled', 'damageDealt', 'unitDown'])
  })

  it('a skill with a save is not an attack: Taunt on a Countering Unit gets no counterattack', () => {
    let state = battle({ loadouts: { 'A.m1': ['counter'] }, dice: { rolls: [5] } })
    state = endTurn(act(state, skill('A.m1', 'counter')).state).state
    const { events } = act(state, skill('B.m1', 'taunt', 'A.m1'))
    expect(types(events)).toEqual(['skillUsed', 'saveRolled', 'statusApplied'])
  })

  it('a counterattack never triggers another (rules §14.2), even against a Countering attacker', () => {
    // Countering for 1 Turn instead of until the next Turn (data change only), so Fangrel still has it on its own Turn 2.
    let state = battle({
      loadouts: { 'A.m1': ['counter'] },
      statuses: { countering: { duration: { kind: 'turns', turns: 1 } } },
      dice: { rolls: [15, 4, 12, 3, 5] },
    })
    state = endTurn(act(state, skill('A.m1', 'counter')).state).state
    state = endTurn(act(state, skill('B.m1', 'counter')).state).state
    expect(unit(state, 'A.m1')?.statuses.map((s) => s.id)).toEqual(['countering'])
    const { events, state: after } = act(state, attack('A.m1', 'B.m1'))
    expect(types(events).filter((t) => t === 'counterattack')).toHaveLength(1)
    expect(unit(after, 'A.m1')?.statuses.map((s) => s.id)).toEqual(['countering'])
  })

  it('Hit and Run\'s step comes after the counterattack (rules §15.1)', () => {
    const { events, state } = act(counteringTidewall({ dice: { rolls: [15, 4, 12, 3, 5] } }), skill('A.m1', 'hit_and_run', 'B.m1'))
    expect(types(events).slice(-4)).toEqual(['counterattack', 'attackRolled', 'damageDealt', 'statusEnded'])
    expect(state.pending).toMatchObject({ kind: 'retreat', unit: 'A.m1' })
  })

  it('the counterattack\'s d20 belongs to Tidewall\'s side, which may reroll it with Inspiration (rules §18)', () => {
    const both: Readonly<Record<Side, boolean>> = { A: true, B: true }
    let state = counteringTidewall({ inspiration: both, dice: { rolls: [15, 4, 12, 18, 2, 6] } })
    let step = act(state, attack('A.m1', 'B.m1'))
    expect(step.state.pending).toMatchObject({ kind: 'inspiration', side: 'A' })
    step = act(step.state, { type: 'declineInspiration', side: 'A' })
    expect(types(step.events)).toEqual(['inspirationDeclined', 'damageDealt', 'counterattack', 'attackRolled', 'inspirationOffered'])
    state = step.state
    expect(state.pending).toMatchObject({ kind: 'inspiration', side: 'B', roll: { attacker: 'B.m1', skill: 'counterattack', natural: 12 } })
    expect(decidingSide(state)).toBe('B')
    expect(state.sideToAct).toBe('A')
    step = act(state, { type: 'useInspiration', side: 'B' })
    expect(types(step.events)).toEqual(['inspirationUsed', 'attackRolled', 'damageDealt', 'statusEnded'])
    expect(step.events[1]).toMatchObject({ natural: 18, rerolled: true })
    expect(step.events[2]).toMatchObject({ rolls: [2, 6], amount: 9 })
    expect(step.state.inspiration).toEqual({ A: true, B: false })
    expect(step.state.pending).toBeNull()
  })

  it('preview of an attack on a Countering Unit at distance 1 shows the counterattack it will get', () => {
    const state = counteringTidewall()
    const result = previewAction(state, attack('A.m1', 'B.m1'))
    if (!result.ok || result.preview?.type !== 'attack') throw new Error('expected an attack preview')
    expect(result.preview.counterattack).toMatchObject({
      skill: 'counterattack',
      attacker: 'B.m1',
      target: 'A.m1',
      attackBonus: 1,
      defence: 11,
      hitChance: { numerator: 11, denominator: 20 },
      damage: { dice: { count: 2, sides: 8 }, modifier: 1, min: 3, max: 17 },
      criticalDamage: { dice: { count: 4, sides: 8 }, modifier: 1, min: 5, max: 33 },
    })
    expect(result.preview.counterattack?.counterattack).toBeUndefined()
  })
})

describe('Pincer Guard: Passive (rules §13.1, §15.1)', () => {
  it('is never used, takes no Action and has no cooldown', () => {
    const state = tidewallFirst()
    expect(unitSkills(state, 'B.m1').find((s) => s.skill === 'pincer_guard')).toEqual({
      skill: 'pincer_guard',
      tier: 'passive',
      cooldown: 0,
      spent: false,
      implemented: false,
    })
    expect(code(applyAction(state, skill('B.m1', 'pincer_guard')))).toBe('skill-not-available')
    expect(actionsOf(state, 'B.m1').some((a) => a.type === 'useSkill' && a.skill === 'pincer_guard')).toBe(false)
  })

  it('works on every counterattack, Turn after Turn, without being booked', () => {
    let state = counteringTidewall({ dice: { rolls: [15, 4, 12, 3, 5, 15, 4, 12, 3, 5] } })
    state = act(state, attack('A.m1', 'B.m1')).state
    state = endTurn(state).state
    expect(unit(state, 'B.m1')?.skillsUsed).toEqual({ counter: 1 })
    state = endTurn(act(state, skill('B.m1', 'counter')).state).state
    const { events } = act(state, attack('A.m1', 'B.m1'))
    expect(events[2]).toMatchObject({ type: 'counterattack', dice: { count: 2, sides: 8 } })
  })
})

describe('Taunt and Taunted (rules §14.3, D-05)', () => {
  // Quillfox (B.m2) on c5, also next to Fangrel on d4.
  const NEXT_TO_BOTH = { A: ['a1', 'd4', 'g1'], B: ['a7', 'd5', 'c5'] } as const

  function taunted(options: BattleOptions = {}, target: UnitId = 'A.m1'): { state: BattleState; events: readonly BattleEvent[] } {
    // Fangrel's save: d20 − 1 against 11; a 5 fails.
    return act(tidewallFirst({ dice: { rolls: [5] }, ...options }), skill('B.m1', 'taunt', target))
  }

  it('save SPI against Tidewall\'s VIT Save DC; a failed save gives Taunted 1 with Tidewall as taunter', () => {
    const state = tidewallFirst({ tiles: NEXT_TO_BOTH, dice: { rolls: [5] } })
    expect(previewAction(state, skill('B.m1', 'taunt', 'A.m1'))).toEqual({
      ok: true,
      preview: {
        type: 'save',
        skill: 'taunt',
        user: 'B.m1',
        target: 'A.m1',
        statuses: [
          { status: 'taunted', target: 'A.m1', save: { stat: 'spi', dc: 11, modifier: -1, failChance: { numerator: 11, denominator: 20 } } },
        ],
      },
    })
    const { events, state: after } = act(state, skill('B.m1', 'taunt', 'A.m1'))
    expect(events[1]).toMatchObject({ type: 'saveRolled', unit: 'A.m1', stat: 'spi', roll: 5, total: 4, dc: 11, saved: false })
    expect(events[2]).toEqual({ type: 'statusApplied', unit: 'A.m1', status: { id: 'taunted', turnsLeft: 1, source: 'B.m1' } })
    expect(unitSkills(after, 'B.m1').find((s) => s.skill === 'taunt')?.cooldown).toBe(2)
  })

  it('a passed save gives nothing', () => {
    const { events } = taunted({ dice: { rolls: [12] } })
    expect(types(events)).toEqual(['skillUsed', 'saveRolled'])
  })

  it('reaches 3 tiles and needs line of sight', () => {
    expect(code(applyAction(tidewallFirst({ tiles: { A: ['a1', 'd2', 'g1'] } }), skill('B.m1', 'taunt', 'A.m1')))).toBe('accepted')
    expect(code(applyAction(tidewallFirst({ tiles: { A: ['a1', 'd1', 'g1'] } }), skill('B.m1', 'taunt', 'A.m1')))).toBe('out-of-range')
    expect(code(applyAction(tidewallFirst({ tiles: { A: ['d3', 'd2', 'g1'] } }), skill('B.m1', 'taunt', 'A.m1')))).toBe('no-line-of-sight')
  })

  it('lasts through the Taunted Unit\'s next Turn and ends when that Turn ends', () => {
    let state = endTurn(taunted().state).state
    expect(unit(state, 'A.m1')?.statuses).toEqual([{ id: 'taunted', turnsLeft: 1, source: 'B.m1' }])
    const ended = endTurn(state)
    expect(ended.events).toContainEqual({ type: 'statusEnded', unit: 'A.m1', status: 'taunted' })
    state = ended.state
    expect(unit(state, 'A.m1')?.statuses).toEqual([])
  })

  it('when it can attack the taunter, its Action must be an attack on the taunter', () => {
    const state = endTurn(taunted({ tiles: NEXT_TO_BOTH }).state).state
    const actions = actionsOf(state, 'A.m1').filter((a) => a.type !== 'move')
    expect(actions).toEqual([
      attack('A.m1', 'B.m1'),
      skill('A.m1', 'heavy_blow', 'B.m1'),
      skill('A.m1', 'rend', 'B.m1'),
      skill('A.m1', 'hit_and_run', 'B.m1'),
    ])
    for (const forbidden of [attack('A.m1', 'B.m2'), skill('A.m1', 'heavy_blow', 'B.m2'), skill('A.m1', 'pack_howl'), defend('A.m1')]) {
      expect(code(applyAction(state, forbidden))).toBe('taunted')
    }
    expect(previewAction(state, attack('A.m1', 'B.m2'))).toMatchObject({ ok: false, rejection: { code: 'taunted' } })
    expect(previewAction(state, attack('A.m1', 'B.m1')).ok).toBe(true)
    // Its Move is free.
    expect(code(applyAction(state, move('A.m1', 'b2')))).toBe('accepted')
  })

  it('binds only the Taunted Unit, and its side may still end the Turn without it acting', () => {
    const state = endTurn(taunted({ tiles: NEXT_TO_BOTH }).state).state
    expect(has(state, defend('A.m2'))).toBe(true)
    expect(has(state, defend('A.tamer'))).toBe(true)
    expect(has(state, { type: 'endTurn' })).toBe(true)
    expect(endTurn(state).state.sideToAct).toBe('B')
  })

  it('counts an attack possible after its Move: Move then attack the taunter', () => {
    // Fangrel on d2, 3 tiles from Tidewall: it can walk next to it.
    let state = endTurn(taunted({ tiles: { A: ['a1', 'd2', 'g1'] }, dice: { rolls: [5, 2] } }).state).state
    expect(actionsOf(state, 'A.m1').every((a) => a.type === 'move')).toBe(true)
    expect(code(applyAction(state, defend('A.m1')))).toBe('taunted')
    state = act(state, move('A.m1', 'd4')).state
    expect(code(applyAction(state, attack('A.m1', 'B.m1')))).toBe('accepted')
  })

  it('moving out of reach does not free its Action for anything else', () => {
    let state = endTurn(taunted({ tiles: { A: ['a1', 'd2', 'g1'] } }).state).state
    state = act(state, move('A.m1', 'a2')).state
    expect(actionsOf(state, 'A.m1')).toEqual([])
    expect(code(applyAction(state, defend('A.m1')))).toBe('taunted')
    expect(code(applyAction(state, skill('A.m1', 'pack_howl')))).toBe('taunted')
  })

  it('once it has attacked the taunter, its Move is free', () => {
    let state = endTurn(taunted({ tiles: NEXT_TO_BOTH, dice: { rolls: [5, 2] } }).state).state
    state = act(state, attack('A.m1', 'B.m1')).state
    expect(code(applyAction(state, move('A.m1', 'g4')))).toBe('accepted')
  })

  it('when it cannot reach the taunter, it may only Move to a tile closest to it and use no attack', () => {
    // The Tamer of team A (Move 3) on a1, taunted from d4; Tidewall then walks to f6, 5 tiles away.
    let state = tidewallFirst({ tiles: { A: ['a1', 'f1', 'g1'], B: ['a7', 'd4', 'g4'] }, dice: { rolls: [5] } })
    state = act(state, skill('B.m1', 'taunt', 'A.tamer')).state
    state = act(state, move('B.m1', 'f6')).state
    state = endTurn(state).state
    const actions = actionsOf(state, 'A.tamer')
    expect(actions.filter((a) => a.type !== 'useSkill')).toEqual([move('A.tamer', 'd4'), defend('A.tamer')])
    // Skills that are not attacks stay open (ticket 11): Attune on the 3 tiles next to a1, First Aid on itself.
    expect(new Set(actions.flatMap((a) => (a.type === 'useSkill' ? [a.skill] : [])))).toEqual(new Set(['attune', 'first_aid']))
    expect(code(applyAction(state, move('A.tamer', 'b1')))).toBe('taunted')
    // Defend first (not an attack), then the Move must still close in.
    state = act(state, defend('A.tamer')).state
    expect(code(applyAction(state, move('A.tamer', 'b1')))).toBe('taunted')
    expect(code(applyAction(state, move('A.tamer', 'd4')))).toBe('accepted')
    // Other Units are not bound.
    expect(has(state, move('A.m1', 'f2'))).toBe(true)
  })

  it('in that case it may not attack anyone else either', () => {
    // Team A's Tamer on a2 with Quillfox next to it on b1; Tidewall on d4 walks to f6 after the Taunt.
    let state = tidewallFirst({ tiles: { A: ['a2', 'f1', 'g1'], B: ['a7', 'd4', 'b1'] }, dice: { rolls: [5] } })
    state = act(state, skill('B.m1', 'taunt', 'A.tamer')).state
    state = endTurn(act(state, move('B.m1', 'f6')).state).state
    // The Tamer (Move 3) from a2 can get no closer than 2 tiles from f6.
    expect(code(applyAction(state, attack('A.tamer', 'B.m2')))).toBe('taunted')
    expect(has(state, attack('A.tamer', 'B.m2'))).toBe(false)
    expect(code(applyAction(state, defend('A.tamer')))).toBe('accepted')
  })

  it('has no effect once the taunter has fallen', () => {
    // Quillfox (B.m2, HP 19) with Taunt (loadout change) taunts Wispling on b3; Fangrel then downs Quillfox.
    let state = tidewallFirst({
      tiles: { A: ['a1', 'd4', 'b3'], B: ['a7', 'g7', 'd5'] },
      loadouts: { 'B.m2': ['taunt'] },
      dice: { rolls: [3, 20, 8, 8, 8, 8] },
    })
    state = endTurn(act(state, skill('B.m2', 'taunt', 'A.m2')).state).state
    expect(unit(state, 'A.m2')?.statuses).toEqual([{ id: 'taunted', turnsLeft: 1, source: 'B.m2' }])
    expect(has(state, defend('A.m2'))).toBe(false)
    state = act(state, skill('A.m1', 'heavy_blow', 'B.m2')).state
    expect(unit(state, 'B.m2')).toBeUndefined()
    expect(has(state, defend('A.m2'))).toBe(true)
    expect(code(applyAction(state, defend('A.m2')))).toBe('accepted')
  })

  it('every legal action of a Taunted Unit is accepted', () => {
    const state = endTurn(taunted({ tiles: NEXT_TO_BOTH, dice: { rolls: [5, 8, 3, 4, 5, 6] } }).state).state
    for (const action of legalActions(state)) expect(applyAction(state, action).ok, JSON.stringify(action)).toBe(true)
  })
})

describe('Replay with Tidewall\'s skills', () => {
  it('Counter, a counterattack, Shield Bash and Taunt replay to the same Battle', () => {
    const tiles = (side: 'A' | 'B') => {
      const [tamer, m1, m2] = TILES[side].map(tileFromName)
      return [tamer!, m1!, m2!] as const
    }
    const header = {
      scenarioId: 'scenario_1',
      boardId: 'crossroads',
      mode: 'hotseat',
      diceSeed: '0123456789abcdef',
      preset: { tiles: { A: tiles('A'), B: tiles('B') }, firstSide: 'B' },
    } as const
    // A Replay's Battle has Inspiration: every attack roll and save pauses for its side's answer.
    const actions: Action[] = [
      skill('B.m1', 'counter'),
      { type: 'endTurn' },
      attack('A.m1', 'B.m1'),
      { type: 'declineInspiration', side: 'A' },
      { type: 'declineInspiration', side: 'B' },
      { type: 'endTurn' },
      skill('B.m1', 'taunt', 'A.m1'),
      { type: 'declineInspiration', side: 'A' },
      { type: 'endTurn' },
      { type: 'endTurn' },
      skill('B.m1', 'shield_bash', 'A.m1'),
      { type: 'declineInspiration', side: 'B' },
    ]
    const replay = recordReplay(header, kitGameData, actions)
    const first = replayBattle(replay, kitGameData)
    const second = replayBattle(JSON.parse(JSON.stringify(replay)), kitGameData)
    if (!first.ok || !second.ok) throw new Error(JSON.stringify(first.ok ? second : first))
    const all = first.steps.flatMap((s) => types(s.events))
    expect(all.filter((t) => ['counterattack', 'saveRolled', 'unitPushed'].includes(t))).toEqual(['counterattack', 'saveRolled', 'unitPushed'])
    expect(first.final.units.find((u) => u.id === 'A.m1')?.tile).toEqual(tileFromName('d3'))
    expect(second.final).toEqual(first.final)
  })
})

describe('Tidewall with Wispling (ticket 09)', () => {
  // Fangrel on d4 and Wispling on e4, both next to Tidewall on d5. Wispling 1 Star:
  // elemental attack +2 against Ward 11, Burst 1d6 + INT mod +2, Guard 11, HP 17.
  const NEXT = { A: ['a1', 'd4', 'e4'], B: ['a7', 'd5', 'g7'] } as const
  const burst = (centre: string, targets: UnitId[]): Action => ({
    type: 'useSkill',
    unit: 'A.m2',
    skill: 'burst',
    tile: tileFromName(centre),
    targets,
  })

  it('Burst from distance 1 is answered with a counterattack (D-23)', () => {
    const state = counteringTidewall({ tiles: NEXT, dice: { rolls: [15, 3, 12, 3, 5] } })
    const { events } = act(state, burst('d5', ['B.m1']))
    expect(types(events)).toEqual([
      'skillUsed',
      'attackRolled',
      'damageDealt',
      'counterattack',
      'attackRolled',
      'damageDealt',
      'statusEnded',
    ])
    expect(events[3]).toMatchObject({ unit: 'B.m1', target: 'A.m2' })
  })

  it('Burst from distance 2 is not', () => {
    const state = counteringTidewall({ tiles: { A: ['a1', 'g1', 'd3'] }, dice: { rolls: [15, 3] } })
    const { events } = act(state, burst('d5', ['B.m1']))
    expect(types(events)).toEqual(['skillUsed', 'attackRolled', 'damageDealt'])
  })

  it('a Weakened Tidewall\'s counterattack deals 2 less', () => {
    // Team A's Turn 1: Wispling's Hex (Tidewall saves d20 + 1 against 11; a 3 fails), then Fangrel attacks.
    let state = counteringTidewall({ tiles: NEXT, dice: { rolls: [3, 15, 4, 12, 3, 5] } })
    state = act(state, skill('A.m2', 'hex', 'B.m1')).state
    expect(unit(state, 'B.m1')?.statuses.map((s) => s.id)).toContain('weakened')
    const { events } = act(state, attack('A.m1', 'B.m1'))
    expect(events[4]).toMatchObject({ type: 'damageDealt', source: 'B.m1', rolls: [3, 5], modifier: -2, amount: 6 })
  })

  it('a Taunted Wispling\'s Burst meets the taunt only with the taunter among its targets', () => {
    // Wispling on d3 (2 tiles from Tidewall), Quillfox on c5 next to Tidewall; Wispling's save: d20 + 1 against 11.
    let state = tidewallFirst({ tiles: { A: ['a1', 'g1', 'd3'], B: ['a7', 'd5', 'c5'] }, dice: { rolls: [5, 15, 3, 15, 3] } })
    state = endTurn(act(state, skill('B.m1', 'taunt', 'A.m2')).state).state
    expect(code(applyAction(state, burst('c5', ['B.m2'])))).toBe('taunted')
    expect(code(applyAction(state, skill('A.m2', 'element_bolt', 'B.m2')))).toBe('taunted')
    expect(code(applyAction(state, skill('A.m2', 'hex', 'B.m1')))).toBe('taunted')
    expect(code(applyAction(state, burst('c5', ['B.m2', 'B.m1'])))).toBe('accepted')
    expect(code(applyAction(state, skill('A.m2', 'element_bolt', 'B.m1')))).toBe('accepted')
    const bursts = legalActions(state).filter((a) => a.type === 'useSkill' && a.skill === 'burst')
    expect(bursts.length).toBeGreaterThan(0)
    expect(bursts.every((a) => a.type === 'useSkill' && (a.targets ?? []).includes('B.m1'))).toBe(true)
  })

  it('an attack possible only after Blink still binds the Taunted Unit (rules §14.3 item 1)', () => {
    // Quillfox (B.m2, a Rend that gives Pin: data change only) pins Wispling on a1; Tidewall taunts it
    // from d4 and walks to f6. Pinned, Wispling can only Blink: to c3, from where Element Bolt (range 4) reaches f6.
    let state = tidewallFirst({
      tiles: { A: ['g1', 'g2', 'a1'], B: ['a7', 'd4', 'a2'] },
      loadouts: { 'B.m2': ['rend'] },
      skills: { rend: { applies: [{ status: 'pin', save: 'vit' }] } },
      dice: { rolls: [15, 1, 1, 5, 15, 3] },
    })
    state = act(state, skill('B.m2', 'rend', 'A.m2')).state
    state = act(state, skill('B.m1', 'taunt', 'A.m2')).state
    state = endTurn(act(state, move('B.m1', 'f6')).state).state
    expect(unit(state, 'A.m2')?.statuses.map((s) => s.id).sort()).toEqual(['pin', 'taunted'])
    expect(code(applyAction(state, defend('A.m2')))).toBe('taunted')
    expect(code(applyAction(state, skill('A.m2', 'element_bolt', 'B.m2')))).toBe('taunted')
    state = act(state, { type: 'useSkill', unit: 'A.m2', skill: 'blink', tile: tileFromName('c3') }).state
    expect(code(applyAction(state, skill('A.m2', 'element_bolt', 'B.m1')))).toBe('accepted')
  })
})

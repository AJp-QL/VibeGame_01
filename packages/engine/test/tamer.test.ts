import { describe, expect, it } from 'vitest'
import { tileFromName, type Element, type Tile } from '@mt/shared'
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
  type CommandOption,
  type UnitId,
  type UnitStatus,
} from '../src/index.ts'
import { gameData, NEUTRAL_ELEMENTS, scenario1Battle, type BattleOptions } from './fixtures.ts'

// Scenario 1, every Monster forest (neutral to each other; NEUTRAL_ELEMENTS).
// Tamer (both sides): HP 25, Guard 11, attack +3, proficiency 2, SPI 12 (mod +1): Save DC (SPI) 11, Move 3.
// Fangrel (A.m1): HP 19, Guard 11, attack +2, POW mod +2, Move 4, Ground.
// Wispling (A.m2): HP 17, attack +2, INT mod +2, Flying.
// Tidewall (B.m1): HP 31, Guard 11, Ward 11, Move 2, Aquatic.
// Quillfox (B.m2): HP 19, Guard 11, Ward 9, attack +3, SEN mod +2 (Pin DC 11), SPI 8 (mod −1).
// Crossroads: c1, b4, f4, a5, g3, e7 forest; e1, a3, g5, c7 water; b2, f6 mountain; f2, b6 desert;
// d3, d5 light; d4 dark; every other tile normal.

const t = (name: string): Tile => tileFromName(name)
const code = (result: ApplyResult) => (result.ok ? 'accepted' : result.rejection.code)
const unit = (state: BattleState, id: UnitId) => state.units.find((u) => u.id === id)
const types = (events: readonly BattleEvent[]) => events.map((e) => e.type)
const rollsUsed = (state: BattleState) => (state.dice.kind === 'scripted' ? state.dice.position : NaN)

function accepted(result: ApplyResult): { state: BattleState; events: readonly BattleEvent[] } {
  if (!result.ok) throw new Error(result.rejection.message)
  return result
}
const act = (state: BattleState, action: Action) => accepted(applyAction(state, action))
const endTurn = (state: BattleState) => act(state, { type: 'endTurn' }).state
const endTurns = (state: BattleState, count: number) => {
  for (let i = 0; i < count; i++) state = endTurn(state)
  return state
}

function battle(tiles: BattleOptions['tiles'], options: BattleOptions = {}): BattleState {
  return scenario1Battle({ tiles, elements: NEUTRAL_ELEMENTS, ...options })
}
/** Team A's second Turn (Round 2): the first one on which it may Command. No dice used. */
const secondTurn = (tiles: BattleOptions['tiles'], options: BattleOptions = {}) => endTurns(battle(tiles, options), 2)

const command = (target: UnitId, option: CommandOption, unitId: UnitId = 'A.tamer'): Action => ({
  type: 'command',
  unit: unitId,
  target,
  option,
})
const useSkill = (unitId: UnitId, skill: string, fields: Partial<Extract<Action, { type: 'useSkill' }>> = {}): Action => ({
  type: 'useSkill',
  unit: unitId,
  skill,
  ...fields,
})
const attack = (unitId: UnitId, target: UnitId): Action => ({ type: 'basicAttack', unit: unitId, target })
const move = (unitId: UnitId, to: string): Action => ({ type: 'move', unit: unitId, to: t(to) })
const attune = (tile: string, element: Element, unitId: UnitId = 'A.tamer') => useSkill(unitId, 'attune', { tile: t(tile), element })

function attackPreview(state: BattleState, action: Action): AttackPreview {
  const result = previewAction(state, action)
  if (!result.ok || result.preview?.type !== 'attack') throw new Error('expected an attack preview')
  return result.preview
}
const sourceKinds = (preview: AttackPreview) => preview.rollModeSources.map((s) => `${s.kind}:${s.effect}`)

function withUnit(state: BattleState, id: UnitId, change: (u: BattleState['units'][number]) => BattleState['units'][number]): BattleState {
  return { ...state, units: state.units.map((u) => (u.id === id ? change(u) : u)) }
}
const withStatus = (state: BattleState, id: UnitId, status: UnitStatus) =>
  withUnit(state, id, (u) => ({ ...u, statuses: [...u.statuses, status] }))
const withHp = (state: BattleState, id: UnitId, hp: number) => withUnit(state, id, (u) => ({ ...u, hp }))

// ------------------------------------------------------------------ Command

describe('Command (rules §16, D-04, D-24)', () => {
  // Tamer A on b2; Fangrel on a1 (Move 4); Wispling on e2, 3 from the Tamer.
  const TILES = { A: ['b2', 'a1', 'e2'], B: ['d7', 'g4', 'g6'] } as const

  it('is not allowed on either side\'s first Turn, and is from the second Turn on', () => {
    let state = battle(TILES)
    expect(code(applyAction(state, command('A.m1', 'move')))).toBe('command-first-turn')
    expect(legalActions(state).some((a) => a.type === 'command')).toBe(false)
    state = endTurn(state)
    // Team B plays second; its first Turn is no different.
    expect(code(applyAction(state, command('B.m1', 'move', 'B.tamer')))).toBe('command-first-turn')
    state = endTurn(state)
    expect(code(applyAction(state, command('A.m1', 'move')))).toBe('accepted')
  })

  it('uses neither the Tamer\'s Action nor its Move: Command → Move → Action in one activation', () => {
    let state = secondTurn(TILES, { dice: { rolls: [] } })
    const issued = act(state, command('A.m1', 'advantage'))
    expect(issued.events).toEqual([{ type: 'commandIssued', unit: 'A.tamer', target: 'A.m1', option: 'advantage' }])
    expect(rollsUsed(issued.state)).toBe(0)
    state = issued.state
    expect(state.command).toEqual({ side: 'A', tamer: 'A.tamer', target: 'A.m1', option: 'advantage' })
    // It starts the Tamer's activation, like a Move or an Action would.
    expect(state.activations).toMatchObject({ current: 'A.tamer', started: ['A.tamer'] })
    expect(unit(state, 'A.tamer')).toMatchObject({ hasMoved: false, hasActed: false })
    state = act(state, move('A.tamer', 'c3')).state
    expect(code(applyAction(state, { type: 'defend', unit: 'A.tamer' }))).toBe('accepted')
  })

  it('may also come after the Tamer\'s Action, but not once its activation is over', () => {
    let state = act(secondTurn(TILES), { type: 'defend', unit: 'A.tamer' }).state
    expect(code(applyAction(state, command('A.m1', 'move')))).toBe('accepted')
    state = act(secondTurn(TILES), { type: 'defend', unit: 'A.tamer' }).state
    state = act(state, move('A.m2', 'e3')).state
    expect(code(applyAction(state, command('A.m1', 'move')))).toBe('activation-over')
  })

  it('once per Turn, whatever the target or option; again next Turn', () => {
    let state = act(secondTurn(TILES), command('A.m1', 'move')).state
    expect(code(applyAction(state, command('A.m2', 'advantage')))).toBe('command-used')
    expect(legalActions(state).some((a) => a.type === 'command')).toBe(false)
    state = endTurns(state, 2)
    expect(state.command).toBeNull()
    expect(code(applyAction(state, command('A.m2', 'advantage')))).toBe('accepted')
  })

  it('only an allied Monster on the Board, by a Tamer', () => {
    const state = secondTurn(TILES)
    expect(code(applyAction(state, command('B.m1', 'move')))).toBe('not-an-ally')
    expect(code(applyAction(state, command('A.tamer', 'move')))).toBe('invalid-target')
    expect(code(applyAction(state, command('A.m2', 'move', 'A.m1')))).toBe('not-a-tamer')
    expect(code(applyAction(state, command('A.m9', 'move')))).toBe('unknown-unit')
    expect(code(applyAction(state, { type: 'command', unit: 'A.tamer', target: 'A.m1', option: 'loyalty' } as unknown as Action))).toBe(
      'invalid-target',
    )
  })

  it('reaches 3 when issued, without line of sight; the Monster may then go anywhere', () => {
    // Wispling on e2 is 3 from b2; Fangrel on c2 stands on the line in between.
    let state = secondTurn({ A: ['b2', 'c2', 'e2'], B: ['d7', 'g4', 'g6'] })
    expect(code(applyAction(state, command('A.m2', 'advantage')))).toBe('accepted')
    // 4 away: out of range.
    state = secondTurn({ A: ['b2', 'a1', 'f2'], B: ['d7', 'g4', 'g6'] })
    expect(code(applyAction(state, command('A.m2', 'advantage')))).toBe('out-of-range')
    // Range counts only when issued: the Tamer walking away afterwards changes nothing.
    state = act(secondTurn(TILES), command('A.m2', 'move')).state
    state = act(state, move('A.tamer', 'a4')).state
    expect(state.command?.target).toBe('A.m2')
  })

  it('only a Monster that has not started its activation this Turn (it plays after the Tamer)', () => {
    const state = act(secondTurn(TILES), move('A.m1', 'a2')).state
    expect(code(applyAction(state, command('A.m1', 'move')))).toBe('already-activated')
    expect(code(applyAction(state, command('A.m2', 'move')))).toBe('accepted')
    expect(legalActions(state).filter((a) => a.type === 'command')).toEqual([command('A.m2', 'advantage'), command('A.m2', 'move')])
  })

  it('+1 move: the Monster\'s movement range is 1 more this Turn', () => {
    // Fangrel on a1, Move 4: f5 is 5 away (a1 b1 c2 d3 e4 f5).
    const reaches = (state: BattleState, to: string) =>
      legalActions(state).some((a) => a.type === 'move' && a.unit === 'A.m1' && a.to.x === t(to).x && a.to.y === t(to).y)
    let state = secondTurn(TILES)
    expect(reaches(state, 'f5')).toBe(false)
    state = act(state, command('A.m1', 'move')).state
    expect(reaches(state, 'f5')).toBe(true)
    expect(code(applyAction(state, move('A.m1', 'f5')))).toBe('accepted')
    // Gone at the end of the Turn.
    expect(reaches(endTurns(state, 2), 'f5')).toBe(false)
  })

  it('+1 move does nothing while Pinned (range 0) and never lengthens Blink (D-13)', () => {
    let state = withStatus(secondTurn(TILES), 'A.m1', { id: 'pin', turnsLeft: 1 })
    state = act(state, command('A.m1', 'move')).state
    expect(legalActions(state).some((a) => a.type === 'move' && a.unit === 'A.m1')).toBe(false)
    state = act(secondTurn(TILES), command('A.m2', 'move')).state
    // Wispling on e2: Blink stays 1–2 tiles; Move is 4 + 1.
    const blinks = legalActions(state).flatMap((a) => (a.type === 'useSkill' && a.skill === 'blink' && a.tile ? [a.tile] : []))
    expect(Math.max(...blinks.map((tile) => Math.max(Math.abs(tile.x - 4), Math.abs(tile.y - 1))))).toBe(2)
    expect(code(applyAction(state, move('A.m2', 'e7')))).toBe('accepted')
  })
})

describe('Command\'s advantage (rules §5.3, §16.3, D-04)', () => {
  // Fangrel on c4 next to Tidewall on c5 (both normal tiles); Tamer A on b2, 2 from Fangrel.
  const TILES = { A: ['b2', 'c4', 'e2'], B: ['d7', 'c5', 'g6'] } as const

  it('gives the Monster\'s next attack roll advantage, which that roll spends, hit or miss', () => {
    const state = act(secondTurn(TILES, { dice: { rolls: [15, 3, 4] } }), command('A.m1', 'advantage')).state
    const preview = attackPreview(state, attack('A.m1', 'B.m1'))
    expect(preview.rollModeSources).toEqual([{ kind: 'command', effect: 'advantage', tamer: 'A.tamer' }])
    expect(preview.rollMode).toBe('advantage')
    const { state: after, events } = act(state, attack('A.m1', 'B.m1'))
    expect(events[0]).toMatchObject({ type: 'attackRolled', rollMode: 'advantage', rolls: [15, 3], natural: 15, hit: true })
    expect(types(events)).toEqual(['attackRolled', 'damageDealt', 'commandSpent'])
    expect(events[2]).toEqual({ type: 'commandSpent', unit: 'A.m1', tamer: 'A.tamer' })
    expect(after.command).toEqual({ side: 'A', tamer: 'A.tamer', target: 'A.m1', option: 'advantage', spent: true })
    // Spent: no more advantage this Turn, and no second Command.
    expect(legalActions(after).some((a) => a.type === 'command')).toBe(false)
  })

  it('only for the commanded Monster, and gone unused at the end of the Turn', () => {
    let state = act(secondTurn({ A: ['b2', 'c4', 'b5'], B: ['d7', 'c5', 'g6'] }), command('A.m1', 'advantage')).state
    expect(sourceKinds(attackPreview(state, attack('A.m2', 'B.m1')))).toEqual([])
    const ended = act(state, { type: 'endTurn' })
    expect(ended.state.command).toBeNull()
  })

  it('cancels other disadvantages (Off-balance, terrain) as usual', () => {
    let state = withStatus(secondTurn(TILES), 'A.m1', { id: 'off_balance' })
    state = act(state, command('A.m1', 'advantage')).state
    const preview = attackPreview(state, attack('A.m1', 'B.m1'))
    expect(sourceKinds(preview)).toEqual(['status:disadvantage', 'command:advantage'])
    expect(preview.rollMode).toBe('normal')
  })

  it('cannot cancel Tamer protection (§5.3); another advantage (terrain) still can; the roll spends it anyway (D-04)', () => {
    // Fangrel on d6 next to Tamer B on d7, which Tidewall on c7 protects. Tamer A on d4.
    let state = act(
      secondTurn({ A: ['d4', 'd6', 'a1'], B: ['d7', 'c7', 'g4'] }, { dice: { rolls: [15, 3] } }),
      command('A.m1', 'advantage'),
    ).state
    const preview = attackPreview(state, attack('A.m1', 'B.tamer'))
    expect(sourceKinds(preview)).toEqual(['command:advantage', 'tamerProtection:disadvantage'])
    expect(preview.rollMode).toBe('disadvantage')
    const { state: after, events } = act(state, attack('A.m1', 'B.tamer'))
    expect(events[0]).toMatchObject({ type: 'attackRolled', rollMode: 'disadvantage', rolls: [15, 3], natural: 3, hit: false })
    expect(types(events)).toEqual(['attackRolled', 'commandSpent'])
    expect(after.command?.spent).toBe(true)

    // On e7 (forest) Fangrel also has terrain advantage, which does cancel the protection.
    state = act(secondTurn({ A: ['d4', 'e7', 'a1'], B: ['d7', 'c7', 'g4'] }), command('A.m1', 'advantage')).state
    const onForest = attackPreview(state, attack('A.m1', 'B.tamer'))
    expect(sourceKinds(onForest)).toEqual(['terrain:advantage', 'command:advantage', 'tamerProtection:disadvantage'])
    expect(onForest.rollMode).toBe('normal')
  })

  it('with Marked: both are advantages, one roll of 2 d20 (no double count); against a protected Tamer only Marked cancels', () => {
    let state = withStatus(secondTurn(TILES), 'B.m1', { id: 'marked', turnsLeft: 1 })
    state = act(state, command('A.m1', 'advantage')).state
    const marked = attackPreview(state, attack('A.m1', 'B.m1'))
    expect(sourceKinds(marked)).toEqual(['status:advantage', 'command:advantage'])
    expect(marked.rollMode).toBe('advantage')
    expect(marked.hitChance.denominator).toBe(400)

    state = withStatus(secondTurn({ A: ['d4', 'd6', 'a1'], B: ['d7', 'c7', 'g4'] }), 'B.tamer', { id: 'marked', turnsLeft: 1 })
    state = act(state, command('A.m1', 'advantage')).state
    const protectedTamer = attackPreview(state, attack('A.m1', 'B.tamer'))
    expect(sourceKinds(protectedTamer)).toEqual(['status:advantage', 'command:advantage', 'tamerProtection:disadvantage'])
    expect(protectedTamer.rollMode).toBe('normal')
  })

  it('Burst: only the first target\'s attack roll gets it, in the preview and when resolved', () => {
    // Wispling (Flying) on d2; Tidewall on c4 and Quillfox on d4 around centre c4.
    const tiles = { A: ['b2', 'a1', 'd2'], B: ['d7', 'c4', 'd4'] } as const
    let state = act(secondTurn(tiles, { dice: { rolls: [12, 4, 3, 5] } }), command('A.m2', 'advantage')).state
    const burst = useSkill('A.m2', 'burst', { tile: t('c4'), targets: ['B.m1', 'B.m2'] })
    const result = previewAction(state, burst)
    if (!result.ok || result.preview?.type !== 'area') throw new Error('expected an area preview')
    expect(result.preview.attacks.map(sourceKinds)).toEqual([['command:advantage'], []])
    const { events } = act(state, burst)
    const rolled = events.filter((e) => e.type === 'attackRolled')
    expect(rolled.map((e) => e.type === 'attackRolled' && [e.target, e.rollMode, e.rolls])).toEqual([
      ['B.m1', 'advantage', [12, 4]],
      ['B.m2', 'normal', [5]],
    ])
    expect(types(events).filter((type) => type === 'commandSpent')).toHaveLength(1)
    expect(types(events).indexOf('commandSpent')).toBeLessThan(types(events).lastIndexOf('attackRolled'))
  })

  it('never applies to a counterattack, and is spent before the counterattack comes', () => {
    // Tidewall is Countering: it strikes back at Fangrel after Fangrel's attack.
    let state = withStatus(secondTurn(TILES, { dice: { rolls: [15, 3, 4, 2] } }), 'B.m1', { id: 'countering' })
    state = act(state, command('A.m1', 'advantage')).state
    const preview = attackPreview(state, attack('A.m1', 'B.m1'))
    expect(preview.counterattack?.rollModeSources).toEqual([])
    const { events } = act(state, attack('A.m1', 'B.m1'))
    expect(types(events)).toEqual(['attackRolled', 'damageDealt', 'commandSpent', 'counterattack', 'attackRolled', 'statusEnded'])
    expect(events[4]).toMatchObject({ type: 'attackRolled', attacker: 'B.m1', skill: 'counterattack', rollMode: 'normal', rolls: [2] })
  })
})

// -------------------------------------------------------------------- Cover

describe('Cover (rules §15.4, D-21)', () => {
  // Tamer A on c2 next to Fangrel on c3; Quillfox on c6 shoots down the c column (Long Shot and Pin reach 4).
  const TILES = { A: ['c2', 'c3', 'a1'], B: ['d7', 'g6', 'c6'] } as const

  function covered(options: BattleOptions = {}): BattleState {
    let state = battle(TILES, options)
    const used = act(state, useSkill('A.tamer', 'cover', { target: 'A.m1' }))
    expect(used.events).toEqual([
      { type: 'skillUsed', unit: 'A.tamer', skill: 'cover', targets: ['A.m1'] },
      { type: 'coverApplied', unit: 'A.m1', by: 'A.tamer' },
    ])
    state = used.state
    expect(unit(state, 'A.m1')?.coveredBy).toBe('A.tamer')
    expect(unit(state, 'A.tamer')).toMatchObject({ hasActed: true })
    // No need to stay next to the Tamer (D-21).
    state = act(state, move('A.m1', 'c4')).state
    return endTurn(state)
  }

  it('damage the Monster takes comes off the Tamer\'s HP instead, and counts for the attacker\'s side', () => {
    // Long Shot: 15 + 3 hits Fangrel's Guard 11; 1d8 = 5 + SEN mod 2 = 7.
    const { state, events } = act(covered({ dice: { rolls: [15, 5] } }), useSkill('B.m2', 'long_shot', { target: 'A.m1' }))
    expect(events[1]).toMatchObject({ type: 'attackRolled', target: 'A.m1', defence: 11, hit: true })
    expect(events[2]).toEqual({
      type: 'damageDealt',
      source: 'B.m2',
      target: 'A.m1',
      skill: 'long_shot',
      dice: { count: 1, sides: 8 },
      rolls: [5],
      modifier: 2,
      amount: 7,
      coveredBy: 'A.tamer',
      hpBefore: 25,
      hpAfter: 18,
    })
    expect(unit(state, 'A.m1')?.hp).toBe(19)
    expect(unit(state, 'A.tamer')?.hp).toBe(18)
    expect(state.damageDealt).toEqual({ A: 0, B: 7 })
  })

  it('only damage moves: the roll is against the Monster and its statuses stay with it', () => {
    // Pin: 15 hits; 1d6 = 3 + 2 = 5 to the Tamer; Fangrel saves VIT (mod 0) with 2 against DC 11 and is Pinned.
    const { state, events } = act(covered({ dice: { rolls: [15, 3, 2] } }), useSkill('B.m2', 'pin', { target: 'A.m1' }))
    expect(events).toContainEqual(expect.objectContaining({ type: 'damageDealt', target: 'A.m1', coveredBy: 'A.tamer', amount: 5 }))
    expect(events).toContainEqual(expect.objectContaining({ type: 'saveRolled', unit: 'A.m1', saved: false }))
    expect(unit(state, 'A.m1')?.statuses.map((s) => s.id)).toEqual(['pin'])
    expect(unit(state, 'A.tamer')?.statuses).toEqual([])
    expect(unit(state, 'A.tamer')?.hp).toBe(20)
  })

  it('damage that takes the Tamer to 0 ends the Battle (rules §19.1)', () => {
    const state = withHp(covered({ dice: { rolls: [15, 5] } }), 'A.tamer', 3)
    const { state: after, events } = act(state, useSkill('B.m2', 'long_shot', { target: 'A.m1' }))
    expect(types(events).slice(-2)).toEqual(['unitDown', 'battleEnded'])
    expect(after.outcome).toEqual({ winner: 'B', cause: 'tamerDown' })
    expect(unit(after, 'A.m1')?.hp).toBe(19)
  })

  it('ends at the start of the Tamer\'s side\'s next Turn; damage then hits the Monster again', () => {
    let state = covered({ dice: { rolls: [15, 5] } })
    const started = act(state, { type: 'endTurn' })
    expect(types(started.events)).toEqual(['turnEnded', 'turnStarted', 'coverEnded'])
    expect(started.events[2]).toEqual({ type: 'coverEnded', unit: 'A.m1', by: 'A.tamer' })
    state = endTurn(started.state)
    const { events } = act(state, useSkill('B.m2', 'long_shot', { target: 'A.m1' }))
    expect(events[2]).toMatchObject({ type: 'damageDealt', target: 'A.m1', hpBefore: 19, hpAfter: 12 })
    expect(events[2]).not.toHaveProperty('coveredBy')
  })

  it('an allied Monster next to the Tamer when used; not the Tamer itself, nor an enemy', () => {
    const state = battle(TILES)
    expect(code(applyAction(state, useSkill('A.tamer', 'cover', { target: 'A.tamer' })))).toBe('invalid-target')
    expect(code(applyAction(state, useSkill('A.tamer', 'cover', { target: 'A.m2' })))).toBe('out-of-range')
    expect(code(applyAction(state, useSkill('A.tamer', 'cover', { target: 'B.m2' })))).toBe('not-an-ally')
    expect(legalActions(state).filter((a) => a.type === 'useSkill' && a.skill === 'cover')).toEqual([
      useSkill('A.tamer', 'cover', { target: 'A.m1' }),
    ])
    const preview = previewAction(state, useSkill('A.tamer', 'cover', { target: 'A.m1' }))
    expect(preview).toEqual({ ok: true, preview: { type: 'effect', skill: 'cover', user: 'A.tamer', units: ['A.m1'], statuses: [] } })
  })

  it('is Major: cooldown 2 Turns of the side', () => {
    const state = endTurns(covered(), 1)
    expect(unitSkills(state, 'A.tamer').find((s) => s.skill === 'cover')?.cooldown).toBe(1)
  })
})

// ------------------------------------------------------------------- Attune

describe('Attune (rules §4.3, §15.4, D-20)', () => {
  // Tamer A on d2; Fangrel on c3 (normal) next to it and next to Tidewall on c4.
  const TILES = { A: ['d2', 'c3', 'a1'], B: ['d7', 'c4', 'g6'] } as const

  it('any tile next to the Tamer, empty or not, to one of the 6 elements', () => {
    const state = battle(TILES)
    const uses = legalActions(state).filter((a) => a.type === 'useSkill' && a.skill === 'attune')
    expect(uses).toHaveLength(8 * 6)
    expect(code(applyAction(state, attune('c3', 'light')))).toBe('accepted')
    expect(code(applyAction(state, attune('d2', 'forest')))).toBe('out-of-range')
    expect(code(applyAction(state, attune('d4', 'forest')))).toBe('out-of-range')
    expect(code(applyAction(state, attune('c3', 'normal' as Element)))).toBe('invalid-target')
    expect(code(applyAction(state, useSkill('A.tamer', 'attune', { tile: t('c3') })))).toBe('invalid-target')
  })

  it('changes the tile now: terrain advantage or disadvantage of the Unit on it follows', () => {
    const { state, events } = act(battle(TILES), attune('c3', 'forest'))
    expect(events).toEqual([
      { type: 'skillUsed', unit: 'A.tamer', skill: 'attune', targets: [], tile: t('c3') },
      { type: 'terrainChanged', unit: 'A.tamer', skill: 'attune', tile: t('c3'), from: 'normal', to: 'forest', turnsLeft: 3 },
    ])
    expect(state.terrain[2]?.[2]).toBe('forest')
    expect(state.attuned).toEqual([{ tile: t('c3'), terrain: 'forest', original: 'normal', side: 'A', by: 'A.tamer', turnsLeft: 3, skipCountdown: true }])
    expect(sourceKinds(attackPreview(state, attack('A.m1', 'B.m1')))).toEqual(['terrain:advantage'])
    // Desert beats forest: disadvantage.
    const desert = act(battle(TILES), attune('c3', 'desert')).state
    expect(sourceKinds(attackPreview(desert, attack('A.m1', 'B.m1')))).toEqual(['terrain:disadvantage'])
    // The preview says what will happen, without dice.
    expect(previewAction(battle(TILES), attune('c3', 'forest'))).toEqual({
      ok: true,
      preview: { type: 'terrain', skill: 'attune', user: 'A.tamer', tile: t('c3'), from: 'normal', to: 'forest', turns: 3, original: 'normal' },
    })
  })

  it('lasts the rest of the Turn and 3 more Turns of the user\'s side (D-02), then goes back to the Board\'s terrain', () => {
    let state = act(battle(TILES), attune('c3', 'forest')).state
    const turnsLeft: number[] = []
    let reverted: readonly BattleEvent[] = []
    // End A1, B1, A2, B2, A3, B3, then A4.
    for (let i = 0; i < 7; i++) {
      const ended = act(state, { type: 'endTurn' })
      state = ended.state
      turnsLeft.push(state.attuned[0]?.turnsLeft ?? 0)
      if (ended.events.some((e) => e.type === 'terrainReverted')) reverted = ended.events
    }
    expect(turnsLeft).toEqual([3, 3, 2, 2, 1, 1, 0])
    expect(reverted[0]).toEqual({ type: 'turnEnded', side: 'A', turn: 4 })
    expect(reverted).toContainEqual({ type: 'terrainReverted', tile: t('c3'), from: 'forest', to: 'normal' })
    expect(state.terrain[2]?.[2]).toBe('normal')
    expect(state.attuned).toEqual([])
  })

  it('attuned again, the newest wins: element, duration and the side that counts; the Board\'s terrain still comes back', () => {
    // Tamer A on d3 and Tamer B on d5, both next to d4 (dark).
    let state = act(battle({ A: ['d3', 'a1', 'b1'], B: ['d5', 'g7', 'f7'] }), attune('d4', 'forest')).state
    state = endTurn(state)
    const again = act(state, attune('d4', 'water', 'B.tamer'))
    expect(again.events[1]).toMatchObject({ type: 'terrainChanged', tile: t('d4'), from: 'forest', to: 'water', turnsLeft: 3 })
    state = again.state
    expect(state.attuned).toEqual([{ tile: t('d4'), terrain: 'water', original: 'dark', side: 'B', by: 'B.tamer', turnsLeft: 3, skipCountdown: true }])
    // Now team B's Turns count it: it goes back at the end of B's 4th Turn, not A's.
    let revertedAfter: BattleEvent | undefined
    for (let i = 0; i < 7 && revertedAfter === undefined; i++) {
      const ended = act(state, { type: 'endTurn' })
      state = ended.state
      if (ended.events.some((e) => e.type === 'terrainReverted')) revertedAfter = ended.events[0]
    }
    expect(revertedAfter).toEqual({ type: 'turnEnded', side: 'B', turn: 4 })
    expect(state.terrain[3]?.[3]).toBe('dark')
  })

  it('Aquatic: an attuned water tile counts as the Monster\'s own element and gives its Move +1', () => {
    // Tidewall (Aquatic, Move 2) on c4 next to Tamer B on d5; Fangrel on c3 next to it.
    let state = battle({ A: ['a1', 'c3', 'b1'], B: ['d5', 'c4', 'g6'] }, { firstSide: 'B' })
    const reach = (s: BattleState) =>
      Math.max(...legalActions(s).flatMap((a) => (a.type === 'move' && a.unit === 'B.m1' ? [Math.max(Math.abs(a.to.x - 2), Math.abs(a.to.y - 3))] : [])))
    expect(reach(state)).toBe(2)
    state = act(state, attune('c4', 'water', 'B.tamer')).state
    const preview = attackPreview(state, attack('B.m1', 'A.m1'))
    expect(preview.rollModeSources).toEqual([{ kind: 'terrain', effect: 'advantage', terrain: 'water', attackerElement: 'forest', aquatic: true }])
    expect(reach(state)).toBe(3)
  })

  it('Hidden: turning a Camouflaged Quillfox\'s forest tile into another element ends Hidden at once', () => {
    // Quillfox on b4 (forest); Tamer A on a3 next to it.
    let state = battle({ A: ['a3', 'g1', 'f1'], B: ['d7', 'g6', 'b4'] }, { firstSide: 'B' })
    state = act(state, useSkill('B.m2', 'camouflage')).state
    expect(unit(state, 'B.m2')?.statuses.map((s) => s.id)).toEqual(['hidden'])
    state = endTurn(state)
    const { state: after, events } = act(state, attune('b4', 'water'))
    expect(types(events)).toEqual(['skillUsed', 'terrainChanged', 'statusEnded'])
    expect(events[2]).toEqual({ type: 'statusEnded', unit: 'B.m2', status: 'hidden', cause: 'terrain' })
    expect(unit(after, 'B.m2')?.statuses).toEqual([])
  })

  it('Hidden: an attuned forest tile allows Camouflage, and Hidden ends when the tile goes back (end of Turn steps 2 then 3)', () => {
    // Quillfox on c5 (normal), Tamer B on c6 next to it.
    let state = battle({ A: ['a1', 'g1', 'f1'], B: ['c6', 'g6', 'c5'] }, { firstSide: 'B' })
    expect(code(applyAction(state, useSkill('B.m2', 'camouflage')))).toBe('wrong-terrain')
    state = act(state, attune('c5', 'forest', 'B.tamer')).state
    state = act(state, useSkill('B.m2', 'camouflage')).state
    let last: readonly BattleEvent[] = []
    // B's Turn 1 is not counted; it goes back at the end of B's 4th Turn.
    for (let i = 0; i < 7; i++) {
      const ended = act(state, { type: 'endTurn' })
      state = ended.state
      last = ended.events
      if (i < 6) expect(unit(state, 'B.m2')?.statuses.map((s) => s.id)).toEqual(['hidden'])
    }
    expect(last.slice(0, 3)).toEqual([
      { type: 'turnEnded', side: 'B', turn: 4 },
      { type: 'terrainReverted', tile: t('c5'), from: 'forest', to: 'normal' },
      { type: 'statusEnded', unit: 'B.m2', status: 'hidden', cause: 'terrain' },
    ])
  })
})

// ---------------------------------------------------------------- First Aid

describe('First Aid (rules §15.4, D-26)', () => {
  const TILES = { A: ['d2', 'c3', 'a1'], B: ['d7', 'g6', 'f6'] } as const

  it('heals 1d8 + SPI mod, rolled with no Inspiration offered', () => {
    const state = withHp(battle(TILES, { dice: { rolls: [5] }, inspiration: { A: true, B: true } }), 'A.m1', 10)
    const { state: after, events } = act(state, useSkill('A.tamer', 'first_aid', { target: 'A.m1' }))
    expect(events).toEqual([
      { type: 'skillUsed', unit: 'A.tamer', skill: 'first_aid', targets: ['A.m1'] },
      {
        type: 'healed',
        source: 'A.tamer',
        target: 'A.m1',
        skill: 'first_aid',
        dice: { count: 1, sides: 8 },
        rolls: [5],
        modifier: 1,
        amount: 6,
        hpBefore: 10,
        hpAfter: 16,
      },
    ])
    expect(unit(after, 'A.m1')?.hp).toBe(16)
    expect(after.pending).toBeNull()
    expect(rollsUsed(after)).toBe(1)
  })

  it('never above maximum HP; the Tamer may heal itself', () => {
    const state = withHp(battle(TILES, { dice: { rolls: [8] } }), 'A.tamer', 20)
    const { state: after, events } = act(state, useSkill('A.tamer', 'first_aid', { target: 'A.tamer' }))
    expect(events[1]).toMatchObject({ type: 'healed', target: 'A.tamer', amount: 9, hpBefore: 20, hpAfter: 25 })
    expect(unit(after, 'A.tamer')?.hp).toBe(25)
  })

  it('a heal of less than 0 is 0 (D-26)', () => {
    // SPI 6: mod −2; a 1 heals max(0, −1) = 0.
    const state = withHp(battle(TILES, { dice: { rolls: [1] }, stats: { 'A.tamer': { spi: 6 } } }), 'A.m1', 10)
    const { events } = act(state, useSkill('A.tamer', 'first_aid', { target: 'A.m1' }))
    expect(events[1]).toMatchObject({ type: 'healed', modifier: -2, amount: 0, hpBefore: 10, hpAfter: 10 })
  })

  it('healing does not take damage back off the totals (rules §19.2)', () => {
    const state = { ...withHp(battle(TILES, { dice: { rolls: [5] } }), 'A.m1', 10), damageDealt: { A: 4, B: 9 } }
    const after = act(state, useSkill('A.tamer', 'first_aid', { target: 'A.m1' })).state
    expect(after.damageDealt).toEqual({ A: 4, B: 9 })
  })

  it('reaches 1: allies next to the Tamer and the Tamer itself, never enemies', () => {
    const state = battle(TILES)
    expect(code(applyAction(state, useSkill('A.tamer', 'first_aid', { target: 'A.m2' })))).toBe('out-of-range')
    expect(code(applyAction(state, useSkill('A.tamer', 'first_aid', { target: 'B.tamer' })))).toBe('not-an-ally')
    expect(legalActions(state).filter((a) => a.type === 'useSkill' && a.skill === 'first_aid')).toEqual([
      useSkill('A.tamer', 'first_aid', { target: 'A.tamer' }),
      useSkill('A.tamer', 'first_aid', { target: 'A.m1' }),
    ])
  })

  it('preview: the heal range and the HP it starts from, without dice', () => {
    const state = withHp(battle(TILES, { dice: { rolls: [] } }), 'A.m1', 10)
    expect(previewAction(state, useSkill('A.tamer', 'first_aid', { target: 'A.m1' }))).toEqual({
      ok: true,
      preview: {
        type: 'heal',
        skill: 'first_aid',
        user: 'A.tamer',
        target: 'A.m1',
        dice: { count: 1, sides: 8 },
        modifier: 1,
        min: 2,
        max: 9,
        hp: 10,
        maxHp: 19,
      },
    })
    expect(rollsUsed(state)).toBe(0)
  })
})

// ----------------------------------------------------------------- Distract

describe('Distract and Off-balance (rules §14.2, §15.4)', () => {
  // Tamer A on d2; Quillfox (SPI mod −1) on d4, 2 away with d3 empty.
  const TILES = { A: ['d2', 'a1', 'g1'], B: ['d7', 'g6', 'd4'] } as const
  const distract = (target: UnitId = 'B.m2') => useSkill('A.tamer', 'distract', { target })

  it('save SPI against the Tamer\'s SPI Save DC: a failed save gives Off-balance', () => {
    const { state, events } = act(battle(TILES, { dice: { rolls: [5] } }), distract())
    expect(events).toEqual([
      { type: 'skillUsed', unit: 'A.tamer', skill: 'distract', targets: ['B.m2'] },
      {
        type: 'saveRolled',
        unit: 'B.m2',
        source: 'A.tamer',
        skill: 'distract',
        status: 'off_balance',
        stat: 'spi',
        roll: 5,
        modifier: -1,
        total: 4,
        dc: 11,
        saved: false,
      },
      { type: 'statusApplied', unit: 'B.m2', status: { id: 'off_balance' } },
    ])
    expect(unit(state, 'B.m2')?.statuses).toEqual([{ id: 'off_balance' }])
    // 12 − 1 = 11 meets DC 11: saved.
    const saved = act(battle(TILES, { dice: { rolls: [12] } }), distract())
    expect(saved.events[1]).toMatchObject({ saved: true })
    expect(unit(saved.state, 'B.m2')?.statuses).toEqual([])
  })

  it('preview: the chance the target fails its save', () => {
    expect(previewAction(battle(TILES), distract())).toEqual({
      ok: true,
      preview: {
        type: 'save',
        skill: 'distract',
        user: 'A.tamer',
        target: 'B.m2',
        statuses: [{ status: 'off_balance', target: 'B.m2', save: { stat: 'spi', dc: 11, modifier: -1, failChance: { numerator: 11, denominator: 20 } } }],
      },
    })
  })

  it('range 3 with line of sight (rules §8.1); Minor, so no cooldown', () => {
    expect(code(applyAction(battle({ A: ['d2', 'a1', 'g1'], B: ['d7', 'g6', 'd6'] }), distract()))).toBe('out-of-range')
    expect(code(applyAction(battle({ A: ['d2', 'd3', 'g1'], B: ['d7', 'g6', 'd4'] }), distract()))).toBe('no-line-of-sight')
    const state = endTurns(act(battle(TILES, { dice: { rolls: [15, 15] } }), distract()).state, 2)
    expect(code(applyAction(state, distract()))).toBe('accepted')
  })

  it('the target\'s side may reroll the save with Inspiration', () => {
    let state = act(battle(TILES, { dice: { rolls: [5, 18] }, inspiration: { A: true, B: true } }), distract()).state
    expect(state.pending).toMatchObject({ kind: 'inspiration', side: 'B' })
    const used = act(state, { type: 'useInspiration', side: 'B' })
    expect(used.events).toContainEqual(expect.objectContaining({ type: 'saveRolled', roll: 18, saved: true, rerolled: true }))
    state = used.state
    expect(unit(state, 'B.m2')?.statuses).toEqual([])
  })

  it('Off-balance lasts across Turns until the next attack roll, which gets disadvantage, then ends', () => {
    let state = act(battle(TILES, { dice: { rolls: [5, 15, 6] } }), distract()).state
    state = endTurns(state, 3)
    // Team B's second Turn: still Off-balance.
    expect(unit(state, 'B.m2')?.statuses).toEqual([{ id: 'off_balance' }])
    const preview = attackPreview(state, useSkill('B.m2', 'long_shot', { target: 'A.tamer' }))
    expect(preview.rollModeSources).toEqual([{ kind: 'status', effect: 'disadvantage', status: 'off_balance', holder: 'attacker' }])
    expect(preview.rollMode).toBe('disadvantage')
    const { state: after, events } = act(state, useSkill('B.m2', 'long_shot', { target: 'A.tamer' }))
    expect(events[1]).toMatchObject({ type: 'attackRolled', rollMode: 'disadvantage', rolls: [15, 6], natural: 6, hit: false })
    expect(events[2]).toEqual({ type: 'statusEnded', unit: 'B.m2', status: 'off_balance', cause: 'attackRoll' })
    expect(unit(after, 'B.m2')?.statuses).toEqual([])
  })

  it('a counterattack is an attack roll too: it spends Off-balance', () => {
    // Tidewall on c3 Countering and Off-balance; Fangrel on c2 attacks it.
    let state = battle({ A: ['a1', 'c2', 'g1'], B: ['d7', 'c3', 'g6'] }, { dice: { rolls: [3, 15, 6] } })
    state = withStatus(withStatus(state, 'B.m1', { id: 'countering' }), 'B.m1', { id: 'off_balance' })
    const { state: after, events } = act(state, attack('A.m1', 'B.m1'))
    expect(events).toContainEqual(expect.objectContaining({ type: 'attackRolled', attacker: 'B.m1', rollMode: 'disadvantage', rolls: [15, 6] }))
    expect(events).toContainEqual({ type: 'statusEnded', unit: 'B.m1', status: 'off_balance', cause: 'attackRoll' })
    expect(unit(after, 'B.m1')?.statuses.map((s) => s.id)).toEqual([])
  })
})

// -------------------------------------------------------- legal and Replay

describe('Tamer actions through the whole interface', () => {
  const TILES = { A: ['d2', 'c3', 'e2'], B: ['d7', 'c5', 'e6'] } as const

  it('all four skills are in the game; every legal action, Command included, is accepted', () => {
    const state = secondTurn(TILES)
    expect(unitSkills(state, 'A.tamer').map((s) => [s.skill, s.tier, s.implemented])).toEqual([
      ['cover', 'major', true],
      ['attune', 'major', true],
      ['first_aid', 'major', true],
      ['distract', 'minor', true],
    ])
    const actions = legalActions(state)
    expect(actions.filter((a) => a.type === 'command')).toHaveLength(4)
    for (const action of actions) expect(applyAction(state, action).ok, JSON.stringify(action)).toBe(true)
  })

  it('Command, Cover, Attune, First Aid and Distract replay to the same Battle', () => {
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
    const actions: Action[] = []
    let state = start.final
    const play = (action: Action) => {
      state = accepted(applyAction(state, action)).state
      actions.push(action)
      while (state.pending?.kind === 'inspiration') play({ type: 'declineInspiration', side: state.pending.side })
    }
    play(attune('c3', 'forest'))
    play({ type: 'endTurn' })
    play(useSkill('B.tamer', 'first_aid', { target: 'B.tamer' }))
    play(useSkill('B.m2', 'long_shot', { target: 'A.m2' }))
    play({ type: 'endTurn' })
    play(command('A.m1', 'advantage'))
    play(useSkill('A.tamer', 'cover', { target: 'A.m2' }))
    play(move('A.m1', 'c4'))
    play(attack('A.m1', 'B.m1'))
    play({ type: 'endTurn' })
    play(useSkill('B.m2', 'long_shot', { target: 'A.m2' }))
    play({ type: 'endTurn' })
    play(move('A.tamer', 'd4'))
    play(useSkill('A.tamer', 'distract', { target: 'B.m2' }))
    const replay = recordReplay(header, gameData, actions)
    const first = replayBattle(replay, gameData)
    const second = replayBattle(JSON.parse(JSON.stringify(replay)), gameData)
    if (!first.ok || !second.ok) throw new Error('replay failed')
    expect(first.final).toEqual(state)
    expect(second.final).toEqual(first.final)
    const events = first.steps.flatMap((s) => s.events)
    for (const type of ['terrainChanged', 'healed', 'commandIssued', 'coverApplied', 'commandSpent', 'coverEnded'] as const) {
      expect(events.some((e) => e.type === type), type).toBe(true)
    }
    expect(events).toContainEqual(expect.objectContaining({ type: 'saveRolled', skill: 'distract' }))
  })
})

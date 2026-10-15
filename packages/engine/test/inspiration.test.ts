import { describe, expect, it } from 'vitest'
import { tileFromName, type Side } from '@mt/shared'
import {
  applyAction,
  decidingSide,
  legalActions,
  previewAction,
  recordReplay,
  replayBattle,
  type Action,
  type ApplyResult,
  type BattleEvent,
  type BattleState,
  type UnitId,
} from '../src/index.ts'
import { deployBothSides, gameData, NEUTRAL_ELEMENTS, scenario1Battle, type BattleOptions } from './fixtures.ts'

// Inspiration (rules §18, §21.6, D-09, D-10): each side may reroll one of its
// own d20s once per Battle (initiative, attack rolls, saves), right after
// seeing it and before any other die. The action pauses for the decision.

const BOTH: Readonly<Record<Side, boolean>> = { A: true, B: true }

// Fangrel (A.m1, d4) next to Tidewall (B.m1, d5), every Monster forest
// (neutral). Fangrel: attack +2, POW mod +2, Rend Save DC 11. Tidewall:
// Guard 11 (hit on a d20 of 9 or more), HP 31, VIT mod +2 (saves on 9 or more).
const TILES = { A: ['a1', 'd4', 'g1'], B: ['a7', 'd5', 'g7'] } as const

function battle(options: BattleOptions = {}): BattleState {
  return scenario1Battle({ tiles: TILES, elements: NEUTRAL_ELEMENTS, inspiration: BOTH, ...options })
}

function accepted(result: ApplyResult): { state: BattleState; events: readonly BattleEvent[] } {
  if (!result.ok) throw new Error(result.rejection.message)
  return result
}

const attack = (state: BattleState, unit: UnitId, target: UnitId) =>
  accepted(applyAction(state, { type: 'basicAttack', unit, target }))
const rend = (state: BattleState) => accepted(applyAction(state, { type: 'useSkill', unit: 'A.m1', skill: 'rend', target: 'B.m1' }))
const use = (state: BattleState, side: Side) => accepted(applyAction(state, { type: 'useInspiration', side }))
const decline = (state: BattleState, side: Side) => accepted(applyAction(state, { type: 'declineInspiration', side }))
const endTurn = (state: BattleState) => accepted(applyAction(state, { type: 'endTurn' }))
const types = (events: readonly BattleEvent[]) => events.map((e) => e.type)
const rollsUsed = (state: BattleState) => (state.dice.kind === 'scripted' ? state.dice.position : NaN)
const hp = (state: BattleState, id: UnitId) => state.units.find((u) => u.id === id)?.hp
const code = (result: ApplyResult) => (result.ok ? 'accepted' : result.rejection.code)

describe('Inspiration on attack rolls: the attacking side decides (rules §18, §10.5 step 2)', () => {
  it('the attack pauses right after the d20, before damage, with a decision for the attacking side', () => {
    const { state, events } = attack(battle({ dice: { rolls: [15, 3] } }), 'A.m1', 'B.m1')
    expect(types(events)).toEqual(['attackRolled', 'inspirationOffered'])
    expect(events[1]).toEqual({ type: 'inspirationOffered', side: 'A', roll: events[0] })
    expect(state.pending).toMatchObject({ kind: 'inspiration', side: 'A', roll: { type: 'attackRolled', natural: 15, hit: true } })
    expect(decidingSide(state)).toBe('A')
    expect(legalActions(state)).toEqual([
      { type: 'useInspiration', side: 'A' },
      { type: 'declineInspiration', side: 'A' },
    ])
    // Nothing after the d20 has happened yet: no damage die drawn, HP unchanged.
    expect(rollsUsed(state)).toBe(1)
    expect(hp(state, 'B.m1')).toBe(31)
    // The attack is booked: the Action is used.
    expect(state.units.find((u) => u.id === 'A.m1')?.hasActed).toBe(true)
  })

  it('hit then miss: the new roll stands even when it is worse', () => {
    const paused = attack(battle({ dice: { rolls: [15, 3] } }), 'A.m1', 'B.m1').state
    const { state, events } = use(paused, 'A')
    expect(types(events)).toEqual(['inspirationUsed', 'attackRolled'])
    expect(events[1]).toMatchObject({ rolls: [3], natural: 3, total: 5, hit: false, rerolled: true })
    expect(state.pending).toBeNull()
    expect(state.inspiration).toEqual({ A: false, B: true })
    expect(hp(state, 'B.m1')).toBe(31)
    expect(rollsUsed(state)).toBe(2)
  })

  it('miss then hit: damage follows the new roll', () => {
    const paused = attack(battle({ dice: { rolls: [3, 15, 5] } }), 'A.m1', 'B.m1').state
    expect(paused.pending).toMatchObject({ roll: { natural: 3, hit: false } })
    const { state, events } = use(paused, 'A')
    expect(types(events)).toEqual(['inspirationUsed', 'attackRolled', 'damageDealt'])
    expect(events[1]).toMatchObject({ natural: 15, hit: true, rerolled: true })
    expect(events[2]).toMatchObject({ rolls: [5], amount: 7, hpBefore: 31, hpAfter: 24 })
    expect(state.damageDealt).toEqual({ A: 7, B: 0 })
  })

  it('with advantage both d20s are rolled again under the same roll mode (rules §18, §21.4)', () => {
    // Fangrel (forest) on c3 attacking Quillfox (water) on c4: advantage.
    const state = scenario1Battle({
      tiles: { A: ['a1', 'c3', 'g1'], B: ['g7', 'a7', 'c4'] },
      inspiration: BOTH,
      dice: { rolls: [3, 4, 15, 2, 5] },
    })
    const paused = attack(state, 'A.m1', 'B.m2')
    expect(paused.events[0]).toMatchObject({ rollMode: 'advantage', rolls: [3, 4], natural: 4, hit: false })
    expect(rollsUsed(paused.state)).toBe(2)
    const { events, state: after } = use(paused.state, 'A')
    expect(events[1]).toMatchObject({ rollMode: 'advantage', rolls: [15, 2], natural: 15, hit: true, rerolled: true })
    expect(events[2]).toMatchObject({ type: 'damageDealt', rolls: [5] })
    expect(rollsUsed(after)).toBe(5)
  })

  it('declining keeps the roll and the Inspiration, and draws no die', () => {
    const paused = attack(battle({ dice: { rolls: [3] } }), 'A.m1', 'B.m1').state
    const { state, events } = decline(paused, 'A')
    expect(events).toEqual([{ type: 'inspirationDeclined', side: 'A' }])
    expect(state.pending).toBeNull()
    expect(state.inspiration).toEqual({ A: true, B: true })
    expect(rollsUsed(state)).toBe(1)
  })

  it('is offered again on the next roll while unused, and never once used (once per Battle)', () => {
    // Seeded dice: only who is asked matters here.
    let state = decline(attack(battle(), 'A.m1', 'B.m1').state, 'A').state
    state = endTurn(state).state
    // Team B's Tidewall attacks: team B is offered on its own d20.
    let step = attack(state, 'B.m1', 'A.m1')
    expect(step.state.pending).toMatchObject({ side: 'B' })
    step = use(step.state, 'B')
    expect(step.state.inspiration).toEqual({ A: true, B: false })
    state = endTurn(step.state).state
    // Team A's next attack is offered again (A declined before); team A uses it.
    state = use(attack(state, 'A.m1', 'B.m1').state, 'A').state
    expect(state.inspiration).toEqual({ A: false, B: false })
    state = endTurn(state).state
    // Neither side has Inspiration left: an attack resolves without pausing.
    const last = attack(state, 'B.m1', 'A.m1')
    expect(types(last.events)).not.toContain('inspirationOffered')
    expect(last.state.pending).toBeNull()
  })
})

describe('Inspiration on saves: the target\'s side decides, during the other side\'s Turn (rules §11, §18, D-10)', () => {
  // Rend: attack 15 (hit) → damage 4 + 2 = 6 → save 5 + 2 = 7 < 11 (fails) → reroll 15 + 2 = 17 (saves).
  const dice = { rolls: [15, 4, 5, 15] }

  it('the save pauses for team B while it is team A\'s Turn; the paused state shows the damage', () => {
    const atRoll = rend(battle({ dice }))
    expect(atRoll.state.pending).toMatchObject({ side: 'A' })
    const { state, events } = decline(atRoll.state, 'A')
    expect(types(events)).toEqual(['inspirationDeclined', 'damageDealt', 'saveRolled', 'inspirationOffered'])
    expect(state.sideToAct).toBe('A')
    expect(decidingSide(state)).toBe('B')
    expect(state.pending).toMatchObject({ kind: 'inspiration', side: 'B', roll: { type: 'saveRolled', roll: 5, saved: false } })
    expect(hp(state, 'B.m1')).toBe(25)
    expect(legalActions(state)).toEqual([
      { type: 'useInspiration', side: 'B' },
      { type: 'declineInspiration', side: 'B' },
    ])
    // Team A cannot answer for team B.
    expect(code(applyAction(state, { type: 'useInspiration', side: 'A' }))).toBe('no-decision')
  })

  it('using it rerolls the save: the new roll stands and Bleed does not stick', () => {
    const paused = decline(rend(battle({ dice })).state, 'A').state
    const { state, events } = use(paused, 'B')
    expect(types(events)).toEqual(['inspirationUsed', 'saveRolled'])
    expect(events[1]).toMatchObject({ unit: 'B.m1', roll: 15, total: 17, saved: true, rerolled: true })
    expect(state.units.find((u) => u.id === 'B.m1')?.statuses).toEqual([])
    expect(state.inspiration).toEqual({ A: true, B: false })
    expect(state.sideToAct).toBe('A')
    expect(rollsUsed(state)).toBe(4)
  })

  it('declining keeps the failed save: Bleed sticks', () => {
    const paused = decline(rend(battle({ dice })).state, 'A').state
    const { events } = decline(paused, 'B')
    expect(types(events)).toEqual(['inspirationDeclined', 'statusApplied'])
  })
})

describe('the dice order after a reroll (rules §21.4)', () => {
  it('the new d20 is drawn at once, before damage and save dice', () => {
    // attack 3 (miss) → reroll 15 (hit) → damage 4 → save 5 (fails) → reroll 15.
    const paused = rend(battle({ dice: { rolls: [3, 15, 4, 5, 15] } })).state
    expect(rollsUsed(paused)).toBe(1)
    const afterAttack = use(paused, 'A')
    expect(afterAttack.events.filter((e) => e.type === 'damageDealt')).toMatchObject([{ rolls: [4] }])
    expect(afterAttack.events.filter((e) => e.type === 'saveRolled')).toMatchObject([{ roll: 5 }])
    expect(rollsUsed(afterAttack.state)).toBe(4)
    const afterSave = use(afterAttack.state, 'B')
    expect(afterSave.events.at(-1)).toMatchObject({ type: 'saveRolled', roll: 15, rerolled: true })
    expect(rollsUsed(afterSave.state)).toBe(5)
  })

  it('the same Battle with every decision declined uses the same dice as without Inspiration', () => {
    const rolls = [15, 4, 5]
    const without = rend(battle({ inspiration: { A: false, B: false }, dice: { rolls } })).state
    const declined = decline(decline(rend(battle({ dice: { rolls } })).state, 'A').state, 'B').state
    expect(declined.units).toEqual(without.units)
    expect(declined.dice).toEqual(without.dice)
  })
})

describe('while an Inspiration decision is pending only its answers are legal', () => {
  const paused = () => attack(battle({ dice: { rolls: [15, 3] } }), 'A.m1', 'B.m1').state
  const tile = tileFromName

  it.each<[string, Action]>([
    ['another attack', { type: 'basicAttack', unit: 'A.m2', target: 'B.m1' }],
    ['a Move', { type: 'move', unit: 'A.m2', to: tile('f2') }],
    ['Defend', { type: 'defend', unit: 'A.m2' }],
    ['a skill', { type: 'useSkill', unit: 'A.m2', skill: 'pack_howl' }],
    ['End Turn', { type: 'endTurn' }],
    ["Hit and Run's step", { type: 'retreat', unit: 'A.m1', to: null }],
    ['a deployment action', { type: 'confirmDeployment' }],
  ])('%s is rejected with decision-pending', (_name, action) => {
    const state = paused()
    const result = applyAction(state, action)
    expect(code(result)).toBe('decision-pending')
    expect(result.state).toBe(state)
  })

  it('previewing an attack is rejected the same way, and answering previews as legal', () => {
    const state = paused()
    expect(previewAction(state, { type: 'basicAttack', unit: 'A.m2', target: 'B.m1' })).toMatchObject({
      ok: false,
      rejection: { code: 'decision-pending' },
    })
    expect(previewAction(state, { type: 'useInspiration', side: 'A' })).toEqual({ ok: true, preview: null })
  })

  it('answering when nothing is pending, or for the other side, is rejected with no-decision', () => {
    expect(code(applyAction(battle(), { type: 'useInspiration', side: 'A' }))).toBe('no-decision')
    expect(code(applyAction(battle(), { type: 'declineInspiration', side: 'B' }))).toBe('no-decision')
    expect(code(applyAction(paused(), { type: 'declineInspiration', side: 'B' }))).toBe('no-decision')
  })

  it('preview ignores Inspiration: the odds are those of a single roll', () => {
    const plain = previewAction(battle({ inspiration: { A: false, B: false } }), { type: 'basicAttack', unit: 'A.m1', target: 'B.m1' })
    const inspired = previewAction(battle(), { type: 'basicAttack', unit: 'A.m1', target: 'B.m1' })
    expect(inspired).toEqual(plain)
  })
})

describe("Inspiration and Hit and Run's step (rules §10.5 steps 2 and 8)", () => {
  it('the decision on the attack roll comes first, then the step', () => {
    const state = battle({ dice: { rolls: [12, 5] } })
    const paused = accepted(applyAction(state, { type: 'useSkill', unit: 'A.m1', skill: 'hit_and_run', target: 'B.m1' }))
    expect(types(paused.events)).toEqual(['skillUsed', 'attackRolled', 'inspirationOffered'])
    expect(paused.state.pending).toMatchObject({ kind: 'inspiration' })
    expect(code(applyAction(paused.state, { type: 'retreat', unit: 'A.m1', to: null }))).toBe('decision-pending')
    const { state: after, events } = decline(paused.state, 'A')
    expect(types(events)).toEqual(['inspirationDeclined', 'damageDealt'])
    expect(after.pending).toMatchObject({ kind: 'retreat', side: 'A', unit: 'A.m1' })
    expect(legalActions(after).every((a) => a.type === 'retreat')).toBe(true)
    const stepped = accepted(applyAction(after, { type: 'retreat', unit: 'A.m1', to: tileFromName('d3') }))
    expect(stepped.state.pending).toBeNull()
  })
})

describe('Inspiration on initiative: the losing side first (rules §17.2, D-09)', () => {
  // Scenario 1: both teams' highest AGI mod is +1.
  const deploy = (rolls: number[]) => deployBothSides({ rolls }, undefined, BOTH)

  it('the losing side is offered first, after both d20s; the Board is revealed', () => {
    const { state, events } = deploy([15, 10])
    expect(types(events)).toEqual(['deploymentConfirmed', 'deploymentRevealed', 'initiativeRolled', 'inspirationOffered'])
    expect(state.pending).toMatchObject({ kind: 'inspiration', side: 'B', roll: { type: 'initiativeRolled', tie: false } })
    expect(state.phase).toBe('play')
    expect(state.units).toHaveLength(6)
    expect(state.firstSide).toBeNull()
    expect(legalActions(state)).toEqual([
      { type: 'useInspiration', side: 'B' },
      { type: 'declineInspiration', side: 'B' },
    ])
  })

  it('declining keeps the order and starts the first Turn', () => {
    const { state, events } = decline(deploy([15, 10]).state, 'B')
    expect(types(events)).toEqual(['inspirationDeclined', 'initiativeDecided', 'turnStarted'])
    expect(state).toMatchObject({ firstSide: 'A', sideToAct: 'A', round: 1, inspiration: { A: true, B: true } })
  })

  it('a reroll that turns the order round lets the new losing side use its own', () => {
    // A 15 + 1 = 16, B 10 + 1 = 11 → B rerolls 18: 19 → A rerolls 20: 21.
    let step = use(deploy([15, 10, 18, 20]).state, 'B')
    expect(step.events).toEqual([
      { type: 'inspirationUsed', side: 'B' },
      {
        type: 'initiativeRolled',
        rolls: { A: { d20: 15, modifier: 1, total: 16 }, B: { d20: 18, modifier: 1, total: 19 } },
        tie: false,
        rerolled: 'B',
      },
      expect.objectContaining({ type: 'inspirationOffered', side: 'A' }),
    ])
    step = use(step.state, 'A')
    expect(types(step.events)).toEqual(['inspirationUsed', 'initiativeRolled', 'initiativeDecided', 'turnStarted'])
    expect(step.state).toMatchObject({ firstSide: 'A', inspiration: { A: false, B: false } })
    expect(step.state.initiative?.rolls).toHaveLength(3)
    expect(rollsUsed(step.state)).toBe(4)
  })

  it('a reroll that still loses ends it: the other side, which won, is not asked', () => {
    const { state, events } = use(deploy([15, 10, 2]).state, 'B')
    expect(types(events)).toEqual(['inspirationUsed', 'initiativeRolled', 'initiativeDecided', 'turnStarted'])
    expect(state.firstSide).toBe('A')
  })

  it('a tie after a reroll makes both sides roll a new pair; only a side with Inspiration left is asked', () => {
    // A 16, B 11 → B rerolls 15: 16, a tie → pair A 3 (4), B 9 (10) → A loses and is asked.
    let step = use(deploy([15, 10, 15, 3, 9]).state, 'B')
    expect(types(step.events)).toEqual(['inspirationUsed', 'initiativeRolled', 'initiativeRolled', 'inspirationOffered'])
    expect(step.events[1]).toMatchObject({ tie: true, rerolled: 'B' })
    expect(step.state.pending).toMatchObject({ side: 'A' })
    step = decline(step.state, 'A')
    expect(step.state.firstSide).toBe('B')
    expect(rollsUsed(step.state)).toBe(5)
  })

  it('a side without Inspiration is not asked', () => {
    const { state, events } = deployBothSides({ rolls: [15, 10] }, undefined, { A: true, B: false })
    expect(types(events)).not.toContain('inspirationOffered')
    expect(state.firstSide).toBe('A')
  })
})

describe('Replay records the Inspiration decisions (rules §18)', () => {
  it('replaying the actions gives the same Battle, decisions included', () => {
    const tiles = (side: Side) => {
      const [tamer, m1, m2] = TILES[side].map(tileFromName)
      return [tamer!, m1!, m2!] as const
    }
    const header = {
      scenarioId: 'scenario_1',
      boardId: 'crossroads',
      mode: 'hotseat',
      diceSeed: '0123456789abcdef',
      preset: { tiles: { A: tiles('A'), B: tiles('B') }, firstSide: 'A' },
    } as const
    // Play it live: answer every decision, using Inspiration on the first one of each side.
    const replayed = replayBattle(recordReplay(header, gameData, []), gameData)
    if (!replayed.ok) throw new Error('replay failed')
    let state = replayed.final
    const actions: Action[] = []
    const play = (action: Action) => {
      state = accepted(applyAction(state, action)).state
      actions.push(action)
      while (state.pending?.kind === 'inspiration') {
        const side = state.pending.side
        const answer: Action = state.inspiration[side] && side === 'A' ? { type: 'useInspiration', side } : { type: 'declineInspiration', side }
        state = accepted(applyAction(state, answer)).state
        actions.push(answer)
      }
    }
    play({ type: 'useSkill', unit: 'A.m1', skill: 'rend', target: 'B.m1' })
    play({ type: 'endTurn' })
    play({ type: 'basicAttack', unit: 'B.m1', target: 'A.m1' })
    play({ type: 'endTurn' })
    play({ type: 'basicAttack', unit: 'A.m1', target: 'B.m1' })
    expect(actions.some((a) => a.type === 'useInspiration')).toBe(true)
    expect(actions.some((a) => a.type === 'declineInspiration')).toBe(true)

    const replay = recordReplay(header, gameData, actions)
    const first = replayBattle(replay, gameData)
    const second = replayBattle(JSON.parse(JSON.stringify(replay)), gameData)
    if (!first.ok || !second.ok) throw new Error('replay failed')
    expect(first.final).toEqual(state)
    expect(second.final).toEqual(state)
  })
})

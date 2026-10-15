import { describe, expect, it } from 'vitest'
import { tileFromName, type Skill } from '@mt/shared'
import {
  applyAction,
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
import { gameData, NEUTRAL_ELEMENTS, scenario1Battle, scenario1Deployment, type BattleOptions } from './fixtures.ts'

// Fangrel (A.m1, d4 — a dark tile, no effect on forest) next to Tidewall (B.m1, d5),
// every Monster forest (neutral). Fangrel 1 Star: attack +2, POW mod +2, Save DC
// (POW) 11. Tidewall 1 Star: Guard 11, HP 31, VIT mod +2.
const TILES = { A: ['a1', 'd4', 'g1'], B: ['a7', 'd5', 'g7'] } as const

function battle(options: BattleOptions = {}): BattleState {
  return scenario1Battle({ tiles: TILES, elements: NEUTRAL_ELEMENTS, ...options })
}

function accepted(result: ApplyResult): { state: BattleState; events: readonly BattleEvent[] } {
  if (!result.ok) throw new Error(result.rejection.message)
  return result
}

function useSkill(state: BattleState, unit: UnitId, skill: string, target?: UnitId): ApplyResult {
  return applyAction(state, { type: 'useSkill', unit, skill, ...(target !== undefined ? { target } : {}) })
}

const endTurn = (state: BattleState) => accepted(applyAction(state, { type: 'endTurn' }))
const endTurns = (state: BattleState, count: number) => {
  let s = state
  for (let i = 0; i < count; i++) s = endTurn(s).state
  return s
}
const unit = (state: BattleState, id: UnitId) => state.units.find((u) => u.id === id)
const cooldown = (state: BattleState, id: UnitId, skill: string) =>
  unitSkills(state, id).find((s) => s.skill === skill)?.cooldown
const rollsUsed = (state: BattleState) => (state.dice.kind === 'scripted' ? state.dice.position : NaN)
const skillUses = (state: BattleState, id: UnitId) =>
  legalActions(state).flatMap((a) => (a.type === 'useSkill' && a.unit === id ? [a] : []))

function rejection(result: ApplyResult): string {
  return result.ok ? 'accepted' : result.rejection.code
}

/** Answer Hit and Run's step by staying, if it is pending. */
function stay(state: BattleState): BattleState {
  return state.pending === null ? state : accepted(applyAction(state, { type: 'retreat', unit: state.pending.unit, to: null })).state
}

describe('tiers and cooldowns (rules §13, D-16)', () => {
  it('lists the loadout with tier, cooldown and whether the engine has it yet', () => {
    const state = battle()
    expect(unitSkills(state, 'A.m1')).toEqual([
      { skill: 'heavy_blow', tier: 'major', cooldown: 0, spent: false, implemented: true },
      { skill: 'rend', tier: 'major', cooldown: 0, spent: false, implemented: true },
      { skill: 'hit_and_run', tier: 'minor', cooldown: 0, spent: false, implemented: true },
      { skill: 'pack_howl', tier: 'major', cooldown: 0, spent: false, implemented: true },
    ])
    expect(unitSkills(state, 'B.m1').map((s) => [s.skill, s.tier, s.implemented])).toEqual([
      ['taunt', 'major', false],
      ['shield_bash', 'minor', false],
      ['counter', 'minor', false],
      ['pincer_guard', 'passive', false],
    ])
  })

  it('a Major skill used on Turn N shows 2, then 1 on Turn N + 1, and is usable again on Turn N + 2', () => {
    let state = accepted(useSkill(battle(), 'A.m1', 'heavy_blow', 'B.m1')).state
    expect(unit(state, 'A.m1')?.skillsUsed).toEqual({ heavy_blow: 1 })
    expect(cooldown(state, 'A.m1', 'heavy_blow')).toBe(2)

    state = endTurn(state).state // team B, Turn 1: team A is still on its Turn 1
    expect(cooldown(state, 'A.m1', 'heavy_blow')).toBe(2)

    state = endTurn(state).state // team A, Turn 2
    expect(cooldown(state, 'A.m1', 'heavy_blow')).toBe(1)
    expect(skillUses(state, 'A.m1').map((a) => a.skill)).not.toContain('heavy_blow')
    expect(rejection(useSkill(state, 'A.m1', 'heavy_blow', 'B.m1'))).toBe('on-cooldown')
    // Every Major skill has its own cooldown: Rend is ready.
    expect(skillUses(state, 'A.m1').map((a) => a.skill)).toContain('rend')

    state = endTurns(state, 2) // team A, Turn 3
    expect(cooldown(state, 'A.m1', 'heavy_blow')).toBe(0)
    expect(skillUses(state, 'A.m1').map((a) => a.skill)).toContain('heavy_blow')
    expect(useSkill(state, 'A.m1', 'heavy_blow', 'B.m1').ok).toBe(true)
  })

  it('a Minor skill has no cooldown: Hit and Run on two Turns in a row', () => {
    let state = stay(accepted(useSkill(battle(), 'A.m1', 'hit_and_run', 'B.m1')).state)
    expect(cooldown(state, 'A.m1', 'hit_and_run')).toBe(0)
    state = endTurns(state, 2)
    expect(useSkill(state, 'A.m1', 'hit_and_run', 'B.m1').ok).toBe(true)
  })

  it('a Signature skill is used once per Battle (phase 1 has none in a loadout: a data change makes one)', () => {
    let state = stay(accepted(useSkill(battle({ skills: { hit_and_run: { tier: 'signature' } } }), 'A.m1', 'hit_and_run', 'B.m1')).state)
    expect(unitSkills(state, 'A.m1').find((s) => s.skill === 'hit_and_run')).toMatchObject({ cooldown: 0, spent: true })
    state = endTurns(state, 6)
    expect(rejection(useSkill(state, 'A.m1', 'hit_and_run', 'B.m1'))).toBe('on-cooldown')
    expect(skillUses(state, 'A.m1').map((a) => a.skill)).not.toContain('hit_and_run')
  })

  it('a skill uses the Unit\'s Action: after it, no Basic Attack, Defend or other skill this Turn', () => {
    const state = accepted(useSkill(battle(), 'A.m1', 'heavy_blow', 'B.m1')).state
    expect(unit(state, 'A.m1')?.hasActed).toBe(true)
    expect(rejection(useSkill(state, 'A.m1', 'pack_howl'))).toBe('already-acted')
    expect(rejection(applyAction(state, { type: 'defend', unit: 'A.m1' }))).toBe('already-acted')
    expect(state.activations).toMatchObject({ current: 'A.m1', started: ['A.m1'] })
  })

  it('Passive skills and skills whose ticket has not landed are never offered', () => {
    const state = battle({ firstSide: 'B' })
    expect(rejection(useSkill(state, 'B.m1', 'pincer_guard'))).toBe('skill-not-available')
    expect(rejection(useSkill(state, 'B.m1', 'taunt', 'A.m1'))).toBe('skill-not-available')
    expect(skillUses(state, 'B.m1')).toEqual([])
  })
})

describe('legal skill uses', () => {
  it('legalActions offers each Fangrel skill on each enemy it can reach, and Pack Howl once', () => {
    expect(skillUses(battle(), 'A.m1')).toEqual([
      { type: 'useSkill', unit: 'A.m1', skill: 'heavy_blow', target: 'B.m1' },
      { type: 'useSkill', unit: 'A.m1', skill: 'rend', target: 'B.m1' },
      { type: 'useSkill', unit: 'A.m1', skill: 'hit_and_run', target: 'B.m1' },
      { type: 'useSkill', unit: 'A.m1', skill: 'pack_howl' },
    ])
  })

  it('every legal action is accepted, skills included', () => {
    const state = battle()
    for (const action of legalActions(state)) expect(applyAction(state, action).ok, JSON.stringify(action)).toBe(true)
  })

  const illegal: readonly [string, () => ApplyResult, string][] = [
    ['out of range', () => useSkill(battle(), 'A.m1', 'heavy_blow', 'B.m2'), 'out-of-range'],
    ['on an ally', () => useSkill(battle(), 'A.m1', 'rend', 'A.tamer'), 'not-an-enemy'],
    ['without a target', () => useSkill(battle(), 'A.m1', 'heavy_blow'), 'invalid-target'],
    ['Pack Howl with a target', () => useSkill(battle(), 'A.m1', 'pack_howl', 'A.tamer'), 'invalid-target'],
    ['not in the loadout', () => useSkill(battle(), 'A.m1', 'taunt', 'B.m1'), 'not-in-loadout'],
    ['unknown skill', () => useSkill(battle(), 'A.m1', 'fireball', 'B.m1'), 'unknown-skill'],
    ['by the side not to act', () => useSkill(battle(), 'B.m1', 'taunt', 'A.m1'), 'not-your-turn'],
    ['during deployment', () => useSkill(scenario1Deployment(), 'A.m1', 'heavy_blow', 'B.m1'), 'wrong-phase'],
    [
      'after a Basic Attack',
      () => useSkill(accepted(applyAction(battle({ dice: { rolls: [2] } }), { type: 'basicAttack', unit: 'A.m1', target: 'B.m1' })).state, 'A.m1', 'rend', 'B.m1'),
      'already-acted',
    ],
  ]
  for (const [what, attempt, code] of illegal) {
    it(`rejects a skill ${what}: ${code}`, () => expect(rejection(attempt())).toBe(code))
  }

  it('at distance 2 or more, Units on the line block the skill (rules §7): the reason names them', () => {
    // A longer Heavy Blow (data change only) at Quillfox on d6, with Tidewall on d5 in between.
    const state = battle({ tiles: { A: TILES.A, B: ['a7', 'd5', 'd6'] }, skills: { heavy_blow: { range: 3 } } })
    const result = useSkill(state, 'A.m1', 'heavy_blow', 'B.m2')
    expect(result).toMatchObject({ ok: false, rejection: { code: 'no-line-of-sight', blockedBy: ['B.m1'] } })
    expect(previewAction(state, { type: 'useSkill', unit: 'A.m1', skill: 'heavy_blow', target: 'B.m2' })).toEqual({
      ok: false,
      rejection: !result.ok && result.rejection,
    })
  })

  it('a rejected skill returns the same state object, unchanged', () => {
    const state = battle()
    const before = structuredClone(state)
    const result = useSkill(state, 'A.m1', 'heavy_blow', 'B.m2')
    expect(result.state).toBe(state)
    expect(state).toEqual(before)
  })
})

describe('Heavy Blow: Major, physical 2d8 (rules §15.1)', () => {
  it('rolls 2d8 + POW mod on a hit', () => {
    const { state, events } = accepted(useSkill(battle({ dice: { rolls: [10, 3, 5] } }), 'A.m1', 'heavy_blow', 'B.m1'))
    expect(events).toEqual([
      { type: 'skillUsed', unit: 'A.m1', skill: 'heavy_blow', targets: ['B.m1'] },
      {
        type: 'attackRolled',
        attacker: 'A.m1',
        target: 'B.m1',
        skill: 'heavy_blow',
        rollMode: 'normal',
        rolls: [10],
        natural: 10,
        attackBonus: 2,
        total: 12,
        defence: 11,
        defenceKind: 'guard',
        hit: true,
        critical: false,
      },
      {
        type: 'damageDealt',
        source: 'A.m1',
        target: 'B.m1',
        skill: 'heavy_blow',
        dice: { count: 2, sides: 8 },
        rolls: [3, 5],
        modifier: 2,
        amount: 10,
        hpBefore: 31,
        hpAfter: 21,
      },
    ])
    expect(rollsUsed(state)).toBe(3)
  })

  it('a critical rolls 4d8, the modifier once', () => {
    const { events } = accepted(useSkill(battle({ dice: { rolls: [20, 1, 2, 3, 4] } }), 'A.m1', 'heavy_blow', 'B.m1'))
    expect(events[2]).toMatchObject({ type: 'damageDealt', dice: { count: 4, sides: 8 }, rolls: [1, 2, 3, 4], amount: 12 })
  })

  it('a miss rolls no damage', () => {
    const { state, events } = accepted(useSkill(battle({ dice: { rolls: [8] } }), 'A.m1', 'heavy_blow', 'B.m1'))
    expect(events.map((e) => e.type)).toEqual(['skillUsed', 'attackRolled'])
    expect(rollsUsed(state)).toBe(1)
  })

  it('preview: exact hit and critical chances and damage ranges, without rolling', () => {
    const state = battle({ dice: { rolls: [] } })
    const before = structuredClone(state)
    const result = previewAction(state, { type: 'useSkill', unit: 'A.m1', skill: 'heavy_blow', target: 'B.m1' })
    expect(result).toMatchObject({
      ok: true,
      preview: {
        type: 'attack',
        skill: 'heavy_blow',
        attackBonus: 2,
        defence: 11,
        // Hits on 9–20: 12 of 20 faces.
        hitChance: { numerator: 12, denominator: 20 },
        criticalChance: { numerator: 1, denominator: 20 },
        damage: { dice: { count: 2, sides: 8 }, modifier: 2, min: 4, max: 18 },
        criticalDamage: { dice: { count: 4, sides: 8 }, modifier: 2, min: 6, max: 34 },
        statuses: [],
      },
    })
    expect(state).toEqual(before)
  })
})

describe('Rend: Major, physical 1d6 + Bleed, save VIT (rules §15.1, §11)', () => {
  it('on a hit the target saves d20 + VIT mod against the user\'s Save DC; failing gives Bleed 3', () => {
    const { state, events } = accepted(useSkill(battle({ dice: { rolls: [15, 4, 5] } }), 'A.m1', 'rend', 'B.m1'))
    expect(events.slice(2)).toEqual([
      expect.objectContaining({ type: 'damageDealt', dice: { count: 1, sides: 6 }, amount: 6, hpAfter: 25 }),
      {
        type: 'saveRolled',
        unit: 'B.m1',
        source: 'A.m1',
        skill: 'rend',
        status: 'bleed',
        stat: 'vit',
        roll: 5,
        modifier: 2,
        total: 7,
        dc: 11,
        saved: false,
      },
      // Given during team A's Turn to a team B Unit: no skipped countdown.
      { type: 'statusApplied', unit: 'B.m1', status: { id: 'bleed', turnsLeft: 3 } },
    ])
    expect(unit(state, 'B.m1')?.statuses).toEqual([{ id: 'bleed', turnsLeft: 3 }])
  })

  it('a save that reaches the DC resists: 9 + 2 = 11', () => {
    const { state, events } = accepted(useSkill(battle({ dice: { rolls: [15, 4, 9] } }), 'A.m1', 'rend', 'B.m1'))
    expect(events.at(-1)).toMatchObject({ type: 'saveRolled', total: 11, dc: 11, saved: true })
    expect(unit(state, 'B.m1')?.statuses).toEqual([])
  })

  it('no natural 1 or 20 rule on saves (D-27): a 20 below the DC still fails', () => {
    // Save DC with POW 30 (mod +10): 8 + 1 + 10 = 19; Tidewall with VIT 1 (mod −5) saves 20 − 5 = 15.
    const state = battle({ stats: { 'A.m1': { pow: 30 }, 'B.m1': { vit: 1 } }, dice: { rolls: [15, 1, 20] } })
    const { events } = accepted(useSkill(state, 'A.m1', 'rend', 'B.m1'))
    expect(events.at(-2)).toMatchObject({ type: 'saveRolled', roll: 20, modifier: -5, total: 15, dc: 19, saved: false })
    expect(events.at(-1)).toMatchObject({ type: 'statusApplied', status: { id: 'bleed' } })
  })

  it('a miss rolls neither damage nor save', () => {
    const { state, events } = accepted(useSkill(battle({ dice: { rolls: [3] } }), 'A.m1', 'rend', 'B.m1'))
    expect(events.map((e) => e.type)).toEqual(['skillUsed', 'attackRolled'])
    expect(rollsUsed(state)).toBe(1)
  })

  it('a target that goes down rolls no save and gets no Bleed (rules §14.1)', () => {
    // Quillfox (HP 19) next to a POW 30 Fangrel: a critical 2d6 + 10 = 22.
    const state = battle({ tiles: { A: TILES.A, B: ['a7', 'g7', 'd5'] }, stats: { 'A.m1': { pow: 30 } }, dice: { rolls: [20, 6, 6] } })
    const { state: after, events } = accepted(useSkill(state, 'A.m1', 'rend', 'B.m2'))
    expect(events.map((e) => e.type)).toEqual(['skillUsed', 'attackRolled', 'damageDealt', 'unitDown'])
    expect(rollsUsed(after)).toBe(3)
  })

  it('preview: the chance of a hit and, after a hit, of a failed save (8 of 20)', () => {
    const result = previewAction(battle(), { type: 'useSkill', unit: 'A.m1', skill: 'rend', target: 'B.m1' })
    expect(result).toMatchObject({
      ok: true,
      preview: {
        type: 'attack',
        hitChance: { numerator: 12, denominator: 20 },
        damage: { min: 3, max: 8 },
        statuses: [
          {
            status: 'bleed',
            target: 'B.m1',
            save: { stat: 'vit', dc: 11, modifier: 2, failChance: { numerator: 8, denominator: 20 } },
          },
        ],
      },
    })
  })

  it('reapplying Bleed does not stack: it starts again at 3', () => {
    let state = accepted(useSkill(battle({ dice: { rolls: [15, 1, 1, 1, 1, 15, 1, 1] } }), 'A.m1', 'rend', 'B.m1')).state
    state = endTurns(state, 4) // two Bleed ticks on team B's Turns 1 and 2 (1 each); Bleed at 1 left
    expect(unit(state, 'B.m1')?.statuses).toEqual([{ id: 'bleed', turnsLeft: 1 }])
    const { state: again, events } = accepted(useSkill(state, 'A.m1', 'rend', 'B.m1'))
    expect(events.at(-1)).toEqual({ type: 'statusApplied', unit: 'B.m1', status: { id: 'bleed', turnsLeft: 3 }, refreshed: true })
    expect(unit(again, 'B.m1')?.statuses).toEqual([{ id: 'bleed', turnsLeft: 3 }])
  })
})

describe('a skill that only rolls saves (the generic path Taunt, Hex and Distract use)', () => {
  it('rolls the target\'s save only, and the preview gives the chance it fails', () => {
    // Rend without its attack roll, by data alone: it becomes a save skill.
    const noAttack = { attack: undefined, damage: undefined } as unknown as Partial<Skill>
    const state = battle({ skills: { rend: noAttack }, dice: { rolls: [8] } })
    const action: Action = { type: 'useSkill', unit: 'A.m1', skill: 'rend', target: 'B.m1' }
    expect(previewAction(state, action)).toEqual({
      ok: true,
      preview: {
        type: 'save',
        skill: 'rend',
        user: 'A.m1',
        target: 'B.m1',
        statuses: [
          { status: 'bleed', target: 'B.m1', save: { stat: 'vit', dc: 11, modifier: 2, failChance: { numerator: 8, denominator: 20 } } },
        ],
      },
    })
    const { state: after, events } = accepted(applyAction(state, action))
    expect(events.map((e) => e.type)).toEqual(['skillUsed', 'saveRolled', 'statusApplied'])
    expect(rollsUsed(after)).toBe(1)
  })
})

describe('Bleed: 1d4 at the start of each Turn of its holder\'s side (rules §14.2, §17.4, §21.4)', () => {
  it('given in the enemy\'s Turn: ticks at the start of the next 3 Turns of its side, ends at the end of the 3rd', () => {
    let state = accepted(useSkill(battle({ dice: { rolls: [15, 4, 5, 3, 2, 4] } }), 'A.m1', 'rend', 'B.m1')).state

    let step = endTurn(state) // team B, Turn 1
    expect(step.events).toEqual([
      { type: 'turnEnded', side: 'A', turn: 1 },
      { type: 'turnStarted', side: 'B', turn: 1, round: 1 },
      {
        type: 'statusTicked',
        unit: 'B.m1',
        status: 'bleed',
        dice: { count: 1, sides: 4 },
        rolls: [3],
        amount: 3,
        hpBefore: 25,
        hpAfter: 22,
      },
    ])
    step = endTurn(step.state) // team A, Turn 2: team B's countdown 3 → 2
    expect(step.events.map((e) => e.type)).toEqual(['turnEnded', 'turnStarted'])
    expect(unit(step.state, 'B.m1')?.statuses).toEqual([{ id: 'bleed', turnsLeft: 2 }])

    state = endTurn(step.state).state // team B, Turn 2: ticks 2
    expect(unit(state, 'B.m1')?.hp).toBe(20)
    state = endTurns(state, 2) // team B, Turn 3: ticks 4
    expect(unit(state, 'B.m1')).toMatchObject({ hp: 16, statuses: [{ id: 'bleed', turnsLeft: 1 }] })

    step = endTurn(state) // end of team B's Turn 3: Bleed ends
    expect(step.events).toEqual([
      { type: 'turnEnded', side: 'B', turn: 3 },
      { type: 'statusEnded', unit: 'B.m1', status: 'bleed' },
      { type: 'turnStarted', side: 'A', turn: 4, round: 4 },
    ])
    state = endTurn(step.state).state // team B, Turn 4: no tick
    expect(unit(state, 'B.m1')?.hp).toBe(16)
    expect(rollsUsed(state)).toBe(6)
  })

  it('several Units tick in Unit order, whoever bled first', () => {
    // Quillfox (B.m2) bleeds from team A's Turn 1, Tidewall (B.m1) from Turn 3; both tick at team B's Turn 3.
    const tiles = { A: TILES.A, B: ['a7', 'd5', 'e5'] } as const
    let state = battle({ tiles, dice: { rolls: [15, 1, 1, 1, 1, 15, 1, 1, 2, 3] } })
    state = accepted(useSkill(state, 'A.m1', 'rend', 'B.m2')).state
    state = endTurns(state, 4)
    state = accepted(useSkill(state, 'A.m1', 'rend', 'B.m1')).state
    const { events } = endTurn(state)
    expect(events.filter((e) => e.type === 'statusTicked')).toEqual([
      expect.objectContaining({ unit: 'B.m1', rolls: [2] }),
      expect.objectContaining({ unit: 'B.m2', rolls: [3] }),
    ])
  })

  it('is not an attack: Guarded does not reduce it, and a Unit it brings to 0 goes down and may end the Battle', () => {
    // A d20 Bleed (data change only) on the team B Tamer, far from its Monsters (no protection).
    const tiles = { A: ['a1', 'c4', 'g1'], B: ['c5', 'g7', 'a7'] } as const
    const statuses = { bleed: { effects: { startOfTurnDamage: { count: 1, sides: 20 } } } }
    let state = battle({ tiles, statuses, dice: { rolls: [20, 6, 6, 1, 20] } })
    // Critical: 2d6 + 2 = 14, Tamer 25 → 11; save 1 + 1 = 2 against 11 fails.
    state = accepted(useSkill(state, 'A.m1', 'rend', 'B.tamer')).state
    expect(unit(state, 'B.tamer')).toMatchObject({ hp: 11, statuses: [{ id: 'bleed', turnsLeft: 3 }] })
    const { state: over, events } = endTurn(state)
    expect(events).toEqual([
      { type: 'turnEnded', side: 'A', turn: 1 },
      { type: 'turnStarted', side: 'B', turn: 1, round: 1 },
      expect.objectContaining({ type: 'statusTicked', unit: 'B.tamer', amount: 20, hpBefore: 11, hpAfter: 0 }),
      { type: 'unitDown', unit: 'B.tamer', tile: tileFromName('c5') },
      { type: 'battleEnded', winner: 'A', cause: 'tamerDown', round: 1 },
    ])
    expect(over.outcome).toEqual({ winner: 'A', cause: 'tamerDown' })
  })

  it('ticks after Guarded ends, and Guard has no part in it (rules §17.4 steps 2–3)', () => {
    let state = accepted(useSkill(battle({ dice: { rolls: [15, 1, 1, 4, 2] } }), 'A.m1', 'rend', 'B.m1')).state
    state = endTurn(state).state // team B, Turn 1: 31 − 3 − 4 = 24
    state = accepted(applyAction(state, { type: 'defend', unit: 'B.m1' })).state
    const { events } = endTurn(endTurn(state).state) // team B, Turn 2
    expect(events).toEqual([
      { type: 'turnEnded', side: 'A', turn: 2 },
      { type: 'turnStarted', side: 'B', turn: 2, round: 2 },
      { type: 'statusEnded', unit: 'B.m1', status: 'guarded' },
      expect.objectContaining({ type: 'statusTicked', unit: 'B.m1', amount: 2, hpBefore: 24, hpAfter: 22 }),
    ])
  })
})

describe('Pack Howl: Rallied 2 on the user and every ally within 1, Tamer included (rules §15.1, D-19)', () => {
  // Fangrel d4, its Tamer next to it on c4, Wispling far on g1; Quillfox on b4 next to the Tamer.
  const tiles = { A: ['c4', 'd4', 'g1'], B: ['a7', 'd5', 'b4'] } as const
  const howl = (state: BattleState) => accepted(useSkill(state, 'A.m1', 'pack_howl'))

  it('needs no roll; given in its own Turn, it skips that Turn\'s countdown (D-02)', () => {
    const state = battle({ tiles, dice: { rolls: [] } })
    expect(previewAction(state, { type: 'useSkill', unit: 'A.m1', skill: 'pack_howl' })).toEqual({
      ok: true,
      preview: { type: 'effect', skill: 'pack_howl', user: 'A.m1', units: ['A.tamer', 'A.m1'], statuses: ['rallied'] },
    })
    const { state: after, events } = howl(state)
    const rallied = { id: 'rallied', turnsLeft: 2, skipCountdown: true }
    expect(events).toEqual([
      { type: 'skillUsed', unit: 'A.m1', skill: 'pack_howl', targets: ['A.tamer', 'A.m1'] },
      { type: 'statusApplied', unit: 'A.tamer', status: rallied },
      { type: 'statusApplied', unit: 'A.m1', status: rallied },
    ])
    expect(unit(after, 'A.m2')?.statuses).toEqual([])
    expect(cooldown(after, 'A.m1', 'pack_howl')).toBe(2)
  })

  it('Rallied adds +1 to every attack roll of the Tamer and of Fangrel', () => {
    const state = howl(battle({ tiles, dice: { rolls: [6] } })).state
    const attack = (s: BattleState, attacker: UnitId, target: UnitId) => {
      const result = previewAction(s, { type: 'basicAttack', unit: attacker, target })
      return result.ok && result.preview?.type === 'attack' ? result.preview : undefined
    }
    // Tamer Level 1: SEN mod +1, proficiency +2, Rallied +1 = +4 against Quillfox's Guard 11: hits on 7–20.
    expect(attack(state, 'A.tamer', 'B.m2')).toMatchObject({
      attackBonus: 4,
      statusAttackBonuses: [{ status: 'rallied', bonus: 1 }],
      hitChance: { numerator: 14, denominator: 20 },
    })
    const { events } = accepted(applyAction(state, { type: 'basicAttack', unit: 'A.tamer', target: 'B.m2' }))
    expect(events[0]).toMatchObject({ natural: 6, attackBonus: 4, total: 10, hit: false })
    // Fangrel's own Rallied, on team A's next Turn.
    expect(attack(endTurns(state, 2), 'A.m1', 'B.m1')).toMatchObject({ attackBonus: 3, statusAttackBonuses: [{ status: 'rallied', bonus: 1 }] })
  })

  it('lasts the rest of the Turn it was given in plus 2 more Turns of its side', () => {
    let state = howl(battle({ tiles })).state
    state = endTurn(state).state
    expect(unit(state, 'A.m1')?.statuses).toEqual([{ id: 'rallied', turnsLeft: 2 }])
    state = endTurns(state, 1) // team A, Turn 2
    state = endTurns(state, 2) // team A, Turn 3
    expect(unit(state, 'A.tamer')?.statuses).toEqual([{ id: 'rallied', turnsLeft: 1 }])
    const { state: after, events } = endTurn(state) // end of team A's Turn 3
    expect(events).toEqual([
      { type: 'turnEnded', side: 'A', turn: 3 },
      { type: 'statusEnded', unit: 'A.tamer', status: 'rallied' },
      { type: 'statusEnded', unit: 'A.m1', status: 'rallied' },
      { type: 'turnStarted', side: 'B', turn: 3, round: 3 },
    ])
    expect(unit(after, 'A.m1')?.statuses).toEqual([])
  })

  it('used again while it lasts: reset to full duration, not stacked', () => {
    let state = endTurns(howl(battle({ tiles })).state, 4) // team A, Turn 3: Pack Howl is ready again
    const { state: again, events } = howl(state)
    expect(events[1]).toEqual({
      type: 'statusApplied',
      unit: 'A.tamer',
      status: { id: 'rallied', turnsLeft: 2, skipCountdown: true },
      refreshed: true,
    })
    state = endTurn(again).state
    expect(unit(state, 'A.m1')?.statuses).toEqual([{ id: 'rallied', turnsLeft: 2 }])
  })
})

describe('Hit and Run: 1d8, then a free step of 1 tile, hit or miss (rules §15.1, D-12)', () => {
  it('after the attack the user chooses a step: nothing else is legal until it does', () => {
    const { state, events } = accepted(useSkill(battle({ dice: { rolls: [12, 5] } }), 'A.m1', 'hit_and_run', 'B.m1'))
    expect(events.map((e) => e.type)).toEqual(['skillUsed', 'attackRolled', 'damageDealt'])
    expect(state.pending).toEqual({ kind: 'retreat', unit: 'A.m1', skill: 'hit_and_run', steps: 1 })
    const legal = legalActions(state)
    expect(legal.every((a) => a.type === 'retreat')).toBe(true)
    // Every empty neighbour of d4 (d5 holds Tidewall), then staying.
    expect(legal.map((a) => (a.type === 'retreat' && a.to !== null ? `${'abcdefg'[a.to.x]}${a.to.y + 1}` : 'stay'))).toEqual([
      'c3',
      'd3',
      'e3',
      'c4',
      'e4',
      'c5',
      'e5',
      'stay',
    ])
    expect(rejection(applyAction(state, { type: 'endTurn' }))).toBe('decision-pending')
    expect(rejection(applyAction(state, { type: 'move', unit: 'A.tamer', to: tileFromName('b1') }))).toBe('decision-pending')
  })

  it('the step is not a Move: the user can still Move afterwards', () => {
    let state = accepted(useSkill(battle({ dice: { rolls: [12, 5] } }), 'A.m1', 'hit_and_run', 'B.m1')).state
    const step = accepted(applyAction(state, { type: 'retreat', unit: 'A.m1', to: tileFromName('d3') }))
    expect(step.events).toEqual([{ type: 'unitRetreated', unit: 'A.m1', from: tileFromName('d4'), to: tileFromName('d3') }])
    state = step.state
    expect(unit(state, 'A.m1')).toMatchObject({ tile: tileFromName('d3'), hasMoved: false, hasActed: true })
    expect(state.pending).toBeNull()
    expect(applyAction(state, { type: 'move', unit: 'A.m1', to: tileFromName('b2') }).ok).toBe(true)
  })

  it('a miss still offers the step; staying is a choice too', () => {
    const { state, events } = accepted(useSkill(battle({ dice: { rolls: [3] } }), 'A.m1', 'hit_and_run', 'B.m1'))
    expect(events.map((e) => e.type)).toEqual(['skillUsed', 'attackRolled'])
    expect(state.pending).not.toBeNull()
    const stayed = accepted(applyAction(state, { type: 'retreat', unit: 'A.m1', to: null }))
    expect(stayed.events).toEqual([{ type: 'retreatDeclined', unit: 'A.m1' }])
    expect(unit(stayed.state, 'A.m1')?.tile).toEqual(tileFromName('d4'))
  })

  it('after a Move first, the step is still free', () => {
    let state = accepted(applyAction(battle({ dice: { rolls: [12, 5] } }), { type: 'move', unit: 'A.m1', to: tileFromName('c4') })).state
    state = accepted(useSkill(state, 'A.m1', 'hit_and_run', 'B.m1')).state
    state = accepted(applyAction(state, { type: 'retreat', unit: 'A.m1', to: tileFromName('b3') })).state
    expect(unit(state, 'A.m1')).toMatchObject({ tile: tileFromName('b3'), hasMoved: true })
  })

  it('rejects a step that is too far, onto a Unit, by another Unit or with nothing pending', () => {
    const state = accepted(useSkill(battle({ dice: { rolls: [12, 5] } }), 'A.m1', 'hit_and_run', 'B.m1')).state
    const retreat = (unitId: UnitId, to: string | null) =>
      rejection(applyAction(state, { type: 'retreat', unit: unitId, to: to === null ? null : tileFromName(to) }))
    expect(retreat('A.m1', 'd2')).toBe('out-of-reach')
    expect(retreat('A.m1', 'd5')).toBe('tile-occupied')
    expect(retreat('A.tamer', 'b1')).toBe('no-decision')
    expect(rejection(applyAction(battle(), { type: 'retreat', unit: 'A.m1', to: null }))).toBe('no-decision')
  })

  it('a Pinned user gets no step and cannot Move (rules §14.2: Pin makes movement 0)', () => {
    // Team B's Tidewall with a Rend that gives Pin instead of Bleed (data change only); Tidewall's
    // Save DC (POW 12): 8 + 1 + 1 = 10; Fangrel saves 1 + 0.
    let state = battle({
      firstSide: 'B',
      loadouts: { 'B.m1': ['rend'] },
      skills: { rend: { applies: [{ status: 'pin', save: 'vit' }] } },
      dice: { rolls: [15, 1, 1, 12, 5] },
    })
    const pinned = accepted(useSkill(state, 'B.m1', 'rend', 'A.m1'))
    expect(pinned.events.at(-1)).toEqual({ type: 'statusApplied', unit: 'A.m1', status: { id: 'pin', turnsLeft: 1 } })
    state = endTurn(pinned.state).state // team A, Turn 1
    expect(legalActions(state).some((a) => a.type === 'move' && a.unit === 'A.m1')).toBe(false)
    expect(rejection(applyAction(state, { type: 'move', unit: 'A.m1', to: tileFromName('c4') }))).toBe('out-of-reach')
    state = accepted(useSkill(state, 'A.m1', 'hit_and_run', 'B.m1')).state
    expect(state.pending).toBeNull()
    // Pin 1, given in the other side's Turn: ends at the end of team A's Turn.
    expect(endTurn(state).events).toContainEqual({ type: 'statusEnded', unit: 'A.m1', status: 'pin' })
  })
})

describe('Replay records and replays skills', () => {
  it('useSkill and retreat replay to the same Battle', () => {
    const tiles = (side: 'A' | 'B') => {
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
    const actions: Action[] = [
      { type: 'useSkill', unit: 'A.m1', skill: 'hit_and_run', target: 'B.m1' },
      { type: 'retreat', unit: 'A.m1', to: tileFromName('d3') },
      { type: 'endTurn' },
      { type: 'endTurn' },
      { type: 'useSkill', unit: 'A.m1', skill: 'pack_howl' },
    ]
    const replay = recordReplay(header, gameData, actions)
    const first = replayBattle(replay, gameData)
    const second = replayBattle(JSON.parse(JSON.stringify(replay)), gameData)
    if (!first.ok || !second.ok) throw new Error('replay failed')
    expect(first.steps.map((s) => s.events[0]?.type)).toEqual(['skillUsed', 'unitRetreated', 'turnEnded', 'turnEnded', 'skillUsed'])
    expect(second.final).toEqual(first.final)
  })
})

describe('numbers from data (spec user story 3)', () => {
  it('Defend gives the Guarded bonus written in data/skills/defend.json', () => {
    const state = battle({ skills: { defend: { applies: [{ status: 'guarded', bonus: 3 }] } } })
    const { events } = accepted(applyAction(state, { type: 'defend', unit: 'A.m1' }))
    expect(events).toEqual([
      { type: 'defended', unit: 'A.m1' },
      { type: 'statusApplied', unit: 'A.m1', status: { id: 'guarded', bonus: 3 } },
    ])
  })

  it('the element wheel comes from data/elements', () => {
    // Fangrel (forest) against Tidewall (desert): desert beats forest in the real wheel; reversed here.
    const wheel = { id: 'element_wheel', beats: { forest: ['desert'], water: [], mountain: [], desert: [], light: [], dark: [] } } as const
    const state = scenario1Battle({ tiles: TILES, elementWheel: wheel })
    const result = previewAction(state, { type: 'basicAttack', unit: 'A.m1', target: 'B.m1' })
    expect(result).toMatchObject({
      ok: true,
      preview: {
        rollMode: 'advantage',
        rollModeSources: [{ kind: 'element', effect: 'advantage', attackerElement: 'forest', targetElement: 'desert' }],
      },
    })
  })
})

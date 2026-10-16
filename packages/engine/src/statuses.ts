/**
 * Statuses (rules §11, §14, §17.4): giving one (with a save when the skill
 * asks for one), no stacking, reapplying resets, durations counting down at
 * the end of the holder's side's Turn (D-02: not the Turn it was given in, if
 * that was its own) or of the giver's side's Turn (`applierTurns`: Marked,
 * D-03), statuses that end at the start of the holder's next Turn, and
 * start-of-Turn damage (Bleed).
 *
 * What each status does comes from data/statuses (`StatusType.effects`). The
 * effects read here: `startOfTurnDamage` (Bleed), `attackRoll` (Rallied),
 * `defenceFromSource` (Guarded), `immobile` (Pin), `damageDealt` (Weakened),
 * `untargetableFrom` (Hidden: single-target aiming in combat.ts, Burst's
 * targets in wisplingSkills.ts) and `attackersRollMode` (Marked, read by
 * rollMode.ts). The others are read by the tickets that bring their skills:
 * `forcedToAttackSource` and `counterattack` (08); `nextAttackRollMode` (Off-balance) is read in rollMode.ts (11).
 *
 * Statuses that end by their own conditions (rules §8.2, §14.1): after the
 * holder's attack roll (`untilBroken` and `untilAttackRoll` durations:
 * Hidden, Off-balance; `endAfterAttackRoll`), and statuses given by a skill
 * that needs a terrain (`whileOn`, Hidden from Camouflage on forest) when the
 * holder stands elsewhere (`endOffTerrain`).
 */
import type { Dice, Side, Skill, Stat, StatusApplication, StatusType, Terrain } from '@mt/shared'
import type { BattleEvent } from './battle.ts'
import { loseHp } from './damage.ts'
import { derive, statMod } from './derived.ts'
import { rollDice } from './dice.ts'
import { emit, rollD20, type Resolution } from './resolution.ts'
import {
  findUnit,
  terrainAt,
  type BattleState,
  type StatusEndCause,
  type StatusId,
  type UnitId,
  type UnitState,
  type UnitStatus,
} from './state.ts'

/** The definition of a status; unknown ids are a data error (loadGameData checks them). */
export function statusType(state: BattleState, id: StatusId): StatusType {
  const type = state.statusTypes[id]
  if (type === undefined) throw new Error(`Unknown status "${id}"`)
  return type
}

function typesOf(state: BattleState, unit: UnitState): { status: UnitStatus; type: StatusType }[] {
  return unit.statuses.map((status) => ({ status, type: statusType(state, status.id) }))
}

// ------------------------------------------------------------ give a status

/**
 * Give a status to a Unit on the Board (rules §14.1): the same status never
 * stacks. Reapplying resets it to its full duration (and newest source);
 * `keepHigher` statuses (Guarded) keep whichever bonus is higher. A status
 * given during its holder's own side's Turn skips the first countdown (D-02).
 * `applierTurns` (Marked) counts on the giver's side instead (`countedOn`),
 * and skips the first countdown when given during that side's Turn.
 * `whileOn`: the terrain the giving skill needs (Camouflage: forest); the
 * status ends once the holder stands elsewhere (`endOffTerrain`).
 */
export function applyStatus(
  state: BattleState,
  unitId: UnitId,
  application: StatusApplication,
  sourceId: UnitId,
  whileOn?: Terrain,
): { state: BattleState; event: BattleEvent } {
  const unit = findUnit(state, unitId)
  if (unit === undefined) throw new Error(`No Unit "${unitId}" on the Board`)
  const type = statusType(state, application.status)
  const { duration } = type
  // The side whose Turn ends count it down: the holder's (`turns`) or the giver's (`applierTurns`).
  const countedOn =
    duration.kind === 'turns' ? unit.side : duration.kind === 'applierTurns' ? (findUnit(state, sourceId)?.side ?? state.sideToAct) : null
  let status: UnitStatus = {
    id: type.id,
    ...(type.effects.defenceFromSource && application.bonus !== undefined ? { bonus: application.bonus } : {}),
    ...(countedOn !== null && 'turns' in duration ? { turnsLeft: duration.turns } : {}),
    ...(duration.kind === 'applierTurns' && countedOn !== null ? { countedOn } : {}),
    ...(countedOn !== null && state.sideToAct === countedOn ? { skipCountdown: true as const } : {}),
    ...(type.tracksSource ? { source: sourceId } : {}),
    ...(whileOn !== undefined ? { whileOn } : {}),
  }
  const existing = unit.statuses.find((s) => s.id === type.id)
  if (existing !== undefined && type.stacking === 'keepHigher' && (existing.bonus ?? 0) > (status.bonus ?? 0)) {
    status = existing
  }
  const statuses = [...unit.statuses.filter((s) => s.id !== type.id), status]
  return {
    state: { ...state, units: state.units.map((u) => (u.id === unitId ? { ...u, statuses } : u)) },
    event: { type: 'statusApplied', unit: unitId, status, ...(existing !== undefined ? { refreshed: true as const } : {}) },
  }
}

/** Save DC of a skill's user (rules §3.2): 8 + proficiency + mod of the skill's DC stat. */
export function saveDc(user: UnitState, stat: Stat): number {
  return 8 + derive(user).proficiency + statMod(user.stats[stat])
}

/** An exact probability: numerator / denominator (rules §21.1). */
export interface Chance {
  readonly numerator: number
  readonly denominator: number
}

/** The odds of one status a skill would give, for a preview. */
export interface StatusOdds {
  readonly status: StatusId
  readonly target: UnitId
  /** `null`: no save, the status sticks whenever the skill lands. */
  readonly save: SaveOdds | null
}

export interface SaveOdds {
  readonly stat: Stat
  readonly dc: number
  /** The target's mod of `stat`, added to its d20. */
  readonly modifier: number
  /** Chance the target fails (d20 + mod < DC); no natural 1 or 20 rule on saves (D-27). Over 20 faces. */
  readonly failChance: Chance
}

export function saveOdds(user: UnitState, target: UnitState, skill: Skill, stat: Stat): SaveOdds {
  const dc = saveDc(user, skill.dcStat ?? stat)
  const modifier = statMod(target.stats[stat])
  const failing = Math.min(20, Math.max(0, dc - modifier - 1))
  return { stat, dc, modifier, failChance: { numerator: failing, denominator: 20 } }
}

export function statusOdds(user: UnitState, target: UnitState, skill: Skill): StatusOdds[] {
  return (skill.applies ?? []).map((application) => ({
    status: application.status,
    target: target.id,
    save: application.save === undefined ? null : saveOdds(user, target, skill, application.save),
  }))
}

/**
 * The statuses of `skill` landing on `targetId` (rules §10.5 step 4, §11):
 * each one with a save makes the target roll d20 + mod against the user's
 * Save DC (one d20 per save, in the order of `skill.applies`), which the
 * target's side may reroll with Inspiration; it sticks only on a failed
 * save. Statuses without a save just stick.
 */
export function* giveSkillStatuses(
  before: BattleState,
  user: UnitState,
  targetId: UnitId,
  skill: Skill,
): Resolution<BattleState> {
  let state = before
  for (const application of skill.applies ?? []) {
    const target = findUnit(state, targetId)
    if (target === undefined) break
    if (application.save !== undefined) {
      const odds = saveOdds(user, target, skill, application.save)
      const stat = application.save
      // The target's side owns the save's d20 and may reroll it with Inspiration (rules §11, §18).
      const saving = yield* rollD20(state, target.side, 1, ([roll = 0]) => ({
        type: 'saveRolled' as const,
        unit: target.id,
        source: user.id,
        skill: skill.id,
        status: application.status,
        stat,
        roll,
        modifier: odds.modifier,
        total: roll + odds.modifier,
        dc: odds.dc,
        saved: roll + odds.modifier >= odds.dc,
      }))
      state = saving.state
      if (saving.roll.saved) continue
    }
    const given = applyStatus(state, target.id, application, user.id, skill.effects?.requiresTerrain)
    state = given.state
    yield* emit(given.event)
  }
  return state
}

// ------------------------------------------------------ what statuses change

export interface StatusBonus {
  readonly status: StatusId
  readonly bonus: number
}

/** Numeric bonuses statuses add to the Unit's attack rolls (Rallied +1, rules §10.2). They add up (rules §5.2). */
export function attackRollBonuses(state: BattleState, unit: UnitState): StatusBonus[] {
  return typesOf(state, unit).flatMap(({ status, type }) =>
    type.effects.attackRoll === undefined ? [] : [{ status: status.id, bonus: type.effects.attackRoll }],
  )
}

/**
 * Amounts statuses add to every damage the Unit deals (Weakened −2, rules
 * §10.3 step 3, §14.2), counterattacks included; they add up. The minimum
 * of 1 applies after them.
 */
export function damageDealtModifiers(state: BattleState, unit: UnitState): StatusBonus[] {
  return typesOf(state, unit).flatMap(({ status, type }) =>
    type.effects.damageDealt === undefined ? [] : [{ status: status.id, bonus: type.effects.damageDealt }],
  )
}

/**
 * The distance from which enemies cannot aim at the Unit (Hidden: 2, rules
 * §8.2), or `null` when no status hides it.
 */
export function untargetableFrom(state: BattleState, unit: UnitState): number | null {
  let from: number | null = null
  for (const { type } of typesOf(state, unit)) {
    const d = type.effects.untargetableFrom
    if (d !== undefined && (from === null || d < from)) from = d
  }
  return from
}

/** Guard and Ward bonus from statuses (Guarded, rules §12); 0 when none. */
export function defenceBonus(state: BattleState, unit: UnitState): number {
  return typesOf(state, unit).reduce(
    (best, { status, type }) => (type.effects.defenceFromSource ? Math.max(best, status.bonus ?? 0) : best),
    0,
  )
}

/**
 * The status that makes every attacker roll with advantage against the Unit
 * (Marked, rules §5.1, §14.2), or `null`. One source however many there are
 * (rules §5.2).
 */
export function attackersRollModeStatus(state: BattleState, unit: UnitState): { status: StatusId; effect: 'advantage' } | null {
  for (const { status, type } of typesOf(state, unit)) {
    const effect = type.effects.attackersRollMode
    if (effect !== undefined) return { status: status.id, effect }
  }
  return null
}

/** Pin: movement range 0, the Hit and Run step included (rules §14.2). */
export function isImmobile(state: BattleState, unit: UnitState): boolean {
  return typesOf(state, unit).some(({ type }) => type.effects.immobile === true)
}

// ------------------------------------------------- broken by own conditions

/**
 * After an attack roll of `unitId` has resolved (rules §8.2, §10.5 step 5):
 * its statuses that last until it attacks end (`untilBroken`: Hidden;
 * `untilAttackRoll`: Off-balance), hit or miss, counterattacks and Mark
 * included. Nothing happens to a Unit no longer on the Board.
 */
export function endAfterAttackRoll(state: BattleState, unitId: UnitId): { state: BattleState; events: BattleEvent[] } {
  const unit = findUnit(state, unitId)
  if (unit === undefined) return { state, events: [] }
  const ending = unit.statuses.filter((status) => {
    const kind = statusType(state, status.id).duration.kind
    return kind === 'untilBroken' || kind === 'untilAttackRoll'
  })
  return withoutStatuses(state, unit, ending, 'attackRoll')
}

/**
 * Every status given by a skill that needs a terrain (`whileOn`) ends on a
 * Unit that stands on another terrain (rules §8.2, D-18: Hidden off forest).
 * Checked after a Move (the destination only), Hit and Run's step, a skill
 * (Blink, a push, Attune changing a tile) and at the end of every Turn
 * (rules §17.4). All Units, in Unit order.
 */
export function endOffTerrain(before: BattleState): { state: BattleState; events: BattleEvent[] } {
  let state = before
  const events: BattleEvent[] = []
  for (const unit of before.units) {
    const terrain = terrainAt(state, unit.tile)
    const ending = unit.statuses.filter((status) => status.whileOn !== undefined && status.whileOn !== terrain)
    const ended = withoutStatuses(state, unit, ending, 'terrain')
    state = ended.state
    events.push(...ended.events)
  }
  return { state, events }
}

function withoutStatuses(
  state: BattleState,
  unit: UnitState,
  ending: readonly UnitStatus[],
  cause: StatusEndCause,
): { state: BattleState; events: BattleEvent[] } {
  if (ending.length === 0) return { state, events: [] }
  const statuses = unit.statuses.filter((status) => !ending.includes(status))
  return {
    state: { ...state, units: state.units.map((u) => (u.id === unit.id ? { ...u, statuses } : u)) },
    events: ending.map((status) => ({ type: 'statusEnded', unit: unit.id, status: status.id, cause })),
  }
}

// ------------------------------------------------------------- Turn timing

/** `update` runs on every status of every Unit on the Board, in Unit order. */
function updateStatuses(
  state: BattleState,
  update: (unit: UnitState, status: UnitStatus, type: StatusType) => UnitStatus | null,
): { state: BattleState; events: BattleEvent[] } {
  const events: BattleEvent[] = []
  let changed = false
  const units = state.units.map((unit) => {
    if (unit.statuses.length === 0) return unit
    const statuses: UnitStatus[] = []
    for (const status of unit.statuses) {
      const next = update(unit, status, statusType(state, status.id))
      if (next !== status) changed = true
      if (next === null) events.push({ type: 'statusEnded', unit: unit.id, status: status.id })
      else statuses.push(next)
    }
    return { ...unit, statuses }
  })
  return { state: changed ? { ...state, units } : state, events }
}

/**
 * Start of a Turn of `side`, step 2 (rules §17.4): statuses that last "until
 * the next Turn of the Unit's side" (Guarded, Countering) end, in Unit order.
 */
export function endOwnTurnStartStatuses(state: BattleState, side: Side): { state: BattleState; events: BattleEvent[] } {
  return updateStatuses(state, (unit, status, type) =>
    unit.side === side && type.duration.kind === 'untilOwnTurnStart' ? null : status,
  )
}

/**
 * End of a Turn of `side`, step 1 (rules §14.1, §17.4): every counted
 * duration on its Units, and every `applierTurns` duration its Units gave
 * (Marked on enemies, `countedOn`), goes down by 1 and ends at 0, in Unit
 * order, except a status given during this very Turn, which skips this one
 * countdown (D-02, D-03).
 */
export function countDownStatuses(state: BattleState, side: Side): { state: BattleState; events: BattleEvent[] } {
  return updateStatuses(state, (unit, status) => {
    if (status.turnsLeft === undefined || (status.countedOn ?? unit.side) !== side) return status
    if (status.skipCountdown) {
      const { skipCountdown: _skipped, ...rest } = status
      return rest
    }
    const turnsLeft = status.turnsLeft - 1
    return turnsLeft <= 0 ? null : { ...status, turnsLeft }
  })
}

/**
 * Start of a Turn of `side`, step 3 (rules §17.4, dice order §21.4): each of
 * its Units with a start-of-Turn damage status (Bleed 1d4), in Unit order,
 * loses HP. Not an attack: no Guard, Weakened or Cover. Stops as soon as the
 * Battle ends.
 */
export function startOfTurnDamage(before: BattleState, side: Side): { state: BattleState; events: BattleEvent[] } {
  let state = before
  const events: BattleEvent[] = []
  const order = before.units.filter((u) => u.side === side).map((u) => u.id)
  for (const unitId of order) {
    const ticking = (findUnit(state, unitId)?.statuses ?? []).flatMap((status) => {
      const dice: Dice | undefined = statusType(state, status.id).effects.startOfTurnDamage
      return dice === undefined ? [] : [{ status, dice }]
    })
    for (const { status, dice } of ticking) {
      if (state.outcome !== null || findUnit(state, unitId) === undefined) break
      const rolled = rollDice(state.dice, dice.count, dice.sides)
      const amount = rolled.rolls.reduce((total, roll) => total + roll, 0)
      const loss = loseHp({ ...state, dice: rolled.stream }, unitId, amount)
      events.push(
        {
          type: 'statusTicked',
          unit: unitId,
          status: status.id,
          dice,
          rolls: rolled.rolls,
          amount,
          hpBefore: loss.hpBefore,
          hpAfter: loss.hpAfter,
        },
        ...loss.after,
      )
      state = loss.state
    }
    if (state.outcome !== null) break
  }
  return { state, events }
}

/**
 * Statuses (rules §11, §14, §17.4): giving one (with a save when the skill
 * asks for one), no stacking, reapplying resets, durations counting down at
 * the end of the holder's side's Turn (D-02: not the Turn it was given in, if
 * that was its own), statuses that end at the start of the holder's next
 * Turn, and start-of-Turn damage (Bleed).
 *
 * What each status does comes from data/statuses (`StatusType.effects`). The
 * effects read here: `startOfTurnDamage` (Bleed), `attackRoll` (Rallied),
 * `defenceFromSource` (Guarded), `immobile` (Pin). The others are read by the
 * tickets that bring their skills: `forcedToAttackSource` and `counterattack`
 * (08), `damageDealt` (09), `attackersRollMode` and `untargetableFrom` (10),
 * `nextAttackRollMode` (11).
 */
import type { Dice, Side, Skill, Stat, StatusApplication, StatusType } from '@mt/shared'
import type { BattleEvent } from './battle.ts'
import { loseHp } from './damage.ts'
import { derive, statMod } from './derived.ts'
import { rollDice, rollDie } from './dice.ts'
import { findUnit, type BattleState, type StatusId, type UnitId, type UnitState, type UnitStatus } from './state.ts'

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
 */
export function applyStatus(
  state: BattleState,
  unitId: UnitId,
  application: StatusApplication,
  sourceId: UnitId,
): { state: BattleState; event: BattleEvent } {
  const unit = findUnit(state, unitId)
  if (unit === undefined) throw new Error(`No Unit "${unitId}" on the Board`)
  const type = statusType(state, application.status)
  const { duration } = type
  let status: UnitStatus = {
    id: type.id,
    ...(type.effects.defenceFromSource && application.bonus !== undefined ? { bonus: application.bonus } : {}),
    ...(duration.kind === 'turns' ? { turnsLeft: duration.turns } : {}),
    ...(duration.kind === 'turns' && state.sideToAct === unit.side ? { skipCountdown: true as const } : {}),
    ...(type.tracksSource ? { source: sourceId } : {}),
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
 * Save DC (one d20 per save, in the order of `skill.applies`); it sticks
 * only on a failed save. Statuses without a save just stick.
 */
export function giveSkillStatuses(
  before: BattleState,
  user: UnitState,
  targetId: UnitId,
  skill: Skill,
): { state: BattleState; events: BattleEvent[] } {
  let state = before
  const events: BattleEvent[] = []
  for (const application of skill.applies ?? []) {
    const target = findUnit(state, targetId)
    if (target === undefined) break
    if (application.save !== undefined) {
      const odds = saveOdds(user, target, skill, application.save)
      const roll = rollDie(state.dice, 20)
      state = { ...state, dice: roll.stream }
      const total = roll.value + odds.modifier
      const saved = total >= odds.dc
      events.push({
        type: 'saveRolled',
        unit: target.id,
        source: user.id,
        skill: skill.id,
        status: application.status,
        stat: application.save,
        roll: roll.value,
        modifier: odds.modifier,
        total,
        dc: odds.dc,
        saved,
      })
      if (saved) continue
    }
    const given = applyStatus(state, target.id, application, user.id)
    state = given.state
    events.push(given.event)
  }
  return { state, events }
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

/** Guard and Ward bonus from statuses (Guarded, rules §12); 0 when none. */
export function defenceBonus(state: BattleState, unit: UnitState): number {
  return typesOf(state, unit).reduce(
    (best, { status, type }) => (type.effects.defenceFromSource ? Math.max(best, status.bonus ?? 0) : best),
    0,
  )
}

/** Pin: movement range 0, the Hit and Run step included (rules §14.2). */
export function isImmobile(state: BattleState, unit: UnitState): boolean {
  return typesOf(state, unit).some(({ type }) => type.effects.immobile === true)
}

// ------------------------------------------------------------- Turn timing

function updateStatuses(
  state: BattleState,
  side: Side,
  update: (unit: UnitState, status: UnitStatus, type: StatusType) => UnitStatus | null,
): { state: BattleState; events: BattleEvent[] } {
  const events: BattleEvent[] = []
  let changed = false
  const units = state.units.map((unit) => {
    if (unit.side !== side || unit.statuses.length === 0) return unit
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
  return updateStatuses(state, side, (_unit, status, type) =>
    type.duration.kind === 'untilOwnTurnStart' ? null : status,
  )
}

/**
 * End of a Turn of `side`, step 1 (rules §14.1, §17.4): every counted
 * duration on its Units goes down by 1 and ends at 0, except a status given
 * during this very Turn, which skips this one countdown (D-02).
 */
export function countDownStatuses(state: BattleState, side: Side): { state: BattleState; events: BattleEvent[] } {
  return updateStatuses(state, side, (_unit, status) => {
    if (status.turnsLeft === undefined) return status
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

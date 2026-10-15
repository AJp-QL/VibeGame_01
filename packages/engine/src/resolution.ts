/**
 * Resolving an action that rolls d20s Inspiration may reroll (rules §18,
 * §21.6, D-09, D-10), and pausing it for the decision.
 *
 * Actions that roll such a d20 (Basic Attack, skills, the Confirm that rolls
 * initiative) are written as generators: they `yield` each event as it
 * happens and, through `rollD20` or `offerInspiration`, a decision whenever
 * a side that still has Inspiration has just seen its own d20. `runResolution`
 * drives them. When a decision has no answer yet, it stops there: the state
 * so far gets a `pending` Inspiration decision, and the events so far are
 * returned. The answer (`useInspiration` / `declineInspiration`) resolves the
 * whole action again from the state before it, replaying the earlier answers
 * (same state, same dice, so the same rolls) and carries on past the new one.
 * Nothing but plain data is stored in the state, so a paused Battle can be
 * saved, compared and replayed like any other.
 *
 * Any d20 that goes through `rollD20` gets the decision for free: attack rolls
 * (attackOnce: Basic Attack, attack skills and later Mark, every Burst target
 * and counterattacks) and saves (giveSkillStatuses). Damage dice and Bleed
 * use `rollDice` directly and are never offered.
 */
import type { Side } from '@mt/shared'
import type { Action, ApplyResult, BattleEvent } from './battle.ts'
import { rollDice } from './dice.ts'
import type { BattleState, InspirationAnswer, RerollableRoll } from './state.ts'

/** Something an action's resolution yields: an event that happened, or a decision to wait for. */
export type ResolutionStep =
  | { readonly kind: 'event'; readonly event: BattleEvent }
  /** `side` may reroll `roll` with Inspiration; `state` is the Battle so far. */
  | { readonly kind: 'decision'; readonly state: BattleState; readonly side: Side; readonly roll: RerollableRoll }

/** The resolution of an action (or part of one) that returns `T`. */
export type Resolution<T> = Generator<ResolutionStep, T, InspirationAnswer>

/** Yield events in order. */
export function* emit(...events: BattleEvent[]): Resolution<void> {
  for (const event of events) yield { kind: 'event', event }
}

/**
 * `side` has just seen `roll`, one of its own d20s. If it still has its
 * Inspiration it may use it now, before any other die (rules §18, D-10),
 * whether the roll succeeded or not: `inspirationOffered`, then the answer
 * (`inspirationUsed`, which spends it, or `inspirationDeclined`). The caller
 * rolls again when `used`.
 */
export function* offerInspiration(
  state: BattleState,
  side: Side,
  roll: RerollableRoll,
): Resolution<{ state: BattleState; used: boolean }> {
  if (!state.inspiration[side]) return { state, used: false }
  yield* emit({ type: 'inspirationOffered', side, roll })
  const answer = yield { kind: 'decision', state, side, roll }
  if (answer !== 'use') {
    yield* emit({ type: 'inspirationDeclined', side })
    return { state, used: false }
  }
  yield* emit({ type: 'inspirationUsed', side })
  return { state: { ...state, inspiration: { ...state.inspiration, [side]: false } }, used: true }
}

type RollEvent = Extract<RerollableRoll, { type: 'attackRolled' | 'saveRolled' }>

/**
 * A d20 roll of `side` that Inspiration may reroll (rules §18, §21.4): roll
 * `count` d20s (2 with advantage or disadvantage, first then second), yield
 * the event `show` makes of them, offer Inspiration, and on use roll all
 * `count` again under the same roll mode; the new result stands (its event
 * has `rerolled: true`). Returns the event of the roll that counts.
 */
export function* rollD20<E extends RollEvent>(
  before: BattleState,
  side: Side,
  count: number,
  show: (rolls: readonly number[]) => E,
): Resolution<{ state: BattleState; roll: E }> {
  const first = rollDice(before.dice, count, 20)
  const roll = show(first.rolls)
  yield* emit(roll)
  const offer = yield* offerInspiration({ ...before, dice: first.stream }, side, roll)
  if (!offer.used) return { state: offer.state, roll }
  const again = rollDice(offer.state.dice, count, 20)
  const reroll: E = { ...show(again.rolls), rerolled: true }
  yield* emit(reroll)
  return { state: { ...offer.state, dice: again.stream }, roll: reroll }
}

/**
 * Drive the resolution of `action` from `start` (the state before it):
 * collect its events, answer its decisions with `answers` in order, and stop
 * at the first decision without an answer (a pending Inspiration decision).
 * The first `emitted` events were already returned by an earlier call and
 * are left out.
 */
export function runResolution(
  start: BattleState,
  action: Action,
  resolution: Resolution<BattleState>,
  answers: readonly InspirationAnswer[] = [],
  emitted = 0,
): Extract<ApplyResult, { ok: true }> {
  const events: BattleEvent[] = []
  let answered = 0
  let step = resolution.next()
  while (step.done !== true) {
    const value = step.value
    if (value.kind === 'event') {
      events.push(value.event)
      step = resolution.next()
      continue
    }
    const answer = answers[answered]
    if (answer === undefined) {
      return {
        ok: true,
        state: {
          ...value.state,
          pending: {
            kind: 'inspiration',
            side: value.side,
            roll: value.roll,
            resume: { state: start, action, answers, emitted: events.length },
          },
        },
        events: events.slice(emitted),
      }
    }
    answered++
    step = resolution.next(answer)
  }
  return { ok: true, state: step.value, events: events.slice(emitted) }
}

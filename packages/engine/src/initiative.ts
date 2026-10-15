/**
 * Initiative (rules §17.2, dice order §21.4, D-09): rolled once after
 * deployment. Each side rolls d20 + the highest AGI mod in its team (Tamer
 * included), team A first. Higher total plays first; a tie rerolls both
 * (A then B) until the totals differ. That reroll is not Inspiration.
 *
 * Inspiration (rules §18, D-09): once the totals differ, the losing side may
 * reroll its own d20 (one new d20, drawn at once). If that turns the order
 * round, the side now losing may use its own Inspiration; a tie after a
 * reroll sends both sides back to rolling pairs. Each side has one
 * Inspiration, so this always ends.
 */
import type { Side } from '@mt/shared'
import { statMod } from './derived.ts'
import { rollDie } from './dice.ts'
import { emit, offerInspiration, type Resolution } from './resolution.ts'
import type { BattleState, Initiative, InitiativeRoll, UnitTemplate } from './state.ts'

/** The highest AGI mod among a side's Units, Tamer included. */
export function initiativeModifier(units: readonly UnitTemplate[], side: Side): number {
  const mods = units.filter((u) => u.side === side).map((u) => statMod(u.stats.agi))
  if (mods.length === 0) throw new Error(`Side ${side} has no Units`)
  return Math.max(...mods)
}

/**
 * Roll initiative: yields `initiativeRolled` for every pair (a pair after
 * Inspiration has `rerolled` set to the side that rolled again) and the
 * Inspiration decisions. Returns the rolls, the side that starts and the
 * state with the dice (and Inspiration) used.
 */
export function* rollInitiative(
  units: readonly UnitTemplate[],
  before: BattleState,
): Resolution<{ initiative: Initiative; state: BattleState }> {
  const roll = (d20: number, side: Side): InitiativeRoll => {
    const modifier = initiativeModifier(units, side)
    return { d20, modifier, total: d20 + modifier }
  }
  const rolls: Record<Side, InitiativeRoll>[] = []
  let state = before
  for (;;) {
    // Team A's d20 first, then team B's (rules §21.4).
    const a = rollDie(state.dice, 20)
    const b = rollDie(a.stream, 20)
    state = { ...state, dice: b.stream }
    let pair = { A: roll(a.value, 'A'), B: roll(b.value, 'B') }
    rolls.push(pair)
    let shown: InitiativeShown = { type: 'initiativeRolled', rolls: pair, tie: pair.A.total === pair.B.total }
    yield* emit(shown)
    while (pair.A.total !== pair.B.total) {
      const loser: Side = pair.A.total > pair.B.total ? 'B' : 'A'
      const offer = yield* offerInspiration(state, loser, shown)
      state = offer.state
      if (!offer.used) {
        return { initiative: { rolls, firstSide: loser === 'A' ? 'B' : 'A' }, state }
      }
      const again = rollDie(state.dice, 20)
      state = { ...state, dice: again.stream }
      pair = { ...pair, [loser]: roll(again.value, loser) }
      rolls.push(pair)
      shown = { type: 'initiativeRolled', rolls: pair, tie: pair.A.total === pair.B.total, rerolled: loser }
      yield* emit(shown)
    }
  }
}

type InitiativeShown = {
  readonly type: 'initiativeRolled'
  readonly rolls: Readonly<Record<Side, InitiativeRoll>>
  readonly tie: boolean
  readonly rerolled?: Side
}

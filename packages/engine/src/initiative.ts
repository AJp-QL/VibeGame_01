/**
 * Initiative (rules §17.2, dice order §21.4, D-09): rolled once after
 * deployment. Each side rolls d20 + the highest AGI mod in its team (Tamer
 * included), team A first. Higher total plays first; a tie rerolls both
 * (A then B) until the totals differ. That reroll is not Inspiration.
 *
 * Each pair of rolls is kept separately so that Inspiration (ticket 12) can
 * later reroll one side's d20 of the deciding pair.
 */
import type { Side } from '@mt/shared'
import { statMod } from './derived.ts'
import { rollDie, type DiceStream } from './dice.ts'
import type { Initiative, InitiativeRoll, UnitTemplate } from './state.ts'

/** The highest AGI mod among a side's Units, Tamer included. */
export function initiativeModifier(units: readonly UnitTemplate[], side: Side): number {
  const mods = units.filter((u) => u.side === side).map((u) => statMod(u.stats.agi))
  if (mods.length === 0) throw new Error(`Side ${side} has no Units`)
  return Math.max(...mods)
}

/** Roll pairs until the totals differ. Returns the rolls, the side that starts and the advanced dice. */
export function rollInitiative(
  units: readonly UnitTemplate[],
  dice: DiceStream,
): { initiative: Initiative; dice: DiceStream } {
  const roll = (d20: number, side: Side): InitiativeRoll => {
    const modifier = initiativeModifier(units, side)
    return { d20, modifier, total: d20 + modifier }
  }
  const rolls: Record<Side, InitiativeRoll>[] = []
  let stream = dice
  for (;;) {
    // Team A's d20 first, then team B's (rules §21.4).
    const a = rollDie(stream, 20)
    const b = rollDie(a.stream, 20)
    stream = b.stream
    const pair = { A: roll(a.value, 'A'), B: roll(b.value, 'B') }
    rolls.push(pair)
    if (pair.A.total !== pair.B.total) {
      return { initiative: { rolls, firstSide: pair.A.total > pair.B.total ? 'A' : 'B' }, dice: stream }
    }
  }
}

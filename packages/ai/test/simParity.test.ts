import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compareDecision, describe as describeComparison } from './simParity/compare.ts'
import type { SimDecision } from './simParity/rebuild.ts'

// Decision parity with prototype/simulation/sim.py (ticket 15, for ticket 16):
// sim_decisions.json holds game states sim.py's AI saw (variant U4; S1 and S2;
// greedy, tamer_rush and neutral) and the plan it chose. Each state is rebuilt
// in the engine (with sim.py's stats and Tidewall's move 3, see rebuild.ts) and
// the sim-parity profile must choose the same plan: Unit, order, tile, action,
// target, Command and Hit and Run step. Regenerate with dump_sim_decisions.py.
const decisions = JSON.parse(
  readFileSync(new URL('./simParity/sim_decisions.json', import.meta.url), 'utf8'),
) as SimDecision[]

describe('sim-parity profiles choose what sim.py chose', () => {
  it('has decisions from every mode and both Scenarios', () => {
    expect(decisions.length).toBeGreaterThan(100)
    const kinds = new Set(decisions.map((d) => `${d.scenario}:${d.modes[d.side]}`))
    for (const k of ['S1:greedy', 'S2:greedy', 'S1:tamer_rush', 'S2:tamer_rush', 'S1:neutral']) expect(kinds).toContain(k)
  })

  it('every decision matches', () => {
    const mismatches = decisions
      .map((d) => compareDecision(d))
      .filter((c) => !(c.sameUnit && c.sameDest && c.sameAction && c.sameExtras))
      .map((c) => describeComparison(c))
    expect(mismatches).toEqual([])
  }, 60000)
})

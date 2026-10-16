# Ticket 18: Marked duration, simulator before/after

Rule change (rules §14.1, §23 D-03, decision log 2026-10-16): Marked 1 now counts down on the side that gave it (`applierTurns` duration). A Mark given during side X's Turn lasts for the rest of that Turn, the other side's Turn and X's next Turn, then ends at the end of that Turn. Before, it counted down on the holder's side, so it ended after the other side's Turn and only helped allies still to act in the Mark's own Turn.

Command, both runs: `corepack pnpm sim baseline --games 1000 --seed 0 --out <scratch>`. Real rules and data (not sim-equivalent). Both sides use the same AI profile. 1000 Battles per row.

- Before: engine 0.7.0, data hash `94d95e538e88f10e…`
- After: engine 0.8.0, data hash `3bf7b90a3ef204e8…`

| Config | Mark/Battle before | Mark/Battle after | A win before | A win after | 10-turn limit before | 10-turn limit after |
|---|---|---|---|---|---|---|
| S1 crossroads game:greedy | 0.003 | 0.003 | 76.3% | 76.3% | 26.2% | 26.2% |
| S1 crossroads sim:greedy | 0.001 | 0.001 | 78.4% | 78.4% | 25.8% | 25.8% |
| S1 shallows game:greedy | 0.000 | 0.000 | 68.0% | 68.0% | 17.3% | 17.3% |
| S1 shallows sim:greedy | 0.001 | 0.001 | 71.5% | 71.5% | 14.0% | 14.0% |
| S2 crossroads game:greedy | 0.000 | 0.000 | 78.8% | 78.8% | 8.5% | 8.5% |
| S2 crossroads sim:greedy | 0.000 | 0.000 | 87.5% | 87.5% | 12.9% | 12.9% |
| S2 shallows game:greedy | 0.000 | 0.000 | 63.4% | 63.4% | 7.9% | 7.9% |
| S2 shallows sim:greedy | 0.000 | 0.000 | 62.7% | 62.7% | 7.8% | 7.8% |

Every other metric in the baseline report is also unchanged.

## Why nothing moved

Both AI profiles value Mark only by what it is worth to allies **still to act in the same Turn** (packages/ai/src/planner.ts, `attackValue`, the port of sim.py `attack_val`). The new rule's benefit, advantage on the giver's next Turn, does not appear in that value. Mark scores about as low as before, so the AI still almost never uses it (≤ 0.003 per Battle). In the few Battles where it does, nothing after the Mark changes the outcome under these seeds.

So the rule change is in place and tested in the engine, but it has no measurable effect on simulator balance until the AI values Mark's next-Turn advantage. That is an AI change, out of scope here (ticket 18 is limited to the Marked duration). A follow-up could make the AI value the giver's next Turn and re-measure.

## Parity with sim v4

The quick parity smoke test in tools/simulator/test/simulator.test.ts (100 Battles per config, sim-equivalent data, within 4 SE of sim v4) still passes with the new Marked rule. Mark is almost never used, so the sim-equivalent layer needs no override to keep the old duration.

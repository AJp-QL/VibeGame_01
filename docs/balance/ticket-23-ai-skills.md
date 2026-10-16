# Ticket 23: AI skill use, simulator before/after

Change: new in-game heuristic `lookahead` (packages/ai/src/profiles.ts). It is 0.6 in `GAME_PROFILES` and 0 in `SIM_PROFILES`, so the sim-parity profiles behave exactly as before.

- **Mark:** counts advantage for every Unit of ours on our next Turn (Marked lasts until the end of the marking side's next Turn, rules §14, D-03), weighted by `lookahead`. Allies still to act this Turn count as before. The value includes the extra chance that one of those attacks drops the target.
- **Hex:** valued by how much less the enemy's threat costs (sim.py `pen`) on the Unit of ours it endangers most. The threat is recomputed from the engine's numbers with Weakened's damage change. The damage it no longer does counts in full, because it still makes that attack. A counterattack it no longer lands as hard is added. The total counts over the Turns Weakened lasts (second Turn × `lookahead`).
- **Pin:** valued by the threat the enemy can no longer bring by moving. A Pinned Unit with Blink still moves 2.
- **Camouflage:** the hiding tile's terrain penalty in the position value is no longer charged (terrain only changes rolls of attacks made from the tile; a Unit that hides makes none this Turn). Camouflage needs forest, and forest gives Quillfox (Water) disadvantage.
- **Blink:** unchanged. The planner already offers Blink tiles as destinations. Wispling flies and walks at least as far, so Blink only matters when it is Pinned (Blink is usable while Pinned, D-13).

## Method

`corepack pnpm sim run --scenario <s> --board <b> --a game:greedy --b game:greedy --games 2000 --seed 0 --format json`. Real data, engine 0.8.0 (no engine change, no data change). Before = origin/main `df07284` in a separate worktree; after = this branch. 2,000 Battles per set.

## Skill use per Battle, A win rate, 10-turn limit

| Set | Run | Mark | Hex | Pin | Camouflage | Blink | A win | 10-turn limit |
|---|---|---|---|---|---|---|---|---|
| S1 Crossroads | before | 0.004 | 0.000 | 0.074 | 0.009 | 0.000 | 77.7% | 27.1% |
| S1 Crossroads | after | **0.419** | 0.048 | **0.467** | **0.382** | 0.000 | 74.0% | 27.5% |
| S1 Shallows | before | 0.000 | 0.000 | 0.124 | 0.000 | 0.000 | 67.2% | 16.7% |
| S1 Shallows | after | **0.227** | **0.153** | **0.586** | 0.001 | 0.000 | 66.4% | 17.7% |
| S2 Crossroads | before | 0.000 | 0.000 | 0.134 | 0.001 | 0.000 | 78.4% | 10.0% |
| S2 Crossroads | after | 0.014 | 0.031 | **0.691** | 0.001 | 0.001 | 77.4% | 11.4% |
| S2 Shallows | before | 0.000 | 0.000 | 0.323 | 0.000 | 0.000 | 63.6% | 7.9% |
| S2 Shallows | after | 0.023 | 0.033 | **0.934** | 0.000 | 0.004 | 60.7% | 9.5% |

Bold = above 0.1 per Battle.

## Acceptance

| Item | Result |
|---|---|
| Mark > 0.1 in ≥ 2 sets | met (S1 Crossroads, S1 Shallows) |
| Pin > 0.1 in ≥ 2 sets | met (all 4) |
| Hex > 0.1 in ≥ 2 sets | **not met** (only S1 Shallows; 0.03–0.05 elsewhere) |
| Camouflage > 0.1 in ≥ 2 sets | **not met** (only S1 Crossroads; ≤ 0.001 elsewhere) |
| SIM_PROFILES and parity tests unchanged | met (`simParity.test.ts` 107/107, simulator parity smoke passes; all new code is behind `lookahead > 0`) |
| Deterministic, ≤ 2× slower | met (see timing) |

Why Hex and Camouflage stay low:
- **Hex:** Element Bolt / Burst usually deal more expected damage than Weakened (−2 damage per hit for 2 Turns) prevents. This is worse in Scenario 2, where Wispling's Bolt is 1d8+6.
- **Camouflage:** Quillfox must give up its Action (Long Shot) and stand on forest. Forest gives it disadvantage, and Hidden only stops enemies 2+ tiles away. On Shallows, and in Scenario 2 where Long Shot is strong, that is rarely worth it.

Raising the values further to hit the 0.1 bar would make the AI pick these skills when they are worse. That is a balance question for ticket 19 (data), not for the AI.

## Timing

| Measure | Before | After | Ratio |
|---|---|---|---|
| `node packages/ai/test/bench.ts 200 scenario_1 greedy game` (back to back, idle machine) | 105.1 ms/Battle | 123.2 ms/Battle | 1.17× |
| same, scenario_2 | 104.3 ms/Battle | 132.2 ms/Battle | 1.27× |
| simulator runs above, S1 Crossroads / S1 Shallows / S2 Crossroads / S2 Shallows (s per 2,000; other work running alongside, noisy) | 261 / 243 / 256 / 221 | 316 / 242 / 270 / 270 | 0.99–1.22× |

## Tests

`packages/ai/test/lookahead.test.ts`:
- `SIM_PROFILES` have `lookahead` 0.
- In a constructed Scenario 1 state, the game profile Marks an enemy its side can follow up on next Turn, and the sim profile does not.
- Whole Battles with game profiles use Mark, Camouflage, Hex and Pin.

No constructed test for Hex, Pin, Camouflage or Blink alone: a search of 4,000 random first-Turn positions found no state where they were the best choice (see the ticket note).

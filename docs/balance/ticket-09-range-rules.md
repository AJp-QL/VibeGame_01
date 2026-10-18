# Ticket 09: range rules applied (phase 1.x)

User decision 2026-10-18 (decision log; D-31): all three of the ticket 08 variants together, **a+b+c**. This is the change the game now plays. Report of the options: `docs/balance/ticket-08-range-experiments.md`.

## What changed

| Part | Change | Where |
|---|---|---|
| a. Ranges (data) | Long Shot, Element Bolt, Pin 4 -> 3; Mark 5 -> 4 | `data/skills/*.json`, rules §15.1 |
| b. Long-range disadvantage (rule) | An attack roll from distance 4 or more has disadvantage (cancels advantage, rules §5.2); measured from the attacker to each target, so a Burst target on the edge of the 3x3 area can be at 4; saves are not attack rolls | `RangeRules.longRangeDisadvantageFrom`, `AttackPreview.longRangeDisadvantage`, rules §5.1 |
| c. Mountains block sight (rule + data) | A line of sight (rules §7.3) that passes through a mountain tile is blocked like one that passes a Unit (not the tiles of the shooter and the target; Flying shooters still see over everything). Four more mountain tiles on each Board, in pairs that look the same after a 180 turn: Crossroads c3, e3, c5, e5; Shallows d3, d5, b4, f4 | `RangeRules.sightBlockedBy`, `data/boards/*.json`, rules §7.2, §2.2 |

`ENGINE_VERSION` 0.10.0 -> 0.11.0. The rules are on in every Battle (`GAME_RANGE_RULES`); the simulator's sim-equivalent layer and the sim-v4 parity check play with `NO_RANGE_RULES`, the old ranges and plain Boards (so `docs/balance/sim-v4-parity.md` still compares like with like). The in-game AI reads legal actions and attack previews from the engine and so follows the rules; its preview cache knows the long-range class.

## Result (2,000 Battles per set, game:greedy both sides)

Numbers are the ticket 08 measurements of the baseline (the game before) and of abc (the game now), re-measured on the shipped data and rules: they are identical to the ticket 08 report, which shows the game plays exactly as the variant was measured. Reproduce: `corepack pnpm sim ranges --games 2000 --seed 0 --only baseline,abc`.

| Set | Run | A win | 10-turn limit | Turns before first attack | Attack rolls/Battle | Rounds |
|---|---|---|---|---|---|---|
| S1 crossroads | before | 51.2% ±1.1% | 12.6% | 0.32 | 17.0 | 6.5 |
| S1 crossroads | **now** | 50.8% ±1.1% | 11.2% | 0.44 | 16.8 | 6.3 |
| S1 shallows | before | 43.2% ±1.1% | 4.3% | 0.00 | 15.1 | 5.1 |
| S1 shallows | **now** | 53.9% ±1.1% | 6.6% | 0.00 | 16.1 | 5.5 |
| S2 crossroads | before | 57.1% ±1.1% | 2.6% | 0.00 | 16.0 | 5.0 |
| S2 crossroads | **now** | 59.4% ±1.1% | 4.5% | 0.20 | 18.2 | 5.8 |
| S2 shallows | before | 48.0% ±1.1% | 1.1% | 0.00 | 15.5 | 4.6 |
| S2 shallows | **now** | 56.4% ±1.1% | 3.4% | 0.00 | 16.3 | 5.2 |

## Acceptance

| Target | S1 Crossroads | S1 Shallows | S2 Crossroads | S2 Shallows |
|---|---|---|---|---|
| Team A wins 40-60% | yes | yes | yes | yes |
| 10-turn limit at most 15% | yes | yes | yes | yes |
| Turns before the first attack higher than before | 0.32 -> 0.44 (yes) | 0.000 -> 0.002 (4 Battles of 2,000: **no, in practice**) | 0.00 -> 0.20 (yes) | 0.000 -> 0.000 (**no**) |

**Two of the three targets are met in every set.** The third, "Turns before the first attack higher than before in every set", is met on Crossroads (S1 0.32 -> 0.44, S2 0.00 -> 0.20) and **not on Shallows**, where the first attack comes in the very first Turn before and after (S1 0.000 -> 0.002, four Battles in 2,000; S2 0.000 both). This was in the ticket 08 report: the four extra mountains on Shallows are not on the lines between the start zones, and shorter ranges plus disadvantage are not enough on a 7x7 Board. It is a known limit of the chosen combination, not a regression; the ticket's checkbox for it stays open.

Options for that gap (a user decision, not made here): more or better placed sight blockers on Shallows (a new simulator variant `c2`, measured like the others, then a data-only change), or leave Shallows and rely on the 9x9 Boards of tickets 14-16.

## Other effects worth knowing

- Burst is used more (1.91 -> 2.30 per Battle): with shorter single-target ranges the area skill is the way to reach, and a Burst target at 4 from the caster now rolls with disadvantage.
- Mountains are a terrain element: Wispling (mountain) gets the terrain advantage on them and other Monsters get disadvantage against it, on the four new tiles as on the old ones; this is part of what was measured.
- The AI is unchanged apart from the cache key; it does not yet plan to stand behind a mountain on purpose.

## Checks

- sim-v4 parity (`docs/balance/sim-v4-parity.md`) and the decision parity with sim.py (`packages/ai/test/simParity.test.ts`) pass under the sim-equivalent conditions (old ranges, plain Boards, no range rules).
- All rule tests of the engine and the session run on the kit as it was before this ticket (`fixtures.ts` / `kit.ts`); the new data and rules have their own tests (`packages/engine/test/rangeRules.test.ts`, `packages/ai/test/rangeRules.test.ts`, `tools/simulator/test/ranges.test.ts`).
- Visual fixtures are stale after the version bump (the CI visual job warns and stays green); ticket 10 (Codex) refreshes them and explains the new rules in the UI. Ticket 21 (Codex) fixes one web unit test that a new mountain makes fail; it must land before this PR is merged.

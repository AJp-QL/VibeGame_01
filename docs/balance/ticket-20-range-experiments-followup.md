# Ticket 20 (P1X-20): distance metrics, long shots at 2-3 and the safe-tiles metric (phase 1.x)

Follow-up to `docs/balance/ticket-08-range-experiments.md` and `docs/balance/ticket-09-range-rules.md`. **Nothing in the real game changed**: `data/`, the rules and `ENGINE_VERSION` (0.11.0) are as ticket 09 left them. The variants exist only inside a simulator run. Full tables: `ticket-20-distance-experiments.md` / `.json` (same folder). Reproduce: `corepack pnpm sim distance --games 2000 --seed 0`.

## The question

After ticket 09 (ranges 3/3/3/4, disadvantage from distance 4, mountains block sight) the first attack still comes in the very first Turn on Shallows, because Move plus range covers the Board. Ticket 08's research noted that other tactics games use short ranges and small Boards, and that a diagonal that counts as 1 lets 7x7 be crossed fast. Two further levers, measured on the post-09 game as the baseline: **how distance is counted** and **how far the long shots reach**, plus a new metric that says whether position matters.

## What was measured

24 sets = 6 variants x Scenario 1/2 x Crossroads/Shallows, **2,000 Battles per set** (48,000 in all), `game:greedy` (the in-game AI) on both sides, base Dice Seed `0`.

| Id | Distance (Move and skill range) | Long Shot, Element Bolt, Pin | Mark |
|---|---|---|---|
| `cheb-r3` | Chebyshev, diagonal = 1 (**the game today = baseline**) | 3 | 4 |
| `orth-r3` | No diagonals: dx + dy; Move in 4 directions | 3 | 4 |
| `alt-r3` | Diagonals cost 1, then 2, then 1...: max + floor(min / 2) | 3 | 4 |
| `cheb-r2` | Chebyshev | 2 | 3 |
| `orth-r2` | No diagonals | 2 | 3 |
| `alt-r2` | Diagonals alternating | 2 | 3 |

Mark gets one more than the others in the range-2 sets (3), as it does in the game today (4 against 3). Every set also plays variants b and c of ticket 09 (disadvantage from distance 4, mountains block sight) because those are the game. The baseline reproduces the "now" rows of the ticket 09 report to the digit (A win 50.8 / 53.9 / 59.4 / 56.4 %).

**New metric, threatened / safe tiles** (`tools/simulator/src/threat.ts`, from *Threat zone* in `CONTEXT.md`): at the start of every Turn, how many of the 49 tiles could a Unit of the side about to play attack this Turn. Exact in the Move (the engine's own reachable tiles under the metric in play, Units blocking) and in the skill range (area skills: range + radius); it ignores line of sight, cooldowns and Hidden, so it is an upper bound on the threat. "Safe" = the other tiles. "Opening" = the first two Turn starts of a Battle.

## Result (mean of the four sets)

| Variant | Sets within targets | A win, range over sets | 10-turn limit, worst set | Turns before first attack | Threatened tiles | Safe tiles | Threatened, opening | Rounds |
|---|---|---|---|---|---|---|---|---|
| `cheb-r3` (today) | 4 / 4 | 50.8-59.4% | 11.3% | 0.16 | 96.7% | 1.6 of 49 | 99.9% | 5.7 |
| `orth-r3` | 2 / 4 | 43.4-57.1% | **26.3%** | 0.65 | 86.6% | 6.5 | 86.4% | 7.4 |
| `alt-r3` | 3 / 4 | **35.5%**-52.4% | 6.6% | 0.25 | 97.0% | 1.5 | 98.6% | 5.4 |
| `cheb-r2` | 4 / 4 | 48.3-56.5% | 12.4% | 0.11 | 96.6% | 1.7 | 99.8% | 5.7 |
| `orth-r2` | 1 / 4 | 40.4-60.7% | **37.0%** | 0.62 | 84.6% | 7.5 | 81.8% | 7.6 |
| `alt-r2` | 4 / 4 | 42.5-54.7% | 6.5% | 0.23 | 95.8% | 2.1 | 96.7% | 5.3 |

Targets (spec user story 41): team A wins 40-60%, 10-turn limit at most 15%, in every set. Standard error per set: about 1.1 points on a win share, 0.01-0.04 Turns on the first-attack mean.

## Reading

1. **Today's game has almost no safe tile.** At the start of a Turn the side to play threatens 96.7% of the Board (1.6 safe tiles of 49), and 99.9% at the opening: where a Unit stands barely changes whether it can be attacked. That is the number behind "there is no approach phase".
2. **Shorter long shots do nothing.** `cheb-r2` against `cheb-r3`: first attack 0.11 against 0.16, safe tiles 1.7 against 1.6, all within noise. Reach is carried by Move (Fangrel 4 + Basic Attack 1 = 5; Quillfox 4 + 3 = 7), not by the long shots; taking a tile off the long shots changes which skill is used (Long Shot 2.78 -> 2.45 a Battle, Basic Attack 1.12 -> 1.42), not where the fighting is.
3. **Diagonals alternating 1/2 is a small effect.** `alt-r3`: first attack 0.25 (+0.09), safe tiles unchanged (1.5), threat 97.0%. It also pushes Scenario 1 on Shallows to 35.5% for team A (outside the target), with Counter used half as often (2.43 -> 1.25 a Battle; not investigated). `alt-r2` is the only changed variant that meets all targets in all four sets, and it moves the first attack by +0.07 and safe tiles by +0.5: not worth the cost of a rule players have to learn.
4. **No diagonals is the only lever that changes position.** `orth-r3`: safe tiles 1.6 -> 6.5 (13% of the Board), threat in the opening 99.9% -> 86.4%, first attack 0.16 -> 0.65 Turns, and in Scenario 1 on Crossroads 1.17. But Battles run a third longer (5.7 -> 7.4 Rounds) and **the 10-turn limit fails** in Scenario 1 (26.3% and 24.9% of Battles end at the limit). The slow Tidewall (Move 2) and Pin/Command (Move) become far stronger (Command (move) 0.57 -> 1.68 a Battle, Pin 0.64 -> 1.20); with shots at 2 it gets worse (`orth-r2`: 37.0% at the limit, 1 / 4 sets within targets). This is the right direction for "position matters" but would need Move, HP and the turn limit retuned together, and the AI was not tuned for it.
5. **None of the five variants gives an approach phase without breaking a balance target.**

## Why 7x7 cannot give an approach phase by range alone

The start zones are the two rows at each end (rows 1-2 and 6-7). A front-row Unit and the enemy's front row are 4 rows apart, a back-row Unit and the enemy's front row 5. **A Unit that moves M and reaches R, with M + R of at least 4 (at least 5 from the back row), can attack the enemy front row in the very first Turn**, if the path is open. On this roster that is every Unit: Fangrel 4 + 1, Wispling 4 + Element Bolt 3, Quillfox 4 + Long Shot 3, Tamer 3 + 1, and only the heavy Tidewall (2 + 1) cannot. Shorter shots remove nothing, because Move alone is 3-4. The ways out are the ones already on the table:

- **Terrain that blocks line of sight** (variant c): sound in principle and in the game, but the four tiles per Board sit off the lines between the start zones on Shallows; the open question of ticket 09 (Shallows first attack 0.00 -> 0.00).
- **A bigger Board, 9x9** (tickets 14-16): Move 4 + reach 3 no longer spans the start zones, so an approach phase appears without touching rules or data. Ticket 15 (in progress in parallel) measures the 9x9 Boards.
- Fewer Move: lower Move values of the Monsters, or a counting rule that spends Move (no diagonals is the extreme case, and the 10-turn limit then has to grow).

## What the variants drag along (read before trusting the numbers)

The distance switch is global inside a run, so everything that asks "how far" follows it, not only Move and the skills: Burst's 3x3 area becomes a plus-shape under no diagonals; melee, Counter, Hidden ("from distance 1") and Taunt ("nearest") lose their diagonal neighbours; Command's range 3 shrinks; line of sight is independent of the metric. Push (Shield Bash) uses direction signs, so a diagonal push still happens under no diagonals, which is inconsistent in that variant. The AI follows the engine's legal actions, but its quick pruning (`distance(origin, enemy) > Move + range`) assumes the triangle inequality, which diagonals alternating 1/2 do not obey (two diagonals cost 3, one step plus one step 2), so `alt-*` can skip a reach the exact path would allow: a small bias against `alt-*`. The threat metric does not use that shortcut. Two helper generators of the AI (Hit and Run's step, Attune's neighbours) now keep to tiles at distance 1 under the metric; under Chebyshev nothing changes (all 8 neighbours are at 1).

## Recommendation

**Keep the game as it is (ticket 09's a+b+c, Chebyshev, ranges 3/3/3/4); do not adopt a distance variant or shots of 2.** Shorter shots are a no-op, alternating diagonals is a small effect with a new rule to learn and one set outside the win target, and no diagonals changes position but breaks the 10-turn limit and calls for a rebalance of Move, HP and the limit that belongs to its own ticket and its own decision. Spend the next effort on the 9x9 Boards (tickets 14-16), where Move plus reach no longer covers the Board, and, if 7x7 stays, on better placed sight blockers on Shallows. If the user wants position to matter on 7x7 anyway, no-diagonals is the one candidate worth a follow-up (retune Move and the limit, check the Burst shape and diagonal pushes); then the follow-up tickets are one `Owner: claude` ticket for the rules and a `Owner: codex` ticket to refresh the visual fixtures and the UI's range display.

**This is a user decision.** No change to the real game is made or started here.

## What changed in the code (additive; the game plays as before)

- Engine: `DistanceMetric` is a field of the Battle's `RangeRules` (`distanceMetric`, absent = Chebyshev), carried in the state: no hidden or module-level state. `distance(a, b, metric?)` stays pure; `distanceIn(state, a, b)` and `reachableTiles` are exported, and every engine and AI distance call reads the Battle's metric. No `ENGINE_VERSION` bump: the same data, Dice Seed and actions give the same result (the 2,000-Battle tables were regenerated after this refactor and are byte-identical; `check-replays` exit 0). Documented in `packages/engine/README.md`.
- `packages/ai/src/planner.ts`: two neighbour loops also require distance 1 (no change under Chebyshev).
- `tools/simulator`: `sim distance` (`distanceExperiment.ts`, `distanceWorker.ts`), the metric (`threat.ts`), `Matchup.onTurnStart`. `SIM_PROFILES` and the sim-v4 parity check are untouched (they never set a metric).
- Tests: `packages/engine/test/distanceMetric.test.ts`, `tools/simulator/test/distance.test.ts`.

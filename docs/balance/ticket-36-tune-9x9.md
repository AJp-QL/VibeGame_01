# Ticket 36: tuning the 9x9 Boards and the AI's approach (phase 1.x)

Tables: `docs/balance/ticket-36-board-9x9.md` (`.json`), made by `corepack pnpm sim boards --games 2000 --seed 0` (engine 0.12.0, data unchanged, game AI `game:greedy` on both sides, 2,000 Battles per set). Baseline: `ticket-15-board-9x9.md`, `ticket-15-findings.md`. Targets: team A win 40-60%, 10-turn limit at most 15%, in every set.

**Verdict (updated 2026-10-20): the user chose option 3 below: 9x9 is accepted as a slower mode with relaxed targets (team A win 38-62%, Turn limit at most 25%; 7x7 keeps 40-60% / 15%). Against the relaxed targets 4 of 4 sets on 9x9 pass and 7x7 stays 4 of 4. Against the original targets 9x9 passes 1 of 4 (was 0 of 4). No game rule, no data, and not `ENGINE_VERSION` (0.12.0) changed.**

| 9x9 set | A win (38-62%) | 10-turn limit (at most 25%) | Within relaxed targets |
|---|---|---|---|
| S1 grand_crossroads | 40.8% | 22.5% | yes |
| S1 wide_shallows | 39.95% | 11.8% | yes |
| S2 grand_crossroads | 62.0% (0.620) | 11.8% | yes (at the edge) |
| S2 wide_shallows | 50.2% | 6.0% | yes |

## What was done

1. **Data only: fewer mountains on `grand_crossroads`.** Measured, then reverted. Taking out the two corner mountains (b2, h8; 8 → 6) moved nothing (S1 grand: A 43.4%, limit 31.4%, first attack 4.12 Turns; before 43.2% / 32.2% / 4.12), and taking out four (8 → 4) with the AI change moved nothing either (1,000 Battles: S1 39.6% / 23.3%, S2 61.7% / 11.7%, against 40.6% / 21.8% and 61.4% / 10.3% with all 8). The Board data is therefore unchanged: no `dataHash` change, no stale visual fixtures, no refresh ticket needed.
2. **AI approach** (`heuristics.approach`, in-game profiles only, `0` in `SIM_PROFILES`). A Monster with at least half of its maximum HP that can attack nothing this Turn from any tile it can reach, and is outside its own Threat reach (`threatReach`: Move range plus longest attack reach, the same number as the Threat zone overlay) of every enemy, walks to the reachable tile nearest an enemy (ties: the better position value). Once an enemy is within its own Threat reach, or when any attack is possible, or when Taunted, the old plan decides. Tamers are not moved by it. No rule was touched, `ENGINE_VERSION` stays 0.12.0. Tests: `packages/ai/test/approach.test.ts`. sim-v4 parity is unchanged (`SIM_PROFILES` have `approach: 0`; parity tests green).

Why it works: the old plan prices a tile by the damage the enemy could do there next Turn, so both sides stopped one step outside each other's reach and waited. The approach makes the side that has nothing to shoot step into reach; the first attack comes about 2 Turns sooner on Grand Crossroads (4.12 → 1.90) and 0.7 sooner on Wide Shallows (1.67 → 0.96).

## Numbers: ticket 15 against ticket 36 (2,000 Battles per set, seed 0)

| Set | Size | A win, t15 → t36 | 10-turn limit, t15 → t36 | Turns before first attack, t15 → t36 | Within targets, t15 → t36 |
|---|---|---|---|---|---|
| S1 crossroads | 7x7 | 50.8% → 50.9% | 11.3% → 10.1% | 0.44 → 0.44 | yes → yes |
| S1 shallows | 7x7 | 53.9% → 53.8% | 6.6% → 6.5% | 0.00 → 0.00 | yes → yes |
| S2 crossroads | 7x7 | 59.4% → 59.5% | 4.5% → 4.7% | 0.20 → 0.20 | yes → yes |
| S2 shallows | 7x7 | 56.4% → 56.4% | 3.4% → 3.4% | 0.00 → 0.00 | yes → yes |
| S1 grand_crossroads | 9x9 | 43.2% → 40.8% | **32.2% → 22.5%** | 4.12 → 1.90 | no → **no** (limit) |
| S1 wide_shallows | 9x9 | 46.3% → **40.0%** | **16.5% → 11.8%** | 1.67 → 0.96 | no → **no** (A win 39.95%, 0.05 pp under) |
| S2 grand_crossroads | 9x9 | **79.5% → 62.0%** | **20.8% → 11.8%** | 0.51 → 0.51 | no → **no** (A win 2 pp over) |
| S2 wide_shallows | 9x9 | **64.9% → 50.2%** | 11.7% → 6.0% | 0.00 → 0.00 | no → **yes** |

7x7: all four sets stay within targets; the AI change moves them by at most 1.2 pp (S1 crossroads limit). 9x9 summary: A win 40.0-62.0%, limit at most 22.5%.

## What is left and why

- **S1 Grand Crossroads limit 22.5%.** First attacks now come early, but a Battle on a 9x9 often turns into a chase: a wounded Monster flees across the larger Board (blink, longer ways around) and the healthy one follows; 10 Turns run out before the kill. This is a chase, not a waiting problem, so approaching does not help further.
- **S1 Wide Shallows A win 39.95%.** The approaching side (A moves first, so it is usually A) gives up the first strike; Scenario 1 on 9x9 moves 5-7 pp toward B (46.3% → 40.0%). Inside noise of the line (±1.1 pp).
- **S2 Grand Crossroads A win 62.0%.** Scenario 2 on 7x7 already leans A (56-59%); on 9x9 it leans A a little more.

## Things tried (exploratory, 1,000 Battles per set, seed 0, same engine; not shipped)

| Variant | S1 grand A / limit | S1 wide A / limit | S2 grand A / limit | S2 wide A / limit |
|---|---|---|---|---|
| shipped (HP share 0.5, stop within own reach) | 40.6% / 21.8% | 38-40% / 11.8% | 61.4% / 10.3% | 50% / 6.0% |
| HP share 0.01 / 0.3 / 0.7 | 39-40% / 21-22% | 38% / 11% | 61.4% / 9.9% | 49.7% / 5.7% |
| 4 mountains on Grand Crossroads | 39.6% / 23.3% | n/a | 61.7% / 11.7% | n/a |
| approach without the "stop within own reach" rule (always close in) | 32.7% / 14.1% | 43.0% / 11.5% | 41.8% / 7.1% | 39.7% / 3.4% |
| same, but only from the side's 3rd own Turn | 37.6% / 16.3% | 38.0% / 11.2% | 59.0% / 9.5% | 48.7% / 5.2% |
| same, from the 5th own Turn | 38.4% / 17.8% | 38.1% / 11.2% | 59.9% / 7.9% | 49.4% / 5.3% |

The HP share and the mountains do not matter. "Always close in" brings every limit under 15% but pushes A win down to 33-43% in three sets (the side that walks into reach first loses the first strike), so it trades one miss for another; a late start (3rd or 5th Turn) sits between and misses in both. The shipped version was kept because it is the least invasive one that moved all four sets in the right direction.

## Options for the user (step 3; option 3 chosen 2026-10-20, none of the others applied)

1. **Turn limit by Board size** (rule, e.g. 10 → 14 on 9x9): removes the S1 Grand Crossroads limit miss (the Battles that run out are chases that would end), probably not the A-win edges. `ENGINE_VERSION` bump, data/rule change, `rules.md` update, refresh ticket for Codex.
2. **Start zones nearer on 9x9** (rule/data): the second row further forward; shortens the approach and the chase room. Same follow-ups as 1.
3. **Accept 9x9 as a slower mode and relax the targets for it** (user decision), e.g. limit up to 25% and A win 38-62% on 9x9. With the numbers above 4 of 4 sets pass; the AI work is already in.
4. **More AI work** (no rule): pursue a fleeing wounded Monster or finish it with a focused plan. Not tried: it widens the AI change beyond "approach" and needs its own ticket.

Chosen: 3. Recommendation was: 3 for now (the game plays reasonably: first attack by Turn ~2, 9x9 sets within 2 pp of the A-win line) and 1 if the user wants the limit column green.

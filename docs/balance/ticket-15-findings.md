# Ticket 15: Board 9x9 against 7x7, reading of the numbers (phase 1.x)

Numbers: `docs/balance/ticket-15-board-9x9.md` (2,000 Battles per set, game AI on both sides, the game as shipped: ranges 3/3/3/4, disadvantage from 4, mountains block sight). Reproduce: `corepack pnpm sim boards --games 2000 --seed 0`. The 7x7 rows equal `ticket-09-range-rules.md` (same data, same seed).

**Verdict: the two 9x9 Boards miss the targets (A win 40-60%, 10-turn limit at most 15%) in 4 of 4 sets.** No rule was changed to fix it (ticket 15 says: report options).

| Set | A win | 10-turn limit | Turns before first attack |
|---|---|---|---|
| S1 grand_crossroads | 43.2% | **32.2%** | 4.12 |
| S1 wide_shallows | 46.3% | **16.5%** | 1.67 |
| S2 grand_crossroads | **79.5%** | **20.8%** | 0.51 |
| S2 wide_shallows | **64.9%** | 11.7% | 0.00 |

## What the numbers say

- The Turn before the first attack grows on 9x9 (as the spec wants: position matters), but it grows too much on Grand Crossroads Scenario 1 (4.1 Turns, one Battle in three hits the limit). Not measured why; the first suspect is the AI waiting for a shot behind the mountains instead of approaching (option 4).
- Scenario 2 on 9x9 tilts to team A (79.5% / 64.9%). 7x7 already leans A in Scenario 2 (56-59%); the longer approach multiplies the first-move advantage. The 10-turn limit cuts the Battles the stronger side would have needed more Turns to finish.
- Wide Shallows is the closer of the two: only S1 limit (16.5%) and S2 A win (64.9%) are out.

## Options (not applied)

1. **Raise the Turn limit on 9x9** (data/rule, e.g. 10 -> 14 Turns): fixes the limit column, probably not the A-win skew. Needs a rules decision (limit per Board size).
2. **Move the start zones closer on 9x9** (2 back rows stay, but add a "front" start zone of rows 3 and 7, or deploy the 2nd row further forward): shortens the approach to about the 7x7 value.
3. **Fewer / different mountains on Grand Crossroads**: 8 mountains plus the 9-wide centre make the AI wait. Cheap data-only change; Wide Shallows (6 mountains) is already better.
4. **AI approach behaviour** (ticket P1X-20 area): the AI should close distance when it has no shot. Does not touch rules.
5. **Accept 9x9 as a slower, different mode** and relax the targets for it (user decision).

Recommended order: 3 (data only) then 4, then re-measure; use 1 or 2 only if the limit stays above 15%.

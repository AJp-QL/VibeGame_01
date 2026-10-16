# Ticket 19: team balance, simulator before/after

Data-only changes (no engine or AI code change; `ENGINE_VERSION` stays 0.8.0 because the engine is unchanged and data changes move the data hash, packages/engine/README.md). `SIM_PROFILES` unchanged; sim-v4 parity still passes (the sim-equivalent layer replaces every Unit's stats with sim.py v4's, so the stat changes do not reach it).

## Data changes

| File | Value | Before | After | Why |
|---|---|---|---|---|
| scenarios/scenario_1.json | Tidewall POW | 12 | 16 | Team B's damage: Shield Bash 2d6+1 → 2d6+3, counterattacks harder |
| scenarios/scenario_2.json | Tidewall POW | 20 | 26 | same; Shield Bash 2d6+5 → 2d6+8 |
| scenarios/scenario_1.json | Quillfox SEN / VIT | 14 / 10 | 16 / 14 | Quillfox fell first in ~45% of Battles; attack +3 → +4, Long Shot 1d8+2 → +3, HP 19 → 22, Pin DC 11 → 12 |
| scenarios/scenario_2.json | Quillfox SEN / VIT | 22 / 12 | 24 / 20 | attack +8 → +9, Long Shot 1d8+6 → +7, HP 29 → 36, Pin DC 16 → 17 |
| scenarios/scenario_1.json | Tamer SPI (both teams) | 12 | 8 | Stalls: First Aid was the most used action (~5–6 per Battle); heal 1d8+1 → 1d8−1, Ward 11 → 9, Distract DC 11 → 9 |
| scenarios/scenario_2.json | Tamer SPI (both teams) | 16 | 12 | heal 1d8+3 → 1d8+1, Ward 13 → 11, Distract DC 14 → 12 |
| statuses/weakened.json | damageDealt | −2 | −3 | Hex lost to Element Bolt/Burst in expected value; −3 makes it worth a Major |

Not changed: species, skills, Boards, elements, Star/Level (the sim-equivalent layer keys on species + Star).

## Method

`corepack pnpm sim run --scenario <s> --board <b> --a game:greedy --b game:greedy --games 2000 --seed 0` (engine 0.8.0). Before = ticket 23's "after" (docs/balance/ticket-23-ai-skills.md, same command on main). Iteration ran 400 Battles per set with the same seed scheme; the final data ran 2,000 per set (split into 4 chunks of 500 with base seeds j·0x9e3779b97f4a7c15, which gives exactly the Battles of `--seed 0 --games 2000`).

## Result (2,000 Battles per set, game:greedy both sides)

| Set | Run | A win | B win | 10-turn limit | Hex / Battle | Camouflage / Battle | Mark | Pin |
|---|---|---|---|---|---|---|---|---|
| S1 Crossroads | before | 74.0% | – | 27.5% | 0.048 | 0.382 | 0.419 | 0.467 |
| S1 Crossroads | after | **50.7%** | 49.1% | **11.3%** | **0.246** | 0.015 | 0.491 | 0.426 |
| S1 Shallows | before | 66.4% | – | 17.7% | 0.153 | 0.001 | 0.227 | 0.586 |
| S1 Shallows | after | **43.1%** | 56.9% | **4.3%** | **0.611** | 0.000 | 0.148 | 0.720 |
| S2 Crossroads | before | 77.4% | – | 11.4% | 0.031 | 0.001 | 0.014 | 0.691 |
| S2 Crossroads | after | **59.7%** | 40.4% | **2.4%** | **0.195** | 0.000 | 0.033 | 0.664 |
| S2 Shallows | before | 60.7% | – | 9.5% | 0.033 | 0.000 | 0.023 | 0.934 |
| S2 Shallows | after | **51.9%** | 48.0% | **1.1%** | **0.194** | 0.000 | 0.025 | 0.898 |

Mean rounds fell from 6.0–7.8 to 4.7–6.4. S2 Crossroads is at the edge of the band (59.7%, SE ±1.1).

## Acceptance

| Item | Result |
|---|---|
| A wins 40–60% in all 4 sets (2,000 Battles each) | **met** (43.1–59.7%) |
| Turn limit ≤ 15% in all 4 sets | **met** (1.1–11.3%) |
| Hex > 0.1 per Battle in ≥ 2 sets | **met** (all 4: 0.19–0.61) |
| Camouflage > 0.1 per Battle in ≥ 2 sets | **not met** (0.015 / 0 / 0 / 0; data alone cannot reach it, see below) |
| Changes are visible data, decision log rows | met (decision log 2026-10-16, ticket 19 rows) |
| Kit-table tests and rules §20 in step; sim-v4 parity intact | met: rules §10.3, §14.2, §20.2, §21.2 updated; `derived.test.ts` checks the new §20.2 against data/; engine rule tests use a fixture Scenario 1 with the old kit stats (so balance tuning no longer moves them); `simParity.test.ts` and the simulator parity smoke pass |
| New balance report and baseline update | this file; docs/balance/phase-1-baseline.md regenerated |

## Iteration (400 Battles per set; A win % / turn limit %)

| Variant | S1 Cross | S1 Shal | S2 Cross | S2 Shal |
|---|---|---|---|---|
| data before (main) | 70.8 / 26.5 | 66.5 / 17.0 | 76.5 / 11.8 | 61.8 / 8.3 |
| Tidewall POW +4 | 59.0 / 24.3 | 60.3 / 15.8 | 69.3 / 11.3 | 57.5 / 8.0 |
| Quillfox VIT +4 | 65.8 / 26.0 | 60.5 / 15.8 | 75.8 / 13.3 | 62.0 / 6.8 |
| Quillfox SEN +2 | 69.8 / 22.3 | 63.5 / 12.3 | 81.0 / 11.3 | 53.0 / 7.2 |
| Quillfox SPI +4 | 73.8 / 27.5 | 65.5 / 19.3 | 69.5 / 7.5 | 59.0 / 6.3 |
| Tamer SPI −4 (both) | 69.8 / 15.3 | 68.0 / 8.8 | 80.3 / 3.3 | 68.8 / 2.0 |
| Tamer AGI −2 (both) | 73.5 / 22.0 | 69.0 / 16.5 | 75.3 / 8.0 | 62.3 / 5.8 |
| Tidewall VIT −4 | 76.3 / 24.0 | 68.3 / 14.2 | 79.5 / 9.3 | 64.8 / 4.8 |
| Wispling INT −2 | 75.3 / 34.5 | 58.8 / 23.3 | 83.3 / 20.3 | 55.0 / 7.8 |
| Weakened −3 | 69.3 / 28.0 | 66.0 / 18.0 | 78.5 / 14.0 | 63.0 / 8.8 |
| Weakened 3 Turns | 70.0 / 27.5 | 66.3 / 18.0 | 78.3 / 12.8 | 62.3 / 8.5 |
| final (all of the above table's "Data changes") | 51.5 / 11.8 | 45.0 / 4.0 | 59.8 / 3.0 | 56.5 / 1.8 |

Weakened −3 alone raised Hex to 0.16 / 0.41 / 0.17 / 0.23 per Battle; Weakened for 3 Turns did about the same in S1 and less in S2.

## Camouflage: data alone does not reach the target

Camouflage use per Battle (400 per set), with the final balance data:

| Variant | S1 Cross | S1 Shal | S2 Cross | S2 Shal |
|---|---|---|---|---|
| Camouflage on forest (as shipped) | 0.010 | 0.000 | 0.000 | 0.000 |
| Shallows with 2 more central forests (b4, f4) | 0.010 | 0.000 | 0.000 | 0.000 |
| Camouflage on water (D-18 change) | 0.323 | 0.013 | 0.000 | 0.000 |
| Camouflage on normal tiles | 0.085 | 0.022 | 0.000 | 0.000 |
| Camouflage on any tile (no terrain rule) | 0.375 | 0.022 | 0.000 | 0.000 |

Even with no terrain requirement at all, Camouflage reaches 0.1 in only one set. The terrain is not what holds it back: Camouflage costs Quillfox its Action (Long Shot, which is strong in Scenario 2), and Hidden only stops enemies 2+ tiles away. The Tamer SPI change, which the turn-limit target needs, also lowered S1 Crossroads use (0.41 → 0.015 alone with Tamer SPI −4); the AI hides when Quillfox is in danger, and shorter Battles with less healing change those positions. Rule-change options (need a rules decision, not done here):

1. **Camouflage does not use the Action** (a Minor that can be used alongside Long Shot or Pin, or "hide at the end of the Turn on forest"). Removes the cost that keeps the AI from choosing it. Needs an engine change (Action economy, rules §13.1), so not simulated here.
2. **Camouflage on any terrain** (drop D-18's forest requirement). Simulated above as a data proxy: 0.375 / 0.022 / 0 / 0, one set. Not enough alone.
3. **Camouflage on water instead of forest** (Quillfox's own element, so the tile no longer gives it disadvantage). Simulated above: 0.323 / 0.013 / 0 / 0, one set. Keeps S1 Crossroads use that the tuning removed, but not a second set.

Recommendation: option 1 (with 2 or 3 if still short), as its own rules ticket; or accept Camouflage as a situational S1 skill and drop the > 0.1 bar for it.

## Tests changed

- `packages/engine/test/fixtures.ts`: `scenario1` = data/ Scenario 1 with the Prototype kit stats (old §20.2); `dataScenario1` = data as is; `kitGameData` for Replay tests. Rule tests no longer move when balance data changes.
- `derived.test.ts`: checks data/ (both Scenarios) against the new §20.2 values.
- Weakened −3: `wispling.test.ts` (3 tests), `tidewall.test.ts` (counterattack 3 less).
- `sessionTamer.test.ts` (First Aid preview 1d8−1: 0–7), `shared/test/gameData.test.ts` (S2 Tidewall POW 26), `simulator.test.ts` (sim-equivalent now overrides both Tamers and team B's Monsters in both Scenarios), `ai/test/lookahead.test.ts` (Camouflage counted over 200 Battles instead of 10).

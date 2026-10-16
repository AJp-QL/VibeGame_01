# Ticket 27: Camouflage uses no Action

Rules change (user decision 2026-10-16, option A of docs/balance/ticket-19-team-balance.md; rules §15.1, §17.4, D-28): Camouflage is a free skill. It uses neither the Move nor the Action, at most once per activation, at any point of it, while the Unit stands on forest. Everything else about Camouflage and Hidden is unchanged (forest only; Hidden ends on any attack roll by the Unit, on a non-forest tile, and is checked at the end of every Turn). So Quillfox can Long Shot, Pin or Mark and then hide in the same activation.

Engine 0.9.0. Measured with `corepack pnpm sim run --scenario <s> --board <b> --a game:greedy --b game:greedy --games 2000 --seed 0` (tools/simulator), 2,000 Battles per set, both sides the in-game AI (GAME_PROFILES). The in-game AI now plans "act, then hide": a free hiding skill is valued at the end of the activation (threat removed until our next Turn), see `freeHide` in packages/ai/src/planner.ts.

## Result (2,000 Battles per set, game:greedy both sides)

| Set | Run | A win | B win | 10-turn limit | Rounds | Hex / Battle | Camouflage / Battle | Mark | Pin |
|---|---|---|---|---|---|---|---|---|---|
| S1 Crossroads | before (ticket 19) | 50.7% | 49.1% | 11.3% | – | 0.246 | 0.015 | 0.491 | 0.426 |
| S1 Crossroads | rule only | 51.3% | 48.6% | 12.6% | 6.47 | 0.234 | **0.508** | 0.375 | 0.391 |
| S1 Crossroads | **final** | **51.3%** | 48.6% | **12.6%** | 6.47 | **0.234** | **0.508** | 0.375 | 0.391 |
| S1 Shallows | before (ticket 19) | 43.1% | 56.9% | 4.3% | – | 0.611 | 0.000 | 0.148 | 0.720 |
| S1 Shallows | rule only | 43.2% | 56.8% | 4.4% | 5.11 | 0.610 | 0.018 | 0.150 | 0.721 |
| S1 Shallows | **final** | **43.2%** | 56.8% | **4.4%** | 5.11 | **0.610** | 0.018 | 0.150 | 0.721 |
| S2 Crossroads | before (ticket 19) | 59.7% | 40.4% | 2.4% | – | 0.195 | 0.000 | 0.033 | 0.664 |
| S2 Crossroads | rule only | 61.5% | 38.6% | 2.5% | 4.99 | 0.188 | **0.401** | 0.031 | 0.691 |
| S2 Crossroads | **final** | **57.2%** | 42.9% | **2.6%** | 5.01 | **0.194** | **0.419** | 0.040 | 0.683 |
| S2 Shallows | before (ticket 19) | 51.9% | 48.0% | 1.1% | – | 0.194 | 0.000 | 0.025 | 0.898 |
| S2 Shallows | rule only | 52.2% | 47.9% | 1.3% | 4.65 | 0.192 | 0.033 | 0.025 | 0.898 |
| S2 Shallows | **final** | **48.0%** | 52.0% | **1.1%** | 4.60 | **0.206** | 0.029 | 0.040 | 0.866 |

SE of A win ±1.1 pp per set. Draws make up the rest.

- **Camouflage** goes from 0.015 / 0 / 0 / 0 to 0.51 / 0.02 / 0.42 / 0.03 per Battle: above 0.1 in both Crossroads sets. On Shallows Quillfox's start zone has little forest within reach, so it stays rare there (ticket 19 showed even two extra central forests did not change that while Camouflage cost the Action; not re-tested).
- **Rule only** pushed S2 Crossroads to 61.5% A (outside 40–60). Data change: Scenario 2 Tidewall POW 26 → 28 (Shield Bash 2d6+8 → 2d6+9; decision log 2026-10-16, ticket 27). S2 Crossroads 61.5 → 57.2%, S2 Shallows 52.2 → 48.0%. Scenario 1 data is unchanged, so its rows are identical to rule only.
- Nothing else moved much: Hex, Mark and Pin per Battle are within noise of ticket 19.

## Acceptance (ticket 19 targets, re-checked)

| Item | Result |
|---|---|
| A wins 40–60% in all 4 sets | **met** (43.2 / 51.3 / 57.2 / 48.0%) |
| Turn limit ≤ 15% in all 4 sets | **met** (1.1–12.6%) |
| Hex > 0.1 per Battle in ≥ 2 sets | **met** (all 4: 0.19–0.61) |
| Camouflage > 0.1 per Battle in ≥ 2 sets | **met** (S1 Crossroads 0.51, S2 Crossroads 0.42) |

## Sim v4 parity

sim.py uses Camouflage as the Action. The sim-equivalent layer (tools/simulator/src/data.ts `simEquivalentData`, and the decision rebuild in packages/ai/test/simParity/rebuild.ts) drops `effects.free` so Camouflage is the Action again there, next to the stat and Tidewall-move overrides it already makes. SIM_PROFILES are unchanged; `simParity.test.ts` (every sim.py decision) and the simulator parity smoke pass.

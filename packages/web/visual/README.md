# Board screenshot fixtures

This suite is separate from Vitest. Its files end in `.visual.ts`, not `.test.ts`
or `.spec.ts`. The production Vite build has no visual entry point.

## Reproduce

From the repository root, with Node 24 and pnpm 12.11.2:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @mt/web exec playwright install --with-deps chromium
corepack pnpm --filter @mt/web test:visual
```

Playwright is pinned to **1.62.1**, whose Linux Chromium is **151.0.7922.34**
(build **1234**). Use this same install command for local baselines and ticket
26's Ubuntu CI job. Do not use an unrelated system Chromium to update baselines.
The two test-only Fontsource packages pin the bold Latin/Thai fonts; they avoid
host font fallback changing Counter's label and damage numbers. The optional
`BoardLabels.fontFamily` leaves production's default monospace stack unchanged.

The dev server starts on port 4178 and stops with the suite. It loads the real
Board renderer, bundled game data, and committed Replay JSON via `openReplay`
and `createReplayPlayer`. A replay version/data mismatch fails before capture.

Animations mount at the step before their event, then advance exactly one Replay
step. The harness stops Phaser's RAF loop, fixes the tween wall clock, and runs
`game.step` in 10 ms increments. No engine state, events, or rendered view objects
are manufactured. Burst's targeting overlay comes from `createBattleSession`
with normal selection, skill, and tap inputs on the replay's state. Static cases
mount the final replay state without animating earlier actions.

The screenshot is the 224×224 Board at integer zoom 3 (672×672 device pixels).
A threshold of 0.1 and maximum 8 differing pixels allow slight antialiasing,
while a changed 5×5 status icon or tile colour fails.

## Cases

| Capture | Replay | Frame / expected visual |
| --- | --- | --- |
| burst-order | burst | 3×3 area, target 1 on B.m2 and target 2 on B.m1 |
| blink-fade-out | blink | 80 ms, translucent caster at origin |
| blink-fade-in | blink | 230 ms, translucent caster at destination |
| blink-landed | blink | 350 ms, caster fully visible at destination |
| push-slide | push | 90 ms into the push event, Unit between tiles |
| push-landed | push | 250 ms, Unit at pushed destination |
| counter-label | counter | 500 ms, Thai Counter label and counter lunge |
| bleed-float | bleed | 100 ms, floating tick damage and Bleed drop |
| attune | attune | water tile, white frame and 3 Turns left |
| command-cover | command-cover | unspent Command flag and Cover umbrella together |
| guarded | guarded | blue shield |
| rallied | rallied | orange up arrow on adjacent allies |
| pin | pin | grey cross |
| marked | marked | red crosshair |
| hidden | hidden | green leaf on the forest Unit |
| countering | countering | positive fallback dot |
| weakened | weakened | negative fallback dot |
| off-balance | off-balance | negative fallback dot |
| taunted | taunted | negative fallback dot |

All fixtures use the Replay format's supported `preset` placements, the actual
scenario/board data and a fixed Dice Seed. Every recorded action is checked by
`openReplay`; pending Inspiration is answered through recorded decline actions.
Regenerate explicitly after inspecting engine/data changes, then review the JSON
diff and every resulting image:

```sh
corepack pnpm --filter @mt/web visual:fixtures
corepack pnpm --filter @mt/web test:visual:update
corepack pnpm --filter @mt/web test:visual --repeat-each=3
```

Baseline updates require Linux, and fail if `VISUAL_CHROMIUM` is set. Missing
baselines fail normal runs; they are never accepted automatically.

## Ticket 26 CI handoff

After Node/pnpm setup and frozen installation, run:

```sh
pnpm --filter @mt/web exec playwright install --with-deps chromium
pnpm --filter @mt/web test:visual
```

On failure upload **both** `packages/web/.cache/visual-results/` (actual/expected/diff
PNGs, traces, failure screenshots) and `packages/web/.cache/visual-report/` (HTML
report with a Board attachment for every test). Open a trace with
`pnpm --filter @mt/web exec playwright show-trace <trace.zip>`.
Do not add the visual suite to root `pnpm test`. CI configuration is Claude-owned
and belongs to ticket 26.

## Current validation status

The implementation has 19 passing Linux browser smoke cases on the available
system Chromium 154.0.8037.57. These are **not pinned baseline verification**. Temporary system-browser references
passed three consecutive comparisons (57/57). A temporary blue-to-magenta Guarded
icon change failed with 171 differing pixels, and the restored colour passed.
Those temporary references were removed rather than committed. Captures
were inspected: Burst area/order, Blink fading/landing, push sliding/landing,
Counter's Thai label, Bleed numbers, Attune's frame/count, Command/Cover, and all
status glyphs are visible. No renderer defect was found in these smoke captures.

The environment rejects `https://cdn.playwright.dev` with HTTP 403 "Domain
forbidden", so pinned Chromium installation, committed baselines, three repeated
baseline comparisons, and the deliberate-colour-change failure check remain
pending. Allow `cdn.playwright.dev` and its browser-download redirect destination
`storage.googleapis.com` in the environment and apply the configuration, then run
the commands above. No system-browser captures have been committed as baselines.

A local smoke check (no comparisons or baseline writes) is available while waiting:

```sh
VISUAL_CHROMIUM=/usr/bin/chromium pnpm --filter @mt/web test:visual --ignore-snapshots
```

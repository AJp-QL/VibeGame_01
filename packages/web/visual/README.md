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
The launch flag `--disable-lcd-text` disables LCD subpixel text antialiasing so
text captures use consistent grayscale edges on Linux. Keep it for both baseline
updates and comparisons, together with the pinned Chromium and fonts.
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

## Pinned baseline verification

The browser download blocker is resolved. All 19 committed baselines were made
on Linux with Playwright 1.62.1's Chromium 151.0.7922.34 (build 1234), using the
locked Latin/Thai fonts. Each frame was inspected; no visual defect was found.
Three consecutive comparisons passed (57/57). Changing Guarded's blue icon
colour to magenta failed with 171 differing pixels; restoring it passed again.

See [the evidence index](../../../.scratch/phase-1-battle-slice/evidence/25-visual-regression/README.md)
for every capture.

For a fresh cloud environment, include the frozen dependency install and browser
installation in its install script:

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @mt/web exec playwright install --with-deps chromium
```

Allow `cdn.playwright.dev` and `storage.googleapis.com` for the pinned browser
download. Keep the downloaded browser available to later test commands (use the
same `PLAYWRIGHT_BROWSERS_PATH` if configuring a custom cache).

A local system-browser smoke check remains available without comparisons or
baseline writes:

```sh
VISUAL_CHROMIUM=/usr/bin/chromium pnpm --filter @mt/web test:visual --ignore-snapshots
```


## Move preview page

`/move-preview.html` mounts the real Battle session, Board and Turn panel, with
`?side=B` for the blocked-target layout. `move-preview.visual.ts` covers three
viewport widths: **1280**, **360** and **375** px, height **900** px, device scale 1.
Desktop captures the whole **688 px** wide `main` element, with content-driven
height. Phones capture the full **360×900** or **375×900** viewport: the full Board
sits above the bottom sheet, whose action choices and confirmation footer stay
visible while informational details scroll. These differ from the fixed
672×672 Board-only captures. The same **0.1** threshold and maximum **8** differing
pixels apply; animations are disabled for static UI captures.

| Capture | Expected view |
| --- | --- |
| preview-move-1280 / preview-move-360 / preview-move-375 | Move preview, reachable tiles, translucent Unit and confirmation panel |
| preview-blink-1280 / preview-blink-360 / preview-blink-375 | Blink destination preview and Blink confirmation |
| preview-blocked-1280 / preview-blocked-360 / preview-blocked-375 | Team B preview with a blocked target and its line-of-sight reason |

Each case changes destinations, then taps the original Unit to cancel. It checks
that the panel and preview disappear without changing the Battle, selection,
mode or available destinations, and compares the canvas with its pre-preview
image: the selected Unit and destination highlights must remain. The cancelled
Board is attached as `preview-cancelled-{mode}-{width}`. It then previews again
and confirms through the real controls. This exercises Move, Blink and Hotseat
team B at all three widths; no compatibility branch for pre-ticket-18 sessions remains.

## Actions from the shadow (P1X-40)

`preview-actions.visual.ts` uses the real `/action-plan.html` session at 1280,
360 and 375 px, with a 640 px viewport height. It captures `shadow-preview`,
`shadow-plan` and `actions-from-here` at each width. It checks that the complete
Board stays above the sheet, every choice button and the confirm footer stay on screen without scrolling, the document does not
scroll, an enemy tap creates a plan at the shadow without spending an action,
and Done clears selection without changing the Battle or its current activation.
The post-move capture waits for the renderer to finish moving, and includes attack odds read through an isolated session. Desktop also checks Unit cards and End Turn, including the existing warning confirmation.

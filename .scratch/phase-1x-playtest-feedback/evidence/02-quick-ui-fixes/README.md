# Phase 1.x ticket 02 — UI and visual review

Linux; Node 24.19.0, pnpm 12.11.2, Playwright 1.62.1 and its pinned Chromium
151.0.7922.34 (build 1234). No `VISUAL_CHROMIUM` override.

## UI review

The real BattleScreen was mounted with a Scenario 1 Battle created through
`@mt/session` (Crossroads, A: a1/d4/g1, B: a7/d5/g7, Dice Seed
0123456789abcdef). Fangrel moved from d4 to d3, then Wispling was selected.
At both widths the browser check verified:

- Defend holds the command and shows the correct Unit names before state changes.
- Keyboard focus starts on “กลับไปเล่น Fangrel”; Escape closes the modal and
  selects Fangrel with its Action intact.
- End Turn lists Fangrel alongside the idle Units, and returning keeps the Turn.
- Confirming “เริ่ม Wispling” executes Defend and starts Wispling's activation.
- No browser errors.

Every screenshot below was inspected: readable text, no clipping, both choices
reachable at 360 px. The browser review caught and fixed focus initially landing
on the Start button rather than Return.

| State | Desktop (1280 px) | Mobile (360 px) |
| --- | --- | --- |
| Start confirmation | [image](dialog-1280.png) | [image](dialog-360.png) |
| End Turn warning | [image](end-turn-1280.png) | [image](end-turn-360.png) |

## Board review

Regenerated all 16 Replay fixtures with `visual:fixtures` for ENGINE_VERSION
0.10.0. The dataHash is unchanged. Removed declineInspiration actions only where
the new on-miss rule no longer offers them; all fixtures open successfully.
`test:visual:update` passed all 19 captures. Three PNGs changed: push-slide,
push-landed, counter-label. Without the former Inspiration pause, the hit and
its following push/counter events share a Replay step: the floating damage and
animation frames differ as expected. No art or renderer changes were made.

All 19 resulting PNGs were inspected at native resolution in labeled groups:

| Capture | Review |
| --- | --- |
| attune | Water tile, white frame, 3 Turns |
| bleed-float | Floating -2 and Bleed drop |
| blink-fade-in | Translucent caster at destination |
| blink-fade-out | Translucent caster at origin |
| blink-landed | Opaque caster at destination |
| burst-order | 3×3 area, target order 1 then 2 |
| command-cover | Command flag and Cover umbrella together |
| counter-label | Thai label and counter lunge readable |
| countering | Positive fallback dot |
| guarded | Blue shield |
| hidden | Green leaf on forest Unit |
| marked | Red crosshair |
| off-balance | Negative fallback dot |
| pin | Grey cross |
| push-landed | Unit at pushed destination; floating hit damage |
| push-slide | Unit between tiles |
| rallied | Orange arrows on adjacent allies |
| taunted | Negative fallback dot |
| weakened | Negative fallback dot |

Baselines: [all captures](../../../../packages/web/visual/baselines/).

The required `playwright install --with-deps chromium` was attempted; its root
step failed (`su: Authentication failure`). Installing the pinned browser with
`playwright install chromium` succeeded, and the preinstalled system libraries
ran every visual and UI check successfully.

## Validation

Frozen dependency install, typecheck, full test suite (813 passed, 1 intentional
skip), production build, path ownership (33 allowed files), and simulator
`check-replays` all passed. Three consecutive visual comparisons passed (57/57).
The initial sandbox test could not spawn git in the ownership suite; the full
run with process/network access passed.

[GitHub CI](https://github.com/AJp-QL/VibeGame_01/actions/runs/39042308791) passed
all three jobs, including actual Board comparisons with matching fixtures.
[PR #25](https://github.com/AJp-QL/VibeGame_01/pull/25) targets main.

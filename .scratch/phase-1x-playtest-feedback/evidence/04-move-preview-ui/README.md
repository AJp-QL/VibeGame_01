# Ticket 04 — Move preview review

Linux, Node 24.19.0, pnpm 12.11.2, Playwright 1.62.1, pinned Chromium
151.0.7922.34 (build 1234). No system browser override.

The screenshot harness mounts the real BattleView and TurnPanel around a real
`@mt/session` Battle (Scenario 1 / Crossroads, A: a1/c5/c6, B: g7/e5/c2).
It uses the production Move preview adapter and activation confirmation wrapper.
The test taps the actual canvas, changes destinations, checks that revision and
Replay actions have not changed, cancels by tapping the original Unit, and then
confirms through the real Move/Blink button. It checks both Hotseat sides, line
of sight, browser errors, and absence of horizontal scrolling.

Every new image was inspected. The original Unit stays opaque; the ghost is
translucent at the proposed destination. Each attack option has a separate row;
blocked Mark lists Wispling and the blocking Fangrel. Thai text, buttons and
long target lists wrap at 360 px without clipping.

| Case | Desktop | Mobile |
| --- | --- | --- |
| Move | [1280](../../../../packages/web/visual/baselines/preview-move-1280.png) | [360](../../../../packages/web/visual/baselines/preview-move-360.png) |
| Blink | [1280](../../../../packages/web/visual/baselines/preview-blink-1280.png) | [360](../../../../packages/web/visual/baselines/preview-blink-360.png) |
| Blocked target, side B | [1280](../../../../packages/web/visual/baselines/preview-blocked-1280.png) | [360](../../../../packages/web/visual/baselines/preview-blocked-360.png) |

All 19 existing Board images were also inspected: attune, bleed-float,
blink-fade-in, blink-fade-out, blink-landed, burst-order, command-cover,
counter-label, countering, guarded, hidden, marked, off-balance, pin,
push-landed, push-slide, rallied, taunted and weakened. None changed.
No Replay fixture regeneration was needed: engineVersion and dataHash match.

Threat estimates belong to ticket 12, which depends on this ticket and the
session Threat zone ticket 11; this panel reads the reach data ticket 03 exposes.

The required browser install with `--with-deps` was attempted; root dependency
installation failed with `su: Authentication failure`. The already downloaded
pinned Chromium and existing Linux libraries ran the suite successfully.

Merge order: tickets 04 and 14 touch BattleScene and styles. Whichever PR merges
second must first merge current `origin/main` into its branch, resolve any
conflicts and rerun all checks, including visual comparisons.

CI initially exposed Ubuntu LCD text antialiasing (colored subpixel edges),
while Debian used grayscale, despite identical pinned fonts and Chromium.
The screenshot browser now uses `--disable-lcd-text` for consistent grayscale
text. Board pixels and geometry matched; the difference was confined to text.

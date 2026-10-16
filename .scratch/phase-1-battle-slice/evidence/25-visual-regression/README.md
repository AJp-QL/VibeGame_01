# Ticket 25 pinned Chromium baselines

All 19 baseline frames were generated and inspected on Linux with Playwright
1.62.1 / Chromium 151.0.7922.34 (build 1234), using the locked Latin/Thai fonts.
The requested overlays, animation phases, floating text, terrain frames and
status glyphs are visible. No renderer defect was identified.

Three consecutive comparisons passed (57/57). A temporary Guarded icon change
from blue to magenta failed with 171 differing pixels; restoring the source
colour passed again. Root checks passed: 746 tests, 1 skipped, typecheck and
production build. No visual tests were discovered by Vitest.

## Inspected captures

- [burst-order](../../../../packages/web/visual/baselines/burst-order.png)
- [blink-fade-out](../../../../packages/web/visual/baselines/blink-fade-out.png)
- [blink-fade-in](../../../../packages/web/visual/baselines/blink-fade-in.png)
- [blink-landed](../../../../packages/web/visual/baselines/blink-landed.png)
- [push-slide](../../../../packages/web/visual/baselines/push-slide.png)
- [push-landed](../../../../packages/web/visual/baselines/push-landed.png)
- [counter-label](../../../../packages/web/visual/baselines/counter-label.png)
- [bleed-float](../../../../packages/web/visual/baselines/bleed-float.png)
- [attune](../../../../packages/web/visual/baselines/attune.png)
- [command-cover](../../../../packages/web/visual/baselines/command-cover.png)
- [guarded](../../../../packages/web/visual/baselines/guarded.png)
- [rallied](../../../../packages/web/visual/baselines/rallied.png)
- [pin](../../../../packages/web/visual/baselines/pin.png)
- [marked](../../../../packages/web/visual/baselines/marked.png)
- [hidden](../../../../packages/web/visual/baselines/hidden.png)
- [countering](../../../../packages/web/visual/baselines/countering.png)
- [weakened](../../../../packages/web/visual/baselines/weakened.png)
- [off-balance](../../../../packages/web/visual/baselines/off-balance.png)
- [taunted](../../../../packages/web/visual/baselines/taunted.png)

The [earlier system Chromium smoke contact sheet](system-chromium-smoke.png)
is historical evidence only. The linked individual PNGs above are the actual
pinned-browser baselines used by the suite.

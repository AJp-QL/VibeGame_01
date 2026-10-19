# P1X-16 — Board 9×9 visual review

Branch created from `origin/main` at `7ae2452`.

Fixture regeneration (`pnpm --filter @mt/web visual:fixtures`) is idempotent:
all 16 committed Replay JSON files already match engine `0.12.0` and dataHash
`c107df748ac3360ae713105c44fda594cf45547e9a3d3d1f055710fc72deddc1`.
`pnpm --dir tools/simulator check-replays` confirms compatibility.

Baselines were updated on Linux with Playwright **1.62.1**, pinned Chromium
**151.0.7922.34** (build **1234**), the configured grayscale text flag and locked
fonts. No system browser override was used. The environment already has the
required system libraries; `install --with-deps chromium` cannot elevate to root,
so `playwright install chromium` installed the pinned browser successfully.

Inspected all **39** baseline images below: the 27 existing baselines are unchanged,
and 12 new images cover both actual 9×9 Boards and their menu selections at
1280, 360 and 375 px. Terrain colours/glyphs, all seven legend entries, Units,
mini Board dimensions, selected menu cards and Thai descriptions are visible
without clipping. Touch tests select the seventh-column Unit, move into column nine,
and inspect the bottom-right Unit without horizontal scrolling. The real App's
menu starts a 9×9 Battle. Board sizing retains the existing crisp integer-device-
pixel scaling (32 px tiles on the tested DPR-1 phones).

## Reviewed images

- [attune.png](../../../../packages/web/visual/baselines/attune.png)
- [bleed-float.png](../../../../packages/web/visual/baselines/bleed-float.png)
- [blink-fade-in.png](../../../../packages/web/visual/baselines/blink-fade-in.png)
- [blink-fade-out.png](../../../../packages/web/visual/baselines/blink-fade-out.png)
- [blink-landed.png](../../../../packages/web/visual/baselines/blink-landed.png)
- [burst-order.png](../../../../packages/web/visual/baselines/burst-order.png)
- [command-cover.png](../../../../packages/web/visual/baselines/command-cover.png)
- [counter-label.png](../../../../packages/web/visual/baselines/counter-label.png)
- [countering.png](../../../../packages/web/visual/baselines/countering.png)
- [grand-crossroads-1280.png](../../../../packages/web/visual/baselines/grand-crossroads-1280.png)
- [grand-crossroads-360.png](../../../../packages/web/visual/baselines/grand-crossroads-360.png)
- [grand-crossroads-375.png](../../../../packages/web/visual/baselines/grand-crossroads-375.png)
- [guarded.png](../../../../packages/web/visual/baselines/guarded.png)
- [hidden.png](../../../../packages/web/visual/baselines/hidden.png)
- [marked.png](../../../../packages/web/visual/baselines/marked.png)
- [menu-grand-crossroads-1280.png](../../../../packages/web/visual/baselines/menu-grand-crossroads-1280.png)
- [menu-grand-crossroads-360.png](../../../../packages/web/visual/baselines/menu-grand-crossroads-360.png)
- [menu-grand-crossroads-375.png](../../../../packages/web/visual/baselines/menu-grand-crossroads-375.png)
- [menu-wide-shallows-1280.png](../../../../packages/web/visual/baselines/menu-wide-shallows-1280.png)
- [menu-wide-shallows-360.png](../../../../packages/web/visual/baselines/menu-wide-shallows-360.png)
- [menu-wide-shallows-375.png](../../../../packages/web/visual/baselines/menu-wide-shallows-375.png)
- [off-balance.png](../../../../packages/web/visual/baselines/off-balance.png)
- [pin.png](../../../../packages/web/visual/baselines/pin.png)
- [preview-blink-1280.png](../../../../packages/web/visual/baselines/preview-blink-1280.png)
- [preview-blink-360.png](../../../../packages/web/visual/baselines/preview-blink-360.png)
- [preview-blocked-1280.png](../../../../packages/web/visual/baselines/preview-blocked-1280.png)
- [preview-blocked-360.png](../../../../packages/web/visual/baselines/preview-blocked-360.png)
- [preview-move-1280.png](../../../../packages/web/visual/baselines/preview-move-1280.png)
- [preview-move-360.png](../../../../packages/web/visual/baselines/preview-move-360.png)
- [push-landed.png](../../../../packages/web/visual/baselines/push-landed.png)
- [push-slide.png](../../../../packages/web/visual/baselines/push-slide.png)
- [rallied.png](../../../../packages/web/visual/baselines/rallied.png)
- [taunted.png](../../../../packages/web/visual/baselines/taunted.png)
- [threat-zone-1280.png](../../../../packages/web/visual/baselines/threat-zone-1280.png)
- [threat-zone-360.png](../../../../packages/web/visual/baselines/threat-zone-360.png)
- [weakened.png](../../../../packages/web/visual/baselines/weakened.png)
- [wide-shallows-1280.png](../../../../packages/web/visual/baselines/wide-shallows-1280.png)
- [wide-shallows-360.png](../../../../packages/web/visual/baselines/wide-shallows-360.png)
- [wide-shallows-375.png](../../../../packages/web/visual/baselines/wide-shallows-375.png)

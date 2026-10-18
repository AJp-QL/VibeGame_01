# Ticket 10 visual review

All 25 baseline images were inspected before and after regeneration on Linux
with Playwright 1.62.1, Chromium 151.0.7922.34 (build 1234); no system-browser
override was used. The 16 Replay fixtures now pin engine 0.11.0 and data hash
`855303ad07974769bebe258255c03bbff77d5638cf54e565f63d3b920efb1dd7`.
Only the engineVersion and dataHash fields changed in the Replay JSON.

Expected differences: four new mountain tiles (c3/e3/c5/e5), shorter skill
ranges and affected reach lists; new range/sight descriptions and the mountain
blocker explanation. The animation frames, status glyphs, Counter label, Burst
target order and Attune frame remain intact. Desktop and 360 px mobile views
have readable text and controls, with no horizontal overflow.

| Capture | Before | After |
| --- | --- | --- |
| attune | ![Before](before/attune.png) | ![After](../../../../packages/web/visual/baselines/attune.png) |
| bleed-float | ![Before](before/bleed-float.png) | ![After](../../../../packages/web/visual/baselines/bleed-float.png) |
| blink-fade-in | ![Before](before/blink-fade-in.png) | ![After](../../../../packages/web/visual/baselines/blink-fade-in.png) |
| blink-fade-out | ![Before](before/blink-fade-out.png) | ![After](../../../../packages/web/visual/baselines/blink-fade-out.png) |
| blink-landed | ![Before](before/blink-landed.png) | ![After](../../../../packages/web/visual/baselines/blink-landed.png) |
| burst-order | ![Before](before/burst-order.png) | ![After](../../../../packages/web/visual/baselines/burst-order.png) |
| command-cover | ![Before](before/command-cover.png) | ![After](../../../../packages/web/visual/baselines/command-cover.png) |
| counter-label | ![Before](before/counter-label.png) | ![After](../../../../packages/web/visual/baselines/counter-label.png) |
| countering | ![Before](before/countering.png) | ![After](../../../../packages/web/visual/baselines/countering.png) |
| guarded | ![Before](before/guarded.png) | ![After](../../../../packages/web/visual/baselines/guarded.png) |
| hidden | ![Before](before/hidden.png) | ![After](../../../../packages/web/visual/baselines/hidden.png) |
| marked | ![Before](before/marked.png) | ![After](../../../../packages/web/visual/baselines/marked.png) |
| off-balance | ![Before](before/off-balance.png) | ![After](../../../../packages/web/visual/baselines/off-balance.png) |
| pin | ![Before](before/pin.png) | ![After](../../../../packages/web/visual/baselines/pin.png) |
| preview-blink-1280 | ![Before](before/preview-blink-1280.png) | ![After](../../../../packages/web/visual/baselines/preview-blink-1280.png) |
| preview-blink-360 | ![Before](before/preview-blink-360.png) | ![After](../../../../packages/web/visual/baselines/preview-blink-360.png) |
| preview-blocked-1280 | ![Before](before/preview-blocked-1280.png) | ![After](../../../../packages/web/visual/baselines/preview-blocked-1280.png) |
| preview-blocked-360 | ![Before](before/preview-blocked-360.png) | ![After](../../../../packages/web/visual/baselines/preview-blocked-360.png) |
| preview-move-1280 | ![Before](before/preview-move-1280.png) | ![After](../../../../packages/web/visual/baselines/preview-move-1280.png) |
| preview-move-360 | ![Before](before/preview-move-360.png) | ![After](../../../../packages/web/visual/baselines/preview-move-360.png) |
| push-landed | ![Before](before/push-landed.png) | ![After](../../../../packages/web/visual/baselines/push-landed.png) |
| push-slide | ![Before](before/push-slide.png) | ![After](../../../../packages/web/visual/baselines/push-slide.png) |
| rallied | ![Before](before/rallied.png) | ![After](../../../../packages/web/visual/baselines/rallied.png) |
| taunted | ![Before](before/taunted.png) | ![After](../../../../packages/web/visual/baselines/taunted.png) |
| weakened | ![Before](before/weakened.png) | ![After](../../../../packages/web/visual/baselines/weakened.png) |

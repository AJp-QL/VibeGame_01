# P1X-35 — Undo reasons

Captured from the real Battle session by `undo-start-over.visual.ts` on Linux,
using Playwright 1.62.1's pinned Chromium build 1234. Both states render a disabled
Undo button whose `aria-describedby` points at the reason. No Board baselines changed.

| Session reason | 1280 px desktop | 360 px mobile |
| --- | --- | --- |
| `turn-start` — ยังไม่มี action ให้ย้อน | [Desktop](undo-turn-start-1280.png) | [Mobile](undo-turn-start-360.png) |
| `after-roll` — ผลการทอยลูกเต๋าย้อนไม่ได้ | [Desktop](undo-after-roll-1280.png) | [Mobile](undo-after-roll-360.png) |

The browser flow starts with no action to undo, moves a Unit, accepts an Undo,
then confirms an Action plan that rolls dice. It checks the available safe point,
the accepted Undo count, both disabled reasons, Start over, and mobile overflow.

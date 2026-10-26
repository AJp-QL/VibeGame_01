# P1X-40 visual evidence

Linux; Playwright 1.62.1; pinned Chromium 151.0.7922.34 (build 1234).
All captures use the real session, Board and React panels, with locked fonts.

| View | Desktop (1280 px) | Phone (360 px) | Phone (375 px) |
| --- | --- | --- | --- |
| Move preview | [1280 px](../../../../packages/web/visual/baselines/preview-move-1280.png) | [360 px](../../../../packages/web/visual/baselines/preview-move-360.png) | [375 px](../../../../packages/web/visual/baselines/preview-move-375.png) |
| Blink preview | [1280 px](../../../../packages/web/visual/baselines/preview-blink-1280.png) | [360 px](../../../../packages/web/visual/baselines/preview-blink-360.png) | [375 px](../../../../packages/web/visual/baselines/preview-blink-375.png) |
| Blocked target / Camouflage hint | [1280 px](../../../../packages/web/visual/baselines/preview-blocked-1280.png) | [360 px](../../../../packages/web/visual/baselines/preview-blocked-360.png) | [375 px](../../../../packages/web/visual/baselines/preview-blocked-375.png) |
| Shadow with reachable enemies | [1280 px](../../../../packages/web/visual/baselines/shadow-preview-1280.png) | [360 px](../../../../packages/web/visual/baselines/shadow-preview-360.png) | [375 px](../../../../packages/web/visual/baselines/shadow-preview-375.png) |
| Action plan from the shadow | [1280 px](../../../../packages/web/visual/baselines/shadow-plan-1280.png) | [360 px](../../../../packages/web/visual/baselines/shadow-plan-360.png) | [375 px](../../../../packages/web/visual/baselines/shadow-plan-375.png) |
| Move-only continuation | [1280 px](../../../../packages/web/visual/baselines/actions-from-here-1280.png) | [360 px](../../../../packages/web/visual/baselines/actions-from-here-360.png) | [375 px](../../../../packages/web/visual/baselines/actions-from-here-375.png) |

The phone captures keep the full Board above the bottom sheet. Its details may
scroll inside the sheet; the confirmation footer stays visible. The 640 px tests
assert no horizontal overflow, no document scrolling, and no Board/sheet overlap.

The live session remains unchanged by previewing, choosing a plan, or rendering
post-move odds. A move-only confirm leaves the Unit selected; Done clears only
selection, preserving the Battle, recorded actions and current activation.

Checks:

- Frozen dependency install, typecheck, production build and path ownership check.
- Full unit suite: 1,114 passed; one existing skipped test. Cloud run used two
  workers and a 30-second timeout to accommodate simulation tests on this CPU.
- Replay fixtures match this build; no engine/data fixture refresh was needed.
- Visual update and comparison results are recorded in the PR.

Image review: all 39 baselines inspected, including the 20 new/updated PNGs.
Board marks, dimming, blocked crosses, ghost/target visibility, attack odds and
phone footers were checked. The existing Undo, menu and Threat zone flows also
pass with their controls inside the sheet.

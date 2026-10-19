# P1X-24 Action plan

- [Desktop](action-plan-1280.png) · [360 px mobile](action-plan-360.png)
- [Walk before attack](walk-before-attack.png): the real renderer advances on a deterministic 10 ms clock; Move completes at the planned origin before the lunge starts.

Session supplies every target, origin, choice, preview and event batch. Enemy taps aim; origin taps move the shadow; only confirmation commits through the switch-Unit guard. Tapping the planning Unit calls `session.cancel()`: it clears only the plan and preserves selection and any Move preview, including when staying cannot attack. Missing Unit views invoke both walk and Blink completion callbacks so later batches continue. Regression tests cover these cases and both real Board input flows.

Tap count including Unit selection: 6 → 3 enemy-first, 6 → 4 tile-first. Optional skill/origin changes add taps. Blue movement, red swords/dots and usable wrapping remain visible at 360 px. P1X-32/34 still own the port contract cleanup.

Revalidated against main c1474cb: frozen install, typecheck, 1,050 tests passed / 1 skipped, build, path ownership and replay validation passed. All 34 pinned Linux Chromium visual cases passed. All baselines remain unchanged by the review corrections, including the six blue Move preview images. Refreshed these evidence captures from the passing run.

Main added two 9×9 Boards (P1X-15/P1X-16), invalidating the fixture data hash. Regenerated all 16 fixtures and verified their only change is `dataHash`; seeds, actions and replay payloads are unchanged. Actual screenshot comparisons passed against the existing baselines.

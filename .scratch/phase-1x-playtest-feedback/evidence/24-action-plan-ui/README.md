# P1X-24 Action plan

- [Desktop](action-plan-1280.png) · [360 px mobile](action-plan-360.png)
- [Walk before attack](walk-before-attack.png): real renderer, deterministic 10 ms clock. A multi-step Move finishes at the planned origin before the attack lunge starts.

Every target, origin, choice, preview and event batch comes from session. Enemy taps aim; origin taps move the shadow; only the confirmation button commits. The existing switch-Unit guard wraps `confirmPlan`. Move preview target buttons plan an attack from the shadow; support choices are available there too. Movement is blue, swords and attack origins red. Inspected both Action plan captures and all six updated Move preview baselines; text wraps and buttons remain usable at 360 px. The 19 Board-only baselines are unchanged.

Tap count (including selecting the Unit): before = 6 (Unit, tile, confirm Move, Attack, target, confirm attack); enemy-first = 3 (Unit, badged enemy, confirm plan); tile-first = 4 (Unit, tile, enemy button, confirm plan). Optional origin/skill changes add taps.

Checks: frozen install, typecheck, workspace tests 1,030 passed / 1 skipped; web tests after the animation refinement 65/65; build, check-replays and path check. Linux pinned Chromium visual comparison: 30/30 passed. The suite includes both real Board input flows, switching skills without committing, a tile-first plan preserving the chosen origin, and actual animation order.

Includes the completed P1X-30 fixture prerequisite (PR #59). The local visual server used port 4182 while other ticket suites used 4178/4180. An early capture run overlapped a renderer edit, and a loaded cloud run reached a UI test timeout; the final complete run passed on the finished code with the standard per-case timeouts.

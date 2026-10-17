# Ticket 14 — Board size review

Linux; Node 24.19.0, pnpm 12.11.2, Playwright 1.62.1, pinned Chromium
151.0.7922.34 (build 1234). No browser override, Replay fixture regeneration,
or baseline changes.

Canvas dimensions, grid lines, hit testing and the web fitting box use the
Battle terrain dimensions. Menu thumbnails use the Board's terrain column
count. Geometry helpers have tests at 3×3, 7×7, 9×9 and 15×15: every cell centre,
the last in-bounds pixel, outside edges, and invalid coordinates. Scaling tests
cover 9×9 on 360 px and desktop screens at seven device pixel ratios.

A real Scenario 1 Battle on a test-only 9×9 Board is mounted through BattleView.
The browser checks canvas dimensions (288×288), display fit, correct 7/9-column
thumbnails, a Move to i5 using actual canvas taps, a tap on the bottom-right
Tamer, no horizontal scrolling and no browser errors. The Board is generated
only in the test harness, without changing production data or dataHash.

Both evidence images were inspected: nine rows and columns, complete outer
edges, intact Unit art, and correctly sized 9×9 and 7×7 thumbnails. The images
show the initial Board before the interaction checks run, avoiding an animation
frame in the capture.

- [Desktop, 1280 px](board-9x9-1280.png)
- [Mobile, 360 px](board-9x9-360.png)

The original 19 Board baseline comparisons all passed unchanged. No new
comparison baselines are added: the two 9×9 cases assert rendering/input and
attach screenshots as review evidence. Full visual suite: 21 passed.

A missing closing brace after `.legend details ul` previously swallowed the
menu thumbnail rules as nested selectors. Closing it is necessary for the
actual mini-Boards to display as grids; it also restores the existing intended
menu and dialog styles. The 7×7 Phaser Board captures are unaffected.

Checks: frozen install, typecheck, full tests (822 passed, 1 intentional skip),
production build, Replay validation and visual suite (21 passed). The required
browser dependency install was already attempted in this session and cannot
use `su` in this environment; the installed pinned browser and Linux libraries
successfully ran all checks.

Merge order with [ticket 04 / PR #26](https://github.com/AJp-QL/VibeGame_01/pull/26):
whichever PR merges second must first merge latest `origin/main` into its
branch, resolve conflicts and rerun all checks including visual comparisons.
The two branches were created independently from freshly fetched origin/main.

# P1X-29 range text evidence

Captured on Linux with Playwright 1.62.1's pinned Chromium 151.0.7922.34 (build 1234),
using the visual harness's Noto Sans Mono / Noto Sans Thai fonts and real
`createBattleSession` data. Both images were inspected: the complete combined
blocker reason is readable, and the 360 px view wraps without clipping.

- [Desktop, 1280 px](combined-blockers-1280.png)
- [Mobile, 360 px](combined-blockers-360.png)

Setup: Scenario 1, a normal 7×7 Board with a mountain on c2; A's Tamer/m1/m2
on e2/g2/g1, B's on g7/d2/a2; B plays first; Dice Seed `0123456789abcdef`;
Inspiration disabled. Select B.m2 (Quillfox), choose Mark. The session reports
both B.m1 (Tidewall on d2) and mountain c2 blocking the shot at A's Tamer.
The captures mount the existing BattleView and TurnPanel with that real session.

The normal visual suite passed 27/27 comparisons with all baselines unchanged.
Text tests cover Unit-only, mountain-only, combined blockers, and an empty
terrain list (which must not be inferred to mean mountain) in both targeting
and Move preview. Existing real-session mountain-only tests verify terrain data
in the targeting and Move preview snapshots. Range boundary tests use session
exports; string tests also pass different numbers to the range formatters.

Validation:

- `corepack pnpm install --frozen-lockfile`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test --maxWorkers=2 --testTimeout=60000`: 934 passed, 1 skipped
  (60 files passed, 1 skipped). The unconstrained run stalled in the cloud worker
  and was stopped; no test configuration was changed.
- `corepack pnpm build`: passed.
- `node tools/path-check/src/bin.ts --branch codex/p1x-29-range-text-from-session --base origin/main`: passed.
- `corepack pnpm --filter @mt/web exec playwright install --with-deps chromium`:
  attempted; OS dependency installation requires an unavailable root password.
  `playwright install chromium` succeeded, and the existing system libraries
  supported all comparisons using the pinned browser.
- `corepack pnpm --filter @mt/web test:visual`: 27 passed, no baseline updates.
- `corepack pnpm --dir tools/simulator check-replays`: all Replay files match
  this build; no stale fixtures.

Commands used `COREPACK_HOME=/workspace/.cache/corepack` and
`PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright` for browser commands.
The visual server and Git operations used the environment's enabled network
permissions; the restricted command sandbox blocks localhost sockets.

All three GitHub CI jobs passed on the implementation commit in
[PR #56](https://github.com/AJp-QL/VibeGame_01/pull/56):
[CI run](https://github.com/AJp-QL/VibeGame_01/actions/runs/39152025777).
The visual comparison step ran successfully; fixtures were not skipped as stale.

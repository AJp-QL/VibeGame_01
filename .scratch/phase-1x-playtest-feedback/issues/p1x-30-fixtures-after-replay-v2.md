# P1X-30 — Refresh visual fixtures and baselines for engine 0.12.0

**Owner:** codex

**What to build:** P1X-06 moved `ENGINE_VERSION` from 0.11.0 to 0.12.0 (Replay format 2). The Replay fixtures in `packages/web/visual/fixtures/` pin `engineVersion` and `dataHash`, so `openReplay` no longer gives `ready` for them and the Board visual job warns "Visual fixtures are stale". Regenerate them for current main (model: P1X-29 / ticket 29): rebase on main, run `corepack pnpm --filter @mt/web visual:fixtures`, check every fixture still yields the event/status its case needs, update baselines with `test:visual:update` on Linux with the pinned Chromium, look at every image, attach before/after in the PR. If a visual is wrong, open a separate ticket. Other tickets that bump `ENGINE_VERSION` before this one is done (e.g. P1X-15, P1X-23) are covered by the same refresh: do it once on the latest main.

**Blocked by:** P1X-06 — Replay format 2 records Undo

**Status:** ready-for-agent

- [ ] every fixture opens with `openReplay` as `ready` on current main (`corepack pnpm --dir tools/simulator check-replays` exits 0)
- [ ] baselines updated on Linux + pinned Chromium and checked by eye
- [ ] `pnpm --filter @mt/web test:visual --repeat-each=3` passes
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build` and the path check pass

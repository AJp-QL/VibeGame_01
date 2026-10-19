# Phase 1.x lead notes (handoff 2026-10-17)

Working state for the session that controls phase 1.x. Read this first, then `spec.md` and `issues/`. Phase 1 history: `../phase-1-battle-slice/NOTES.md`.

## Status (2026-10-17, main = c66fd65)

- Phase 1 done (tickets 01–32 of `phase-1-battle-slice` except 32 Node 26, which waits for 2026-10-28). Live: v0.1.5, ENGINE_VERSION 0.9.0 on main.
- Phase 1.x spec (PR #15) and tickets 01–17 (PR #17) merged. Source: playtest v0.1.5 Replay + 3 player comments, grill-with-docs 2026-10-17 (5 decision-log rows dated 2026-10-17).
- Ticket 04 got one extra item from the PR #16 review (PR #18): "ยังเดินได้" only when the Unit has reachable tiles (Pinned Unit case).
- AGENTS.md now allows several Claude sessions in parallel, each in its own worktree and `claude/<ticket>-<slug>` branch (PR #19).
- 2026-10-18 (main = eadfe69): 01, 02, 03, 13 merged. Codex PRs #26 (04) and #27 (14) reviewed. Tickets 18 (claude) and 19 (codex) added from the #26 review.
- 2026-10-18: ticket IDs with phase code (P1X-NN), files renamed to `issues/p1x-NN-<slug>.md`, branch names enforced by CI (`docs/agents/issue-tracker.md`). P1X-05 and P1X-09 closed.
- 2026-10-18 (main = 3957360): 04, 08, 09, 14, 18, 25, 26 merged; 09 has one open target (Shallows). Ticket 27 added from the post-merge review of PR #34.

## Tickets

| ID | Ticket | Owner | Blocked by | State |
|---|---|---|---|---|
| P1X-01 | Inspiration only on a miss + switch/end-of-Turn data | claude | — | done (PR #21, ENGINE_VERSION 0.10.0) |
| P1X-02 | Quick UI fixes + fixture refresh | codex | P1X-01 | done (PR #25) |
| P1X-03 | Move preview in session | claude | — | done (PR #22) |
| P1X-04 | Move preview UI | codex | P1X-03 | done (PR #26) |
| P1X-05 | Undo in engine and session | claude | P1X-01 | done (PR #30) |
| P1X-06 | Replay format 2 + playback + play stats | claude | P1X-05 | done (PR #50) |
| P1X-07 | Undo / Start over / playback toggle UI | codex | P1X-06, P1X-02 | waiting |
| P1X-08 | Range experiments (simulator) | claude | P1X-01 | done (PR #32); user chose a+b+c on 2026-10-18 |
| P1X-09 | Apply chosen range combination | claude | P1X-08 + user choice | done (PR #34, ENGINE_VERSION 0.11.0); Shallows first-attack target handed to P1X-20 (user, 2026-10-18) |
| P1X-10 | Fixture refresh after range change + new rule text | codex | P1X-09 | done (PR #45, fixtures 0.11.0) |
| P1X-11 | Threat zone in session | claude | P1X-03, P1X-09 | ready |
| P1X-12 | Threat zone UI | codex | P1X-11, P1X-04 | waiting |
| P1X-13 | Board size per Board: expand engine/AI/simulator | claude | — | done (PR #23) |
| P1X-14 | Board size per Board: battle/web | codex | P1X-13 | done (PR #27) |
| P1X-15 | Contract BOARD_SIZE + 9x9 Boards | claude | P1X-13, P1X-14, P1X-09 | PR #52 on hold (user, 2026-10-19) until Codex P1X-31 (9x9 `boardBlurb`, not blocked) lands; merges last |
| P1X-16 | 9x9 Boards UI | codex | P1X-15 | waiting |
| P1X-17 | Release v0.2.0 + next playtest | claude | P1X-07, P1X-10, P1X-12, P1X-16, P1X-19, P1X-24, P1X-29 | waiting |
| P1X-18 | Move preview session follow-up | claude | P1X-04, P1X-25 | done (PR #29) |
| P1X-19 | Move preview UI cleanup | codex | P1X-18 | done (PR #46) |
| P1X-20 | Range experiments follow-up | claude | P1X-09 | ready |
| P1X-21 | Enemy range in session (low priority) | claude | P1X-11 | waiting |
| P1X-22 | Enemy range UI (low priority) | codex | P1X-21 | waiting |
| P1X-23 | Action plan in session | claude | P1X-18 | ready |
| P1X-24 | Action plan UI | codex | P1X-23, P1X-19 | waiting |
| P1X-25 | Move preview visual test re-select | codex | — | done (PR #41) |
| P1X-26 | Web test vs range rules | codex | — | done (PR #42) |
| P1X-27 | Range rules cleanup from the PR #34 review | claude | — | done (PR #53) |
| P1X-28 | Session: terrain sight blockers + line-of-sight distance export | claude | — | done (PR #49) |
| P1X-29 | UI: range and sight text from session | codex | P1X-28 (P1X-10 done) | waiting |
| P1X-30 | Refresh visual fixtures and baselines for engine 0.12.0 | codex | P1X-06 | waiting |

Next: Codex P1X-29 after P1X-28. Claude P1X-06, 11, 15, 20, 23, 27, 28 ready.

## Lead's job

1. Watch PRs (`gh pr list`). Claude PRs: check CI (3 jobs) then merge with a merge commit; delete the branch. Codex PRs: run `/code-review <branch> PR#N`, report, the human merges.
2. After a Claude ticket merges, tell the user which Codex ticket is unblocked and give the Codex prompt:
   > Do ticket P1X-NN: `.scratch/phase-1x-playtest-feedback/issues/p1x-NN-<slug>.md`. Follow `AGENTS.md` and `docs/agents/codex.md`. Use a branch named `codex/p1x-NN-<slug>` exactly, put `[P1X-NN]` at the start of the PR title, run all checks, then open a PR to `main`.
   (Ticket IDs carry the phase code since 2026-10-18; CI fails any other branch name.)
3. Every ticket that bumps ENGINE_VERSION or changes `data/` makes visual fixtures stale; the matching Codex ticket refreshes them (AGENTS.md → ENGINE_VERSION). The visual job stays green with a "fixtures are stale" warning in between.
4. Ticket 08 ends with a report; ask the user which combination to apply before starting 09, and record the choice in the decision log.
5. Release (ticket 17): tag from main after CI green: `git tag -a vX.Y.Z <sha> -m "..."` then `git push origin vX.Y.Z` (allowed by `.claude/settings.local.json`); deploy.yml runs; check the live bundle reports the version.

## Process rules

- Never work, switch branches, pull or `git commit -a` in the main checkout: other sessions keep uncommitted work there. Use `git worktree add .claude/worktrees/<name> -b claude/<ticket>-<slug> origin/main`; remove it after merge (`git worktree remove --force`, then `git worktree prune` if Windows says "Permission denied").
- Subagents inside a session: one at a time (user rule). Separate sessions: parallel OK, one ticket each.
- gh: `& "C:\Program Files\GitHub CLI\gh.exe"` in PowerShell (not on PATH). Checks: `corepack pnpm install --frozen-lockfile`, `typecheck`, `test`, `build`, `node tools/path-check/src/bin.ts --branch <b> --base origin/main`.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; PR body ends with the Claude Code line.

## Key decisions (2026-10-17, see spec and decision log)

- Move preview: ghost + per-skill reachable enemies, confirm with "เดิน" button (Blink same flow, "Blink" button).
- Undo to the latest safe point (start of Turn or after the last dice roll); own Turn only; hidden in AI Turn. Start over = new Dice Seed, old Battle counted abandoned. Replay format 2 records undo; playback skips undone actions by default.
- Threat zone: rough count (walk + longest range), only at the previewed tile, built after the range fix.
- Inspiration: offered only after a miss or a failed save (rule change, ENGINE_VERSION bump in ticket 01).
- Range vs Board: measure shorter ranges / long-range disadvantage / sight-blocking terrain separately, then combine; add 9x9 Boards alongside 7x7.
- Board size becomes per Board via expand (13) → migrate UI (14) → contract (15).

## Gotchas

- **Ticket 01 WIP sits uncommitted on `main` in the main checkout** (rules.md, resolution.ts, version.ts, many engine/ai/session tests, new sessionSwitch.test.ts). That session must move it to `claude/01-…` before committing. Don't touch it.
- 01 and 13 may both touch engine files; whichever merges second merges `origin/main` and re-runs checks.
- The main checkout's local `main` is behind origin (049643a vs c66fd65) because of that WIP; fetch only.
- Codex's sandbox could not run Chromium for ticket 30, so local screenshots may be missing; CI's visual job is the real check.
- Earlier slip (fixed): `git commit -a` in the main checkout swept another session's file into a PR; removed by soft reset + force-push of the own branch.
- Old worktrees from other sessions (`agent-abc0dfe…`, `token-efficiency-…`) are not ours; leave them.

## Open outside phase 1.x

- Phase 1 ticket 32: Node 26 from 2026-10-28.
- Human: play a Battle on the live site before the next playtest; Blink nearly unused (wait for feedback); phase 2 planning later.

---
name: pr-preflight
description: Run the same checks as CI on the current branch, check the ENGINE_VERSION rule, then open the PR to main with the commands and results in the body. Never merges.
disable-model-invocation: true
---

# PR preflight

Run from the root of the worktree whose branch you want to open a PR for. Rules come from `AGENTS.md` (Workflow, Commands, ENGINE_VERSION) and `docs/agents/issue-tracker.md`; if this file disagrees with them, they win.

Never merge, enable auto-merge, push to `main` or create tags here. Merging is a separate decision after all three CI jobs are green.

## 1. Branch and ticket

```sh
git branch --show-current
git fetch origin
git status --short
```

- Stop if the branch is `main` or does not start with `claude/`.
- Stop if `git status --short` shows uncommitted changes: the checks must test what gets pushed. Ask the user to commit or set them aside first.
- Ticket branch `claude/<code>-<NN>-<slug>`: the ticket ID is `<CODE>-<NN>` in upper case. Find the ticket file `.scratch/*/issues/<code>-<NN>-*.md` and read it (title, `**Owner:**`, checkboxes).
- Ticket status: check that the ticket's `**Status:**` and checkboxes match what this PR delivers (the PR that closes a ticket sets `**Status:** done`). If they are stale, tell the user and offer to update and commit them now, before the checks; do not change them silently.
- Kind branch `claude/<research|spec|docs|chore>-<slug>`: no ticket.
- If `origin/main` has commits the branch lacks (`git rev-list --count HEAD..origin/main` > 0), say so. When another merged ticket touched the same files, merge `origin/main` in before the checks (`AGENTS.md`, Concurrency).

## 2. Checks

Run each command in order from the repo root and record the command, its exit code and a one-line result (test counts, number of files checked). **Stop at the first failure**: report the failing command and the relevant output, and do not open the PR.

| # | Command | Pass when |
| --- | --- | --- |
| 1 | `corepack pnpm install --frozen-lockfile` | exit 0 |
| 2 | `corepack pnpm typecheck` | exit 0 |
| 3 | `corepack pnpm test` | exit 0 (record files / tests passed and skipped) |
| 4 | `corepack pnpm build` | exit 0 |
| 5 | `node tools/path-check/src/bin.ts --branch <branch> --base origin/main` | exit 0; `<branch>` is the real name from step 1, never a placeholder |
| 6 | `corepack pnpm --dir tools/simulator --silent check-replays` | exit 0 = fixtures current; **exit 3 = stale** (see below); any other code = failure |

`pnpm test` failing only with `Test timed out in 5000ms` in the heavy AI / simulator / session tests usually means CPU contention (other worktrees running tests at the same time). Re-run each failing file alone (`corepack pnpm exec vitest run <file>`). If they all pass, you may continue, but the PR must report both runs honestly (full run: N timeouts; each failing file alone: pass). A failure that is not a timeout, or a timeout that repeats when run alone, is a real failure: stop.

`check-replays` exit 3 is not a bug (pnpm also prints `ELIFECYCLE Command failed with exit code 3`; that is expected): the Replay fixtures pin `engineVersion` and `dataHash`, and this branch changed one of them. Report it as "Replay fixtures stale (exit 3)", keep going, and make sure step 3 finds the `Owner: codex` refresh ticket. CI's visual job will be green with the warning "Visual fixtures are stale" and will not compare screenshots.

Board visual tests (`corepack pnpm --filter @mt/web test:visual`) run on Linux only, with Playwright's pinned Chromium:

- On Windows or macOS: do not run them. Report "Board visual tests skipped: Linux-only (`packages/web/visual/README.md`); CI's visual job runs them."
- On Linux, when `check-replays` exited 0: run `corepack pnpm --filter @mt/web exec playwright install --with-deps chromium`, then `corepack pnpm --filter @mt/web test:visual`. A failure stops here like any other check.
- On Linux with stale fixtures: skip them, as CI does, and say why.

## 3. ENGINE_VERSION rule

```sh
git diff --name-only origin/main...HEAD
```

The branch **changes results** when the list has a file under `packages/engine/src/` or under `data/`. Engine tests (`packages/engine/test/`) and docs (`*.md`) alone do not count.

When it changes results:

- `packages/engine/src/version.ts` must be in the list, with `ENGINE_VERSION` raised by one minor (0.x, e.g. `0.12.0` → `0.13.0`). Compare `git show origin/main:packages/engine/src/version.ts` with the working copy.
  Exception: a change that truly does not alter state, events, dice order or accepted/rejected actions for the same data + Dice Seed + actions (pure refactor, new read-only helper). Then the PR body must say why no bump is needed, and the user must confirm it before you continue.
- The branch's ticket (or the PR body for a kind branch) must name a follow-up `Owner: codex` ticket "refresh visual fixtures and baselines" with `**Blocked by:**` this ticket, and that ticket file must exist in `.scratch/` on this branch or on `origin/main` (model: P1X-09 → P1X-10).

If a bump or the follow-up ticket is missing, stop and say exactly what is missing. Do not add them yourself unless the user asks.

When the branch does not change results: record "ENGINE_VERSION unchanged (no rules or data change)".

If `check-replays` exited 3, the follow-up `Owner: codex` refresh ticket is required even when no bump is needed (e.g. a `data/` change argued as not changing results).

If anything was committed after step 2 (a fix, a ticket edit), run the checks again: the PR must list results for the commit that gets pushed.

## 4. Push and open the PR

```sh
git push -u origin <branch>
gh pr create --base main --head <branch> --title "<title>" --body-file <file>
```

Write the body to a file in the scratchpad (not in the repo) so quoting survives PowerShell and bash.

**Title**

- Ticket branch: `[<CODE>-<NN>] <short summary>`, e.g. `[P1X-24] Action plan UI`.
- Kind branch: a plain summary that starts with the kind, e.g. `Docs: …`, `Spec: …`, `Research: …`, `Chore: …`.

**Body** (sections in this order):

```markdown
Ticket: `.scratch/<feature>/issues/<code>-<NN>-<slug>.md` (closed in this PR | partly done).

## Changes
- <what changed and why, one bullet per area>

<ENGINE_VERSION line: "ENGINE_VERSION 0.12.0 → 0.13.0; follow-up Owner: codex ticket <CODE>-<NN> refreshes the visual fixtures." or "ENGINE_VERSION unchanged (no rules or data change).">

## Checks run
- `corepack pnpm install --frozen-lockfile` — pass
- `corepack pnpm typecheck` — pass
- `corepack pnpm test` — <N> files passed, <M> skipped (<T> tests passed)
- `corepack pnpm build` — pass
- `node tools/path-check/src/bin.ts --branch <branch> --base origin/main` — <the tool's own summary line>
- `corepack pnpm --dir tools/simulator --silent check-replays` — current (exit 0) | stale (exit 3): <which fixtures>
- Board visual tests — skipped: Linux-only, CI's visual job runs them | pass

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Use the exact commands you ran and the real results; never list a check you did not run.

## 5. Report

Give the user the PR link and the check summary. Remind them that the merge waits for both CI runs (push and pull_request) to pass all three jobs: build, path check and Board visual regression. Do not merge.

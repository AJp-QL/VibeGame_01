---
name: start-ticket
description: Check that a Claude ticket may start (ticket file, Owner, merged blockers, overlapping work, lockfile) and create its worktree and branch from origin/main. User-invoked only.
disable-model-invocation: true
argument-hint: <CODE>-<NN>
---

# /start-ticket $ARGUMENTS

Run the "start a ticket" rules from `AGENTS.md` (Workflow, Concurrency) and `docs/agents/issue-tracker.md` for ticket `$ARGUMENTS`, then create its worktree.

- Run every command from the current checkout with the Bash tool (POSIX sh, also on Windows). Start each Bash call with `export MSYS_NO_PATHCONV=1`: without it Git Bash on Windows rewrites `origin/main:<path>` into a Windows path and `git show` fails. Read only: never check out, switch branches, pull or commit in it. It may be the main checkout other sessions share.
- Steps 1–5 are hard checks. Do them all, then report every failure at once with its reason and **stop**: create nothing. Steps 6–7 are warnings: report them and continue.
- Do not edit the ticket file or any other file. Starting a ticket changes nothing in the repo; the ticket's `Status:` is updated in its own PR.

## 0. Normalise the ID

`$ARGUMENTS` is `<CODE>-<NN>` (e.g. `P1X-38`, `ca-4`). Split at the last `-`: `code` = lower-case letters/digits starting with a letter, `nn` = the number padded to at least two digits (`ca-4` → `ca`, `04`). `ID` = `<CODE>-<NN>` in upper case for messages. Anything else: stop with "expected `<CODE>-<NN>`, e.g. `P1X-38`".

Fetch first, then read tickets **from `origin/main`**, not from the working tree: the branch is created from `origin/main` and CI's path check only sees ticket files tracked there.

```sh
git fetch --prune origin
git ls-tree -r --name-only origin/main -- .scratch
```

## 1. The ticket file exists

Match the file the way `findTicketFile` in `tools/path-check/src/index.ts` does:

- `code` = `p1` (legacy, named before phase codes): `.scratch/phase-1-battle-slice/issues/<nn>-*.md`
- any other code: `.scratch/*/issues/<code>-<nn>-*.md`

No match: stop with "no ticket file for `ID` on origin/main" and the pattern searched. If the file exists only locally (unpushed), say so: the ticket must be merged to `main` first. More than one match: stop and list them.

Read it with `git show origin/main:<path>`. `slug` = the file name without `.md` and without its `<code>-<nn>-` (or legacy `<nn>-`) prefix. Branch = `claude/<code>-<nn>-<slug>`.

## 2. Owner is Claude

The line under the title must match `**Owner:** claude` (`claude (historical, mixed)` counts). `**Owner:** codex`, no Owner line, or anything else: stop with "`ID` is owned by `<owner>`; Claude only picks up `Owner: claude` tickets (ADR 0004)".

## 3. The ticket itself is open

Read its `**Status:**` line. `ready-for-agent` passes. `done…` or `wontfix…`: stop ("already closed"). `ready-for-human`, `needs-triage`, `needs-info`, `in-review` or anything else: stop and quote the Status line; the user may tell you to go ahead anyway.

## 4. Every blocker is merged

Parse the `**Blocked by:**` line:

- `None` → no blocker tickets. Read any text after it: a condition there still applies. A start date (`None — เริ่มได้ตั้งแต่ 2026-10-28`, "from 2026-10-28") later than today fails ("`ID` may start from <date>"); any other condition you cannot check, quote it and ask.
- Otherwise split on `,` and `;`. In each entry take the ticket reference before any ` — ` text: `<CODE>-<NN>`, or a bare `NN`, which means the same phase as this ticket (old P1 tickets write `05 — Basic Attack ครบวง` = `P1-05`). Note any `PR #N` written in the entry too.

For each blocker, find its ticket file on `origin/main` as in step 1 (missing → fails) and read its `Status:`:

- `wontfix…` → passes only if the Status says it is covered by another ticket (e.g. `wontfix (covered by ticket 28)`); then check that ticket instead.
- not `done…` → fails ("`<blocker>` is `<status>`").
- `done…` → also check its PR is merged on GitHub (Status alone is not enough: a ticket can say `done (PR open)`). Find the PR, first hit wins:
  1. a `PR #N` in its Status line or in the Blocked-by entry;
  2. `gh pr list --state all --limit 200 --json number,state,headRefName,title` → a PR whose `headRefName` starts with `claude/<code>-<nn>-` or `codex/<code>-<nn>-`, else whose title starts with `[<CODE>-<NN>]`. Prefer a `MERGED` one.

  Then `gh pr view <N> --json state,mergedAt`: `MERGED` passes; `OPEN` or `CLOSED` fails ("`<blocker>`: PR #N is `<state>`").
  No PR found (older tickets predate the PR naming): pass only if `git log origin/main --oneline -i --grep "<CODE>-<NN>"` or the Status line shows the work is on `main`; say which evidence you used. Otherwise fail with "no merged PR found".

If `gh` is not signed in or fails, stop: say the blocker check needs `gh auth status` to pass.

## 5. Nobody has started it

Stop if any of these already exists, and name it ("`ID` is already in progress on …; one ticket per session"):

- a local branch or worktree: `git branch --list "claude/<code>-<nn>-*" "codex/<code>-<nn>-*"` and `git worktree list` (Claude Code worktrees often carry a `-<hex>` suffix, so match on the prefix);
- a remote branch: `git ls-remote --heads origin "claude/<code>-<nn>-*" "codex/<code>-<nn>-*"`;
- an open PR from step 4's list whose head or title names this ticket.

A merged or closed PR with no open branch does not block (it was finished or abandoned); mention it.

## 6. Overlapping in-progress work (warning)

In-progress work = open PRs plus local `claude/*` and `codex/*` branches that are not merged into `origin/main` (`git branch --no-merged origin/main --list "claude/*" "codex/*"`; skip this ticket's own). For each, list the files it changes:

- open PR: `gh pr diff <N> --name-only`
- local branch: `git diff --name-only origin/main...<branch>`

Paths this ticket will touch = the paths, packages and folders named in its text (`packages/engine`, `data/`, `tools/path-check`, `.claude/skills/…`, …) plus, if the ticket names files, those files. Report every in-progress item that touches the same file or the same folder (under `.scratch/` only the same file counts: every ticket edits its own ticket file in the shared phase folder), as `<branch or PR #N> (<ID if any>): <shared paths>`. If there are any, add: "Whoever merges second merges `origin/main` into its branch and re-runs all checks before its PR." If you cannot tell which paths the ticket touches, say so and list all in-progress items with their top-level folders.

## 7. Lockfile (warning)

Warn "this ticket will likely change `pnpm-lock.yaml`; lockfile changes must not run in parallel" when the ticket text mentions a new dependency or package, `package.json`, `pnpm install`/`pnpm add`, `pnpm-lock.yaml`, a Node/pnpm version change, or a new workspace package (a new folder under `packages/` or `tools/`). Also list any in-progress item from step 6 that already changes `pnpm-lock.yaml`; if both are true, say it is better to wait for that one to merge.

## 8. Create the worktree and branch

Only when steps 1–5 all passed.

```sh
root="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"   # main checkout, also from inside a worktree
dir="$root/.claude/worktrees/<code>-<nn>-<slug>"
git worktree add --no-track -b "claude/<code>-<nn>-<slug>" "$dir" origin/main
```

`.claude/worktrees/` is ignored by git. If the folder already exists, stop and say so. Then check the branch name with the same rule CI uses (the bin only needs Node, no install):

```sh
cd "$dir" && node tools/path-check/src/bin.ts --branch "claude/<code>-<nn>-<slug>" --base origin/main
```

It must print `branch name check passed: … (ticket <path>)`. If it fails, remove what you made (`git worktree remove "$dir"` and `git branch -D "claude/<code>-<nn>-<slug>"`) and report the error. Do not push.

## 9. Report

One short block:

- ticket path, Owner, Status
- blockers and how each was proven merged (PR number or commit)
- overlap warnings and the lockfile warning, or "none"
- worktree path and branch, path check result
- next step: work in that folder (open a Claude Code session there, or `cd` into it), then `corepack pnpm install --frozen-lockfile` before the first build or test

On a stop, the block lists every failed check with its reason and says that nothing was created.

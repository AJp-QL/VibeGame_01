# CA-04 — `/start-ticket` skill

**Owner:** claude

**What to build:** The maintainer types `/start-ticket <CODE>-<NN>` and the session runs the "start a ticket" rules from AGENTS.md: the ticket file exists and says `Owner: claude`; every `Blocked by:` ticket is merged (its `Status:` and PR state on GitHub); in-progress tickets that touch the same paths are listed (whoever merges second merges `origin/main` first); a warning if the ticket will likely change `pnpm-lock.yaml`; then a worktree from `origin/main` on `claude/<code>-<NN>-<slug>`. User-only skill (`disable-model-invocation: true`) under `.claude/skills/`. It stops and explains when a check fails. Spec: `.scratch/claude-automation/spec.md`.

**Blocked by:** CA-01

**Status:** done

- [x] refuses a Codex-owned ticket, a missing ticket file and an unmerged blocker, each with the reason
- [x] lists overlapping in-progress tickets and warns about lockfile changes
- [x] creates the worktree and branch; the branch name passes the path check's branch-name rule
- [x] manual dry run on a real ticket written in the PR description
- [x] path check passes

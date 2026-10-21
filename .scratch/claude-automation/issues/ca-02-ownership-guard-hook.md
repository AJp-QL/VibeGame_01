# CA-02 — Ownership guard hook

**Owner:** claude

**What to build:** Before Claude edits a file in the repo, a PreToolUse hook (Edit/Write/NotebookEdit) checks the current branch and the file's category with the same classification code as CI's path check. On a `claude/*` branch, `claude`, `claudeOnly` and `shared` files pass; `codex` files are blocked with a hint to file an `Owner: codex` ticket; unclassified paths are blocked with a hint to add them to `ownership.json`. On `main` or any non-`claude/*` branch every edit is blocked with a hint to use a worktree on a ticket branch. Files outside the repo pass. If git or `ownership.json` can't be read, it allows the edit and warns on stderr. Works in worktrees and with Windows paths.

Build it as a new workspace tool `@mt/claude-hooks` (depends on `@mt/path-check`, reuses its classification and branch rules; export anything missing from path-check additively), run with `node` like path-check's bin, `guard` subcommand. Register it in the shared project settings under `.claude/`. Hook contract and test cases: spec `.scratch/claude-automation/spec.md` (Implementation / Testing Decisions).

Adds a workspace package, so `pnpm-lock.yaml` changes: don't run in parallel with other lockfile work.

**Blocked by:** CA-01

**Status:** ready-for-agent

- [ ] `guard` reads hook JSON on stdin; exit 0 = allow, exit 2 = block with message on stderr
- [ ] CLI tests in a temp git repo cover: claude/claudeOnly/shared allowed, codex blocked, unclassified blocked, `main` and `codex/*` blocked, outside-repo allowed, backslash path same verdict, missing `ownership.json` allows with warning, worktree root resolution
- [ ] no glob logic copied from path-check; path-check exports changed additively only
- [ ] hook registered in shared project settings; manual check: an edit to a Codex path in a real session is refused
- [ ] `tools/README.md` status list mentions the new tool
- [ ] typecheck, test, build, path check pass; ENGINE_VERSION unchanged

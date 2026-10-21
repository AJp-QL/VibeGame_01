# CA-03 — ENGINE_VERSION reminder hook

**Owner:** claude

**What to build:** When Claude is about to end a turn, a Stop hook warns once if the branch (diff from the merge-base with `origin/main`, plus uncommitted changes) changes engine source (not tests or docs) or `data/` without changing the `ENGINE_VERSION` file. The message reminds Claude to bump in the same commit as the rules change and to list the `Owner: codex` "refresh visual fixtures and baselines" follow-up ticket. When `stop_hook_active` is true it stays silent, so it can never loop. Add it as the `engine-version` subcommand of `@mt/claude-hooks` and register it in the shared project settings. Spec: `.scratch/claude-automation/spec.md`.

**Blocked by:** CA-02

**Status:** done

- [x] engine source changed without version → exit 2 with reminder (mentions fixture-refresh ticket)
- [x] version changed, or only engine tests/docs changed → exit 0
- [x] only `data/` changed → exit 2; uncommitted engine change counts
- [x] `stop_hook_active: true` → exit 0
- [x] CLI tests in a temp git repo cover the cases above
- [x] typecheck, test, build, path check pass; ENGINE_VERSION unchanged

**Notes:** Whether project hooks load for this account (managed `allowManagedHooksOnly: true`) is still unproven. In the CA-03 desktop session, plugin hooks ran (SessionStart, PreToolUse) although managed settings force-enable no plugin, which suggests the policy is not applied there. A probe Write to `packages/web/` was not blocked, but that session's hook snapshot predates the guard (#81), so the probe is inconclusive. Check in a fresh desktop session.

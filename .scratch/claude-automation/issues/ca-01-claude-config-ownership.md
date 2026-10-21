# CA-01 — Classify `.claude/**` as Claude-only

**Owner:** claude

**What to build:** Shared Claude Code config (project settings, skills, agents) can be committed. Today `.claude/` is not in `.github/ownership.json`, so any tracked file under it fails the path check. Add `.claude/**` to `claudeOnly`: `claude/*` branches may change it, `codex/*` branches may not. Spec: `.scratch/claude-automation/spec.md`. Local settings (tag/push permissions) stay uncommitted.

**Blocked by:** None — can start immediately

**Status:** done

- [x] `.claude/**` classified `claudeOnly`; every tracked file still matches exactly one list
- [x] path-check test: a `.claude/settings.json` change passes on a `claude/*` branch and fails on a `codex/*` branch
- [x] personal local settings stay ignored (not committed)
- [x] AGENTS.md ownership summary table mentions `.claude/`
- [x] typecheck, test, build, path check pass; ENGINE_VERSION unchanged

**Notes:** The branch-name rule in `tools/path-check` only accepted `P<N>…` phase codes, so `claude/ca-NN-…` branches failed CI. It now accepts any phase code from `docs/agents/issue-tracker.md` (kinds like `docs-12-…` are matched first). `.gitignore` now also ignores `.claude/settings.local.json`; `.claude/worktrees/` was already ignored.

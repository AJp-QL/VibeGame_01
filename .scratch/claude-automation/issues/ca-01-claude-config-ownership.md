# CA-01 — Classify `.claude/**` as Claude-only

**Owner:** claude

**What to build:** Shared Claude Code config (project settings, skills, agents) can be committed. Today `.claude/` is not in `.github/ownership.json`, so any tracked file under it fails the path check. Add `.claude/**` to `claudeOnly`: `claude/*` branches may change it, `codex/*` branches may not. Spec: `.scratch/claude-automation/spec.md`. Local settings (tag/push permissions) stay uncommitted.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `.claude/**` classified `claudeOnly`; every tracked file still matches exactly one list
- [ ] path-check test: a `.claude/settings.json` change passes on a `claude/*` branch and fails on a `codex/*` branch
- [ ] personal local settings stay ignored (not committed)
- [ ] AGENTS.md ownership summary table mentions `.claude/`
- [ ] typecheck, test, build, path check pass; ENGINE_VERSION unchanged

# CA-05 — `/pr-preflight` skill

**Owner:** claude

**What to build:** The maintainer types `/pr-preflight` and the session runs the same checks as CI before a PR: frozen-lockfile install, typecheck, test, build, path check with the real branch, and `check-replays` (exit 3 = stale fixtures, reported as such, not as a bug). The Board visual tests are Linux-only, so on Windows they are reported as skipped. It checks the ENGINE_VERSION rule (engine/data change ⇒ bump + `Owner: codex` fixture-refresh ticket listed), then opens the PR titled `[<CODE>-<NN>] …` (or by the branch's kind for non-ticket work) with each command run and its result. It never merges. User-only skill under `.claude/skills/`. Spec: `.scratch/claude-automation/spec.md`.

**Blocked by:** CA-01

**Status:** done

- [x] runs every check from AGENTS.md Commands and reports each result
- [x] check-replays exit 3 reported as stale; visual tests reported skipped on Windows
- [x] stops before the PR when a check fails or the ENGINE_VERSION rule is broken
- [x] PR title and description follow the workflow rule; no merge
- [x] manual dry run written in the PR description
- [x] path check passes

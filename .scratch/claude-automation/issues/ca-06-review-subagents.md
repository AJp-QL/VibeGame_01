# CA-06 — `contract-guard` and `determinism-reviewer` subagents

**Owner:** claude

**What to build:** Two read-only reviewer subagents under `.claude/agents/` (Read, Grep, Glob, and Bash for `git diff` only), each returning a verdict plus file:line findings.

- `contract-guard`: flags any rename, removal or change of meaning of exported names in the engine public interface, `packages/shared` and `@mt/session` (incl. re-exports); player-facing text added to `session`; UI code importing `@mt/engine` / `@mt/ai` directly.
- `determinism-reviewer`: says whether the diff changes state, events, dice order or accepted/rejected actions for the same data + Dice Seed, i.e. whether ENGINE_VERSION must be bumped.

Spec: `.scratch/claude-automation/spec.md`.

**Blocked by:** CA-01

**Status:** ready-for-agent

- [ ] both agents have read-only tools and a clear verdict format
- [ ] dry run of `contract-guard` on a past PR that changed `@mt/session`, written in the PR description
- [ ] dry run of `determinism-reviewer` on a past rules PR (one that bumped ENGINE_VERSION) gives "bump needed"
- [ ] path check passes

# CA-07 — Point AGENTS.md at the automation

**Owner:** claude

**What to build:** Agents and the maintainer reading AGENTS.md learn the automation exists: a few short lines in Workflow/Commands naming the ownership guard and ENGINE_VERSION reminder hooks, the `/start-ticket` and `/pr-preflight` skills, and the `contract-guard` / `determinism-reviewer` subagents, and saying CI's path check stays the source of truth. Last ticket so the parallel tickets don't conflict in AGENTS.md.

**Blocked by:** CA-02, CA-03, CA-04, CA-05, CA-06

**Status:** ready-for-agent

- [ ] AGENTS.md mentions all hooks, skills and subagents in at most a few lines
- [ ] wording says the guard is a convenience; CI path check is the source of truth
- [ ] path check passes

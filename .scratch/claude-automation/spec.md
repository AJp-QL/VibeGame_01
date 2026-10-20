# Claude Code automation: hook กันแก้ path ผิดเจ้าของ, เตือน ENGINE_VERSION, skill เริ่ม ticket / ตรวจก่อน PR, subagent ตรวจ contract

**Status:** ready-for-agent

ที่มา: ผล `/claude-automation-recommender` (2026-10-20) ใน session นี้ ศัพท์ตาม `AGENTS.md`, `CONTEXT.md`, ADR 0004 (ownership) และ `docs/agents/issue-tracker.md`

## Problem Statement

กติกาการทำงานของ repo นี้อยู่ใน `AGENTS.md` เป็นข้อตกลงที่ไม่มีอะไรบังคับระหว่างที่ Claude ทำงาน มีแค่ CI ที่จับได้หลัง push:

- Claude session แก้ path ของ Codex (`packages/battle`, `packages/web`, `art/`) หรือสร้าง top-level path ใหม่ที่ยังไม่อยู่ใน `.github/ownership.json` ได้โดยไม่มีอะไรห้าม รู้ตัวตอน path check ใน CI fail ต้องย้อนแก้ commit
- rules ticket ที่เปลี่ยนผลของ engine (state, events, ลำดับลูกเต๋า, action ที่รับ/ปฏิเสธ) ลืม bump `ENGINE_VERSION` ได้ ทำให้ Replay fixture และ visual fixture stale โดยไม่มีใครเห็น และลืมเขียน ticket `Owner: codex` "refresh visual fixtures and baselines"
- การเริ่ม ticket มีขั้นตอนหลายข้อ (ticket file มีจริง, `Blocked by:` merge แล้ว, ดู path ที่ ticket อื่นกำลังแก้, worktree จาก `origin/main`, ชื่อ branch `claude/<code>-<NN>-<slug>`) ผู้ดูแลต้องพิมพ์สั่งเองทุกครั้งและพลาดง่าย
- ก่อนเปิด PR ต้องรันคำสั่งชุดเดียวกับ CI ทั้ง typecheck, test, build, path check, check-replays และใส่รายการใน PR description ทำมือทุกครั้ง
- การเปลี่ยน contract (engine public interface, type ใน `packages/shared`, API ของ `@mt/session` รวม re-export) ต้องเป็นแบบเพิ่มอย่างเดียว ไม่มีตัวตรวจเฉพาะทาง
- `.claude/` ยังไม่อยู่ใน `ownership.json` จึง commit config ของ Claude Code ที่ใช้ร่วมกันไม่ได้ (path check จะ fail)

## Solution

- **Ownership guard (PreToolUse hook บน Edit/Write)**: ก่อน Claude แก้ไฟล์ใน repo hook ดู branch ปัจจุบันและ category ของไฟล์จาก `ownership.json` (กติกาเดียวกับ path check ใน CI) ถ้าไฟล์ไม่อยู่ในสิทธิ์ของ `claude/*` หรือยังไม่ถูกจัด category ให้ block พร้อมข้อความบอกเหตุผลและทางแก้ (เขียน ticket `Owner: codex` / เพิ่มใน `ownership.json`)
- **ENGINE_VERSION reminder (Stop hook)**: ตอน Claude จะจบ turn ถ้า diff ของ branch เทียบ `origin/main` แตะ engine source หรือ `data/` แต่ไม่แตะไฟล์ `ENGINE_VERSION` ให้เตือนหนึ่งครั้งพร้อมถามเรื่อง ticket refresh visual fixture
- **Skill `start-ticket`** (ผู้ใช้เรียกเท่านั้น): รับ ticket ID แล้วตรวจเงื่อนไขเริ่ม ticket ทั้งหมดตาม `AGENTS.md` แล้วสร้าง worktree + branch
- **Skill `pr-preflight`** (ผู้ใช้เรียกเท่านั้น): รันคำสั่งตรวจชุดเดียวกับ CI ตรวจกฎ ENGINE_VERSION แล้วเปิด PR ชื่อ `[<CODE>-<NN>] …` พร้อมรายการคำสั่งที่รัน
- **Subagent `contract-guard`**: ตรวจ diff ว่า contract เปลี่ยนแบบเพิ่มอย่างเดียว, `session` ไม่มีข้อความที่ผู้เล่นเห็น, โค้ด UI ไม่ import `@mt/engine` / `@mt/ai` ตรง
- **Subagent `determinism-reviewer`**: ตรวจ rules change ว่าเปลี่ยนผลของ engine หรือไม่ เพื่อตัดสินว่าต้อง bump `ENGINE_VERSION`
- **`ownership.json`**: เพิ่ม `.claude/**` เข้า `claudeOnly`

## User Stories

1. As a Claude session, I want an edit to a Codex-owned file to be blocked before it happens, so that I never push a branch that fails the path check.
2. As a Claude session, I want the block message to say which category the file is in and which branch rule it breaks, so that I understand the refusal without reading `ownership.json`.
3. As a Claude session, I want the block message to tell me to file an `Owner: codex` ticket instead, so that cross-side work follows the two-ticket rule.
4. As a Claude session, I want a new top-level path that is not yet classified to be blocked with a hint to add it to `ownership.json` first, so that I fix the classification in the same PR.
5. As a Claude session, I want edits to `claude`, `claudeOnly` and `shared` paths on a `claude/*` branch to pass without any prompt, so that the guard adds no friction to normal work.
6. As a Claude session, I want edits outside the repo (scratchpad, memory, other folders) to pass untouched, so that the guard only governs the repo.
7. As a Claude session, I want edits made while the checkout is on `main` or any non-`claude/*` branch to be blocked with a hint to work in a worktree on a ticket branch, so that I never edit the main checkout others may share.
8. As a Claude session on Windows, I want paths with backslashes and drive letters to be classified the same as on Linux, so that the guard behaves identically on every machine.
9. As a Claude session in a git worktree, I want the guard to resolve the repo root of that worktree, so that files are classified relative to the right root.
10. As a maintainer, I want the guard to use exactly the same classification code as CI's path check, so that the guard and CI never disagree.
11. As a maintainer, I want the guard to fail open (allow, with a warning on stderr) when it cannot read git or `ownership.json`, so that a broken tool never locks a session.
12. As a Claude session, I want a reminder before I finish a turn when my branch changes engine source or `data/` but not `ENGINE_VERSION`, so that I bump the version in the same commit as the rules change.
13. As a Claude session, I want that reminder to mention the `Owner: codex` "refresh visual fixtures and baselines" follow-up ticket, so that stale fixtures get a ticket.
14. As a Claude session, I want the reminder to fire at most once per stop, so that I am never stuck in a loop when the change truly does not affect results.
15. As a Claude session, I want no reminder when engine changes are tests or docs only, so that the reminder stays meaningful.
16. As a Claude session, I want no reminder when `ENGINE_VERSION` was already changed on the branch, so that compliant work is silent.
17. As a maintainer, I want to type `/start-ticket P1X-38` and have the session check the ticket file exists and has `Owner: claude`, so that Claude never picks up a Codex ticket.
18. As a maintainer, I want `/start-ticket` to refuse when any `Blocked by:` ticket is not merged, so that blocked work does not start early.
19. As a maintainer, I want `/start-ticket` to list in-progress tickets that touch the same paths, so that I know who merges `origin/main` second.
20. As a maintainer, I want `/start-ticket` to create a worktree from `origin/main` on `claude/<code>-<NN>-<slug>`, so that the branch name passes the path check.
21. As a maintainer, I want `/start-ticket` to warn when the ticket will likely change `pnpm-lock.yaml`, so that lockfile changes do not run in parallel.
22. As a maintainer, I want `/pr-preflight` to run install, typecheck, test, build, path check (with the real branch) and check-replays, so that the PR is green before CI sees it.
23. As a maintainer, I want `/pr-preflight` to read check-replays exit code 3 as "stale" and say so, so that I know a fixture refresh is needed rather than a bug.
24. As a maintainer on Windows, I want `/pr-preflight` to say the Board visual tests were skipped because they are Linux-only, so that the PR description stays honest.
25. As a maintainer, I want `/pr-preflight` to open the PR with title `[<CODE>-<NN>] …` and the list of commands run and their results, so that the PR follows the workflow rule.
26. As a maintainer, I want `/pr-preflight` never to merge, so that merge stays a separate decision after green CI.
27. As a reviewer, I want `contract-guard` to flag any rename, removal or meaning change of exported engine, `packages/shared` or `@mt/session` names, so that the additive-only contract holds.
28. As a reviewer, I want `contract-guard` to flag player-facing text added to `session`, so that UI text stays in `packages/web`.
29. As a reviewer, I want `contract-guard` to flag UI code importing `@mt/engine` or `@mt/ai` directly, so that the dependency direction holds.
30. As a reviewer, I want `determinism-reviewer` to say whether a diff changes state, events, dice order or accepted/rejected actions for the same data + Dice Seed, so that the bump decision is explicit.
31. As a reviewer, I want both subagents to be read-only, so that review never edits code.
32. As a maintainer, I want `.claude/**` classified as `claudeOnly`, so that shared Claude Code config can be committed and Codex branches cannot change it.
33. As a Codex agent, I want none of this to change my workflow or my paths, so that the split in ADR 0004 is unchanged.
34. As a maintainer, I want the hooks committed in the shared project settings, so that every Claude session in every worktree gets them.
35. As a maintainer, I want personal settings (like the tag-push permissions) to stay in the local settings file, so that shared config does not grant release permissions.

## Implementation Decisions

- **Ticket order**: ownership entry `.claude/**` → `claudeOnly` comes first (alone or with the hooks ticket). Everything else that lives under `.claude/` depends on it.
- **New tool package `@mt/claude-hooks` under `tools/`** (Claude-owned path, workspace package like `@mt/path-check`). It depends on `@mt/path-check` and reuses its exported `loadOwnership` and `classify` plus the branch rules. It does not copy glob logic. If a needed piece (e.g. "which categories may branch X change") is not exported, export it from path-check additively.
- **One bin, two subcommands**: `guard` (PreToolUse) and `engine-version` (Stop). Run with `node` directly (Node 24 strips types), same as path-check's bin, so it works on Windows, Linux and in CI without bash or PowerShell.
- **Hook contract (the test seam)**: input is Claude Code's hook JSON on stdin; output is the process exit code plus stderr text.
  - `guard`: reads `tool_input.file_path` and `cwd`. Exit 0 = allow. Exit 2 = block; stderr is the message Claude sees. Unexpected errors → exit 0 with a warning (fail open).
  - Repo root = `git rev-parse --show-toplevel` from the file's directory (works in worktrees). File outside the root → allow. Path normalised to repo-relative forward slashes before `classify`.
  - Branch = `git branch --show-current`. Not `claude/*` → block (hint: worktree + ticket branch). `claude/*` → allowed categories are `claude`, `claudeOnly`, `shared`; `codex` → block (hint: `Owner: codex` ticket); unclassified (`classify` returns null) → block (hint: add to `ownership.json`). The guard does not check the branch *name* format; `pr-preflight` and CI do.
  - `engine-version`: reads `stop_hook_active`; if true → exit 0 (no loop). Otherwise gets changed files from merge-base with `origin/main` plus uncommitted changes. Triggers when any changed file is engine source (not tests) or under `data/`, and the `ENGINE_VERSION` file is not changed → exit 2 with the reminder. Else exit 0.
- **Settings**: hooks registered in the shared project settings under `.claude/`, matcher `Edit|Write|NotebookEdit` for `guard`, Stop for `engine-version`. Existing local settings (tag/push permissions) stay local.
- **Skills** `start-ticket` and `pr-preflight` live under `.claude/skills/`, both with `disable-model-invocation: true`. They are instructions only; they call existing commands (`git`, `gh`, path-check bin, simulator `check-replays`) and the ticket conventions in `docs/agents/issue-tracker.md`. `start-ticket` checks "merged" by the `Blocked by:` ticket's `Status:` and its PR state on GitHub.
- **Subagents** `contract-guard` and `determinism-reviewer` live under `.claude/agents/`, read-only tools (Read, Grep, Glob, Bash for `git diff` only). Each returns a verdict plus file:line findings.
- **Ownership**: the new package path is under `tools/**` (already `claude`). `.claude/**` is the only new classification.
- **No engine change**: nothing here touches engine behaviour, so no `ENGINE_VERSION` bump and no visual-fixture ticket.
- Docs: `AGENTS.md` Commands/Workflow gets one short line pointing at the two skills and saying the hooks exist; `tools/README.md` status list gets the new tool.

## Testing Decisions

- A good test drives the hook the way Claude Code does: spawn the bin with a hook JSON on stdin inside a throwaway git repo (temp dir, `git init`, a small `ownership.json`, a chosen branch, committed and uncommitted files), then assert only on exit code and stderr content. No tests of internal helpers; path-check already covers classification.
- `guard` cases: claude branch + claude/claudeOnly/shared file → 0; claude branch + codex file → 2 mentioning codex ticket; unclassified new top-level path → 2 mentioning `ownership.json`; `main` and `codex/*` branch → 2; file outside repo → 0; Windows-style backslash path → same verdict as forward slash; missing `ownership.json` → 0 with warning; worktree root resolution (a `git worktree add` in the temp repo).
- `engine-version` cases: engine source changed without version → 2; with version changed → 0; only engine tests/docs changed → 0; only `data/` changed → 2; `stop_hook_active: true` → 0; uncommitted engine change counts.
- Prior art: `@mt/path-check` tests (vitest, run the bin with `execFileSync`, assert results) and the simulator's `check-replays` exit-code contract.
- Runs under the root `pnpm test` (vitest workspace), on Windows locally and Linux in CI.
- Skills and subagents are markdown: no automated tests. Acceptance is one manual dry run each, written in the PR description.

## Out of Scope

- MCP servers (context7, Cloudflare API MCP): user-level config, not in the repo.
- PostToolUse `vitest related` hook and format/lint hooks (no Prettier/ESLint in the repo).
- Branch-name enforcement inside the guard (CI and `pr-preflight` cover it).
- Any Codex-side tooling or changes to `docs/agents/codex.md`.
- Auto-merge, tagging or release automation.
- Changing path-check rules or CI jobs.

## Further Notes

- The phase code for tickets made from this spec is not chosen yet; add one to the table in `docs/agents/issue-tracker.md` when the tickets are written (a `claude/spec-…` or `claude/docs-…` branch for this spec itself).
- The guard is a convenience, not security: CI's path check stays the source of truth.
- Hook stdin field names (`tool_input.file_path`, `cwd`, `stop_hook_active`) come from Claude Code's hook docs as of 2026-10; check them when building.

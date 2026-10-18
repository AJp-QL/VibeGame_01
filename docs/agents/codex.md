# Codex cloud

Codex cloud owns graphics and UI (ADR 0004). This file has two parts: setup steps for the human, and rules for the Codex agent. Shared rules (ownership, contract, workflow, commands) are in `AGENTS.md`; this file only adds Codex specifics.

## ส่วนที่ 1: ขั้นตอนที่ผู้ใช้ต้องทำ (ครั้งเดียว)

ข้อมูลจากเอกสารทางการของ OpenAI (ตรวจ 2026-10-16):
- Cloud environments (แบบปัจจุบัน): https://developers.openai.com/codex/environments/cloud-environments
- Codex Cloud (Legacy) environments (setup script, internet ตอน setup): https://developers.openai.com/codex/cloud/environments
- ภาพรวม Codex Cloud: https://learn.chatgpt.com/docs/cloud
- AGENTS.md: https://developers.openai.com/codex/agent-configuration/agents-md

### 1. เชื่อม repo และสร้าง environment

1. เปิด Codex (เว็บหรือ desktop app) ด้วยบัญชี ChatGPT → **Work in** > **Cloud** > **Select environment** > **Create environment** (หรือ **Settings** > **Codex Cloud** > **Environments** > **Create environment**)
2. เลือก repo GitHub `AJp-QL/VibeGame_01` (ถ้าถูกถามให้ **Connect GitHub** และให้สิทธิ์ repo นี้)
3. กด **Get started** Codex จะตรวจ repo ติดตั้ง dependency และทดสอบเอง แล้วบันทึกผลเป็น **Install script** ระหว่างนั้นบอก Codex ว่า:
   - ใช้ **Node.js 24** (ตรงกับ `engines` ใน `package.json` และ CI)
   - install script ต้องเป็นตามข้อ 2 ด้านล่าง
4. ตรวจ setup report และ install script ให้ตรง แล้วกด **Publish** (หลังแก้ภายหลัง: environment → **…** > **Edit** → **Republish**)

ถ้าใช้หน้า Legacy (Settings > Environments แบบเก่า): ตั้ง Node.js 24 ที่ **Set package versions** แล้ววาง script ข้อ 2 ในช่อง setup script

### 2. Install script

```sh
corepack enable
pnpm install --frozen-lockfile
```

ถ้า `corepack enable` ไม่ได้รับอนุญาต (เขียน shim ไม่ได้) ใช้แทน:

```sh
npx --yes pnpm@12.11.2 install --frozen-lockfile
```

(เวอร์ชัน pnpm ต้องตรงกับ `packageManager` ใน `package.json`) ตามเอกสาร install/setup script รันโดยมี internet ส่วนช่วงที่ agent ทำงาน internet ปิดเป็นค่าเริ่มต้น งานของ repo นี้ (typecheck, test, build, path check) ไม่ต้องใช้ internet หลังติดตั้งแล้ว จึง **ปิด internet ของ agent ไว้** ได้ ถ้าวันหน้าต้องใช้ (เช่นดาวน์โหลด headless browser ใน ticket 25) ให้เปิด **Allow Codex to access internet** แบบ **Package managers** หรือ **Custom domains only** เฉพาะโดเมนที่ต้องใช้ หรือติดตั้งใน install script แทน

Codex อ่าน `AGENTS.md` ที่ root ของ repo เองก่อนเริ่มงานทุกครั้ง (ใช้หาคำสั่ง test) ไม่ต้องตั้งอะไรเพิ่ม AGENTS.md ต้องไม่เกิน 32 KiB (`project_doc_max_bytes` ค่าเริ่มต้น)

### 3. ชื่อ branch `codex/`

CI ตรวจชื่อ branch: งานของ Codex ต้องเป็น `codex/<code>-<NN>-<slug>` ตาม ID ของ ticket (เช่น `codex/p1x-24-action-plan-ui` สำหรับ P1X-24) และต้องมีไฟล์ ticket นั้นใน repo ชื่ออื่นไม่ผ่าน (decision log 2026-10-18, `docs/agents/issue-tracker.md`)
- เอกสารทางการไม่มี setting สำหรับตั้ง prefix ของ branch ใน Codex cloud (ค้นแล้วไม่พบ 2026-10-16) ผู้ใช้ใน community รายงานว่า Codex cloud ตั้งชื่อ `codex/<คำอธิบาย>` เองและเปลี่ยนไม่ได้ (ไม่ใช่เอกสารทางการ: https://community.openai.com/t/branch-naming-is-there-any-way-to-set-it/1315157) ซึ่งตรงกับที่ CI ต้องการ
- กันไว้: ใส่ในทุก task ว่า `Use a branch named codex/<code>-<NN>-<slug> exactly.` และก่อน merge ตรวจชื่อ head branch ของ PR ถ้าไม่ตรง ให้ Codex push commit เดิมไป branch ชื่อที่ถูกแล้วเปิด PR ใหม่

### 4. สั่งงาน Codex

prompt ตัวอย่าง (ใส่ ID ของ ticket ทุกครั้ง):

> Do ticket P1X-24: `.scratch/phase-1x-playtest-feedback/issues/p1x-24-action-plan-ui.md`. Follow `AGENTS.md` and `docs/agents/codex.md`. Use a branch named `codex/p1x-24-action-plan-ui` exactly, put `[P1X-24]` at the start of the PR title, run all checks, then open a PR to `main`.

(ticket แรกของ Codex คือ P1-24 `.scratch/phase-1-battle-slice/issues/24-split-app-tsx.md` บน branch `codex/24-split-app-tsx` ก่อนมีกฎ ID)

### 5. หลัง Codex เปิด PR

1. รอ CI เขียวทั้งสาม job (Typecheck, test, build / Path ownership check / Board visual regression) ถ้า job ภาพขึ้นคำเตือน "Visual fixtures are stale" จะยังเขียว แต่ไม่ได้เทียบภาพ ให้เปิด ticket สร้าง fixture ใหม่ตาม AGENTS.md
2. ให้ Claude review: เปิด Claude Code แล้วสั่ง `/code-review` กับ PR นั้น
3. ผู้ใช้กด merge เอง (ช่วงแรก) เมื่อ CI เขียวและ review ผ่าน

### `gh` (GitHub CLI)

ติดตั้งแล้วที่ `C:\Program Files\GitHub CLI\gh.exe` (gh 2.x) และ login เป็น `AJp-QL` แล้ว ถ้าต้อง login ใหม่: `gh auth login` (GitHub.com → HTTPS → login with a web browser) Claude ใช้ `gh pr checks <n>` ดู CI และ `gh pr merge <n>` merge PR ของตัวเอง

## Part 2: Rules for the Codex agent

### Scope

You own (`codex` in `.github/ownership.json`): `packages/battle/**` (Phaser), `packages/web/**` (React components, styles, all player-facing text, `wrangler.jsonc`), `art/**`. You may also edit `.scratch/**` (ticket status, comments) and `pnpm-lock.yaml` (only when your own `package.json` dependencies change).

### Do not touch

Everything else — in particular `packages/engine`, `packages/shared`, `packages/session`, `packages/ai`, `tools/`, `data/`, `docs/`, `.github/`, root config (`package.json`, `pnpm-workspace.yaml`, `tsconfig*.json`, `vitest.config.ts`), `AGENTS.md`, `CONTEXT.md`. The path check fails the PR if you do. Import engine names only through `@mt/session`, never `@mt/engine` / `@mt/ai` directly.

New dependency: add it to your package's `package.json` with an exact or caret version (the shared `catalog:` lives in `pnpm-workspace.yaml`, which is Claude-only). `pnpm-workspace.yaml` sets `minimumReleaseAge` (14 days): pick a version at least 14 days old or install will fail.

### Checks (run all before opening a PR)

```sh
pnpm install --frozen-lockfile        # or: corepack pnpm …
pnpm typecheck
pnpm test
pnpm build
node tools/path-check/src/bin.ts --branch "$(git branch --show-current)" --base origin/main
```

แก้ `packages/web` หรือ `packages/battle` ที่เปลี่ยนภาพบน Board ให้รัน test ภาพด้วย (Linux เท่านั้น, ดู `packages/web/visual/README.md`): `pnpm --filter @mt/web exec playwright install --with-deps chromium` แล้ว `pnpm --filter @mt/web test:visual` CI รัน job นี้ให้ทุก push

If `origin/main` is missing in the container, use `--base main` or fetch it first. `packages/web/test/uiStrings.test.ts` scans `packages/web/src`, `packages/battle/src` and `packages/session/src` and fails on visible text written into code — put player-facing text in the string table `packages/web/src/strings.ts`.

### Requesting a contract change

The engine public interface, `packages/shared` types and the `@mt/session` API are Claude's and change additively only. If you need something new (a snapshot field, a command, a re-export):
1. Create `.scratch/<feature>/issues/<NN>-<slug>.md` with `**Owner:** claude`, `**Status:** needs-triage`, what you need and why (the UI behaviour it enables).
2. Mark your UI ticket `**Blocked by:** <NN>` and stop that part of the work. Do not work around it by importing `@mt/engine` or duplicating rules logic in the UI.

### PR description

- Link the ticket file (`.scratch/…/issues/NN-….md`) and tick its checkboxes in the same PR; set its `Status:` to `done` only if every box is ticked.
- List the checks you ran and their result (test count).
- Visual changes: attach screenshots (desktop and 360 px mobile width).
- No behaviour change unless the ticket asks for it; say so explicitly for refactors.

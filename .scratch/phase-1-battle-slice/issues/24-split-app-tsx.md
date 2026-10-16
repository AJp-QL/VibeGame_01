# 24 — แตก App.tsx เป็น component ย่อย (ไม่เปลี่ยนพฤติกรรม)

**Owner:** codex

**What to build:** แตก `packages/web/src/App.tsx` (~1,450 บรรทัด) เป็น component และ module ย่อยที่แต่ละไฟล์ทำเรื่องเดียว (เช่น หน้าจอ Battle, แผงข้อมูล Unit, ปุ่ม action, log, หน้าสรุปผล, hook ที่ต่อกับ `@mt/session`) โดยพฤติกรรมเดิมทุกอย่าง: ผู้เล่นเห็นและกดได้เหมือนเดิมทุกหน้าจอ เป็นงานแรกของ Codex จึงใช้ทดสอบขั้นตอนทั้งวง: branch `codex/` → PR → CI → Claude review (`/code-review`) → ผู้ใช้ merge (decision log 2026-10-16 "งานแรกของ Codex") ขอบเขตอยู่ใน `packages/web/**` เท่านั้น ถ้าพบว่าต้องการอะไรเพิ่มจาก `@mt/session` ให้เปิด ticket `Owner: claude` แทนการแก้เอง (`docs/agents/codex.md`)

**Blocked by:** None — can start immediately

**Status:** in-progress

- [x] `App.tsx` เหลือเป็นตัวประกอบหน้าจอ (routing ระหว่างเมนู / Battle / Replay / วิธีเล่น) ส่วนอื่นย้ายไปไฟล์ใหม่ใน `packages/web/src/` ไม่มีไฟล์ใหม่ที่ยาวเกิน ~400 บรรทัด
- [x] ไม่เปลี่ยนพฤติกรรม: ไม่แก้ logic, ข้อความ, style หรือลำดับการเรียก `@mt/session`; ระบุใน PR ว่าเป็น refactor ล้วน
- [x] test เดิมของ web ผ่านทั้งหมดโดยไม่แก้ assertion (แก้ได้แค่ path ของ import ถ้า test import ไฟล์ที่ย้าย)
- [x] ไม่มีข้อความที่ผู้เล่นเห็นฝังในโค้ดใหม่: `packages/web/test/uiStrings.test.ts` ผ่าน ข้อความยังมาจาก `src/strings.ts`
- [x] import ชื่อจาก engine ผ่าน `@mt/session` เท่านั้น (ไม่ import `@mt/engine` / `@mt/ai` ตรง)
- [x] `pnpm typecheck`, `pnpm test`, `pnpm build` ผ่าน และ bundle build ได้
- [ ] PR มาจาก branch `codex/24-…` และ CI ผ่านทั้งสอง job รวม path check (แก้เฉพาะ `packages/web/**` และ `.scratch/**`)
- [ ] PR description ลิงก์ ticket นี้ บอกคำสั่งที่รันพร้อมจำนวน test และมี screenshot เมนูกับหน้าจอ Battle (desktop และกว้าง 360 px) ก่อน/หลังที่เหมือนกัน

## Comments

- Implemented on `codex/24-split-app-tsx`: `App.tsx` is now a 76-line screen composer. Battle UI, display helpers, screen creation/export helpers, and session effects live in focused modules; the largest new file is 230 lines.
- Existing web test assertions are unchanged. Imports and the source-file reference for the result feedback-link assertion follow the moved code.
- Local validation: frozen-lockfile install, typecheck, all tests (743 passed, 1 skipped), production build, and whitespace checks passed. Path ownership also passed against the committed branch (28 changed files, all allowed for `codex/*`).
- [Before/after screenshots and browser comparison](../evidence/24-split-app-tsx/README.md): menu and Battle pairs are pixel-identical at desktop and 360 px widths.
- Additional Chromium checks passed: a Hotseat Battle reached its result and recorded exactly one finished Battle; the extracted AI hook completed a scheduled AI Turn and returned controls to human Turn 2. No browser page errors.
- PR creation and hosted CI verification remain pending: the current network policy rejects CONNECT to `api.github.com` with HTTP 403. The required domain addition has been saved to the environment configuration draft; it must be applied before the GitHub CLI can create the PR and inspect both CI jobs. Keep this ticket in progress until the remaining PR/CI checklist items are verified.

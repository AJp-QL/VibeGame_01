# 25 — test เทียบภาพ screenshot ของ skill visuals

**Owner:** codex

**What to build:** test แบบ visual regression ที่เปิดเกมใน headless browser (เช่น Playwright + Chromium) พา Battle ไปยังสถานะที่กำหนดได้ซ้ำทุกครั้ง แล้วเทียบ screenshot ของ Board กับภาพ baseline ที่ commit ไว้ ครอบคลุม visual ที่ยังไม่เคยมีใครตรวจด้วยตา (NOTES.md "Still unverified by eye"): พื้นที่และเลขลำดับของ Burst, Blink fade, push slide (Shield Bash), ป้าย "โจมตีกลับ!" ของ Counter, ตัวเลขลอยของ Bleed, เฟรมของ Attune, ไอคอน Command / Cover และไอคอน status

สถานะที่ซ้ำได้มาจาก Replay ของ `@mt/session` (data + Dice Seed + action ชุดเดิม = ผลเดิม): เก็บไฟล์ Replay ของแต่ละกรณีไว้เป็น fixture แล้วเปิดด้วย `openReplay` / `createReplayPlayer` เลื่อนไปยัง action ที่ต้องการ (หรือ entry สำหรับ test ที่ใช้ API เดียวกัน) ไม่สร้างสถานะด้วยการแก้ state ของ engine ตรง animation ต้องหยุดที่จุดที่กำหนดได้ (เช่น เฟรมสุดท้าย หรือหยุด clock ของ Phaser) เพื่อให้ภาพไม่สั่น

ขอบเขตของ Codex: ทุกอย่างอยู่ใน `packages/web/**` (และ `packages/battle/**` ถ้าต้องเพิ่ม hook ให้หยุด animation) เช่น `packages/web/visual/` สำหรับ test, fixture Replay และภาพ baseline, script `test:visual` ใน `packages/web/package.json`, dependency ของ browser ใน `packages/web/package.json` + `pnpm-lock.yaml` test ภาพต้องไม่อยู่ใน `pnpm test` ของ root (Vitest) แต่รันด้วย `pnpm --filter @mt/web test:visual` การเพิ่ม job ใน CI (`.github/`, Claude เท่านั้น) เป็น ticket 26 ถ้าต้องการอะไรจาก session ที่ยังไม่มี (เช่น ข้ามไปยัง action ที่ n) ให้เปิด ticket `Owner: claude`

ภาพ baseline ต้องสร้างบน Linux + Chromium เวอร์ชันเดียวกับที่ CI ใช้ (Codex cloud เป็น Linux) และใช้ threshold เล็กน้อยกันความต่างของ anti-aliasing ถ้าต้องดาวน์โหลด browser ระหว่าง setup ให้บอกผู้ใช้เพิ่มคำสั่งใน install script ของ environment (`docs/agents/codex.md` ข้อ 2) เพราะช่วงที่ agent ทำงาน internet ปิดอยู่

**Blocked by:** None — ticket 24 is merged in PR #4; pinned Chromium download is resolved.

**Status:** done

- [x] มีกรณีทดสอบอย่างน้อย 1 ภาพต่อ visual ในรายการข้างบน แต่ละกรณีมาจาก fixture Replay ที่ commit ไว้ และให้ภาพเดิมทุกครั้งที่รัน (รันซ้ำ 3 ครั้งติดกันผ่านหมด)
- [x] ภาพ baseline commit อยู่ใน `packages/web/**` มีคำสั่งอัปเดต baseline ที่ระบุใน `packages/web/README.md`
- [x] `pnpm --filter @mt/web test:visual` รันได้บน Linux แบบ headless และล้มเมื่อ visual เปลี่ยน (ลองเปลี่ยนสีหนึ่งจุดแล้วเห็น test ล้ม แล้วคืนค่า)
- [x] ตรวจภาพ baseline ด้วยตาแล้วว่าแต่ละ visual แสดงถูกต้อง แนบภาพทั้งหมดใน PR (ถ้าพบ visual ที่ผิด เปิด ticket แยก ไม่แก้ใน ticket นี้)
- [x] `pnpm typecheck`, `pnpm test`, `pnpm build` ผ่าน; `pnpm test` ไม่รัน test ภาพ
- [x] PR จาก branch `codex/25-…` ผ่าน CI รวม path check; PR description บอกคำสั่งที่ ticket 26 ต้องใส่ใน CI (ติดตั้ง browser, รัน test, ไฟล์ที่ควร upload เมื่อล้ม)

## Comments

- Started after PR #4 merged (`dc1a094`), on `codex/25-visual-regression`.
- Implemented 19 replay-driven Board captures, deterministic fixed-step animation timing, pinned Playwright/font dependencies, standalone `test:visual`/update scripts, fixture regeneration, and the ticket 26 CI/artifact handoff in `packages/web/visual/README.md`. Production font behaviour stays unchanged by default.
- Validation passed: pnpm 12.11.2 frozen install, root typecheck, 746 tests passed / 1 skipped, production build, and separate visual TypeScript check. Vitest discovers no visual tests.
- [Inspected smoke captures](../evidence/25-visual-regression/README.md): Linux system Chromium 154.0.8037.57, 19/19 smoke cases. Three consecutive comparisons against temporary system-browser references passed (57/57). Changing Guarded's colour to magenta produced the expected screenshot failure (171 pixels); restored colour passed. Temporary references are not committed baselines.
- Still pending: allow `cdn.playwright.dev` and `storage.googleapis.com` in the environment and apply the configuration; install the pinned Chromium 151.0.7922.34, generate/inspect/commit all baselines, repeat comparisons three times and repeat the colour-change negative check on that pinned browser. Keep the PR draft and this ticket in progress until these steps are complete.
- Work saved in [draft PR #7](https://github.com/AJp-QL/VibeGame_01/pull/7), targeting `main` from `codex/25-visual-regression`. Path ownership passed for all 32 committed files. The PR includes validation results, smoke evidence and the exact browser install/test/artifact commands for ticket 26.

- Continuation on 2026-10-16: installed the locked dependencies and pinned Linux Chromium 151.0.7922.34 (Playwright 1.62.1 / build 1234). Generated all 19 baselines under `packages/web/visual/baselines/` and inspected every frame; no visual defect found. Three consecutive comparisons passed (57/57). A temporary Guarded icon blue-to-magenta change failed with 171 differing pixels; source restored and the case passed again.
- Current validation: frozen install, typecheck, 746 tests passed / 1 skipped, production build and visual TypeScript check passed. Hosted CI verification for the baseline commit remains pending; PR #7 will be marked ready after both checks pass.

- Hosted CI is green for the committed pinned baselines (`4cb81bb`): both Typecheck/test/build and Path ownership check passed on push and PR runs. All ticket acceptance items are complete. PR #7 contains every inspected baseline and the exact ticket 26 CI/artifact commands; ready for Claude review and human merge.

# 27 — สร้าง fixture และ baseline ของ test ภาพใหม่ให้ตรงกับ data/engine ปัจจุบัน

**Owner:** codex

**What to build:** Replay fixture ใน `packages/web/visual/fixtures/` เก็บ `engineVersion` และ `dataHash` ไว้ ถ้าสองค่านี้ไม่ตรงกับ main `openReplay` จะไม่คืน `ready` และ harness จะ throw ทุกกรณี PR ของ ticket 25 แตกจาก main ก่อน ticket 19 (balance: `data/scenarios/scenario_1.json`, `scenario_2.json`, `data/statuses/weakened.json` เปลี่ยน และ engine bump) จึงล้าสมัยทันทีหลัง merge งานนี้คือสร้างใหม่ให้ตรงกับ main: rebase บน main, รัน `corepack pnpm --filter @mt/web visual:fixtures`, ตรวจว่าทุก fixture ยังให้ event/status ที่กรณีนั้นต้องการ (script ตรวจเอง และ `board.visual.ts` assert ซ้ำ), อัปเดต baseline ด้วย `test:visual:update` บน Linux + Chromium ที่ pin ไว้, ดูภาพทุกใบด้วยตาว่า visual ยังถูก (Seed ที่ script เลือกอาจเปลี่ยน ภาพจึงอาจเปลี่ยนแม้ visual ไม่ผิด) แนบภาพก่อน/หลังใน PR ถ้าพบ visual ที่ผิดให้เปิด ticket แยก ไม่แก้ใน ticket นี้

ticket ประเภทนี้ต้องเปิดซ้ำทุกครั้งที่ ticket กฎเกม (ที่ bump `ENGINE_VERSION`) หรือ data เปลี่ยน จนกว่า ticket 26 จะทำให้ CI แจ้งชัดเจน ดู `AGENTS.md` หัวข้อ ENGINE_VERSION

**Blocked by:** 25 — merge PR #7 ก่อน

**Status:** ready-for-agent

- [ ] fixture ทุกไฟล์เปิดด้วย `openReplay` ได้ `ready` บน main ปัจจุบัน
- [ ] baseline ทั้ง 19 ใบอัปเดตบน Linux + Chromium ที่ pin และตรวจด้วยตาแล้ว
- [ ] `pnpm --filter @mt/web test:visual --repeat-each=3` ผ่าน
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build` ผ่าน; path check ผ่าน

## Comments

# P1X-37 — ซ่อน Board 9x9 จากเมนูใน v0.2.0

**Owner:** claude

**What to build:** ผู้ใช้ตัดสิน (2026-10-20): พัก Board 9x9 ไว้เป็น backlog (P1X-36 ปรับ balance, P1X-16 UI 9x9) และ v0.2.0 เล่นด้วย Board 7x7 ที่มีอยู่ ตอนนี้ `menuBoards(data)` (`packages/session/src/battleChoice.ts`) คืนทุก Board ใน `data/` เมนูจึงแสดง `grand_crossroads` และ `wide_shallows` ที่ยังไม่ผ่านเป้า balance ให้เมนูแสดงเฉพาะ Board ที่พร้อมเล่น (Crossroads, Shallows) โดยไม่ลบ data ของ 9x9 (simulator, test และงาน P1X-36 ยังใช้ได้)

ทำใน session ไม่แก้ `data/` (ไม่เปลี่ยน dataHash, visual fixtures ไม่ล้าสมัย): เช่นรายการ Board ที่เปิดในเมนู หรือ filter ตามขนาด Board พร้อมเหตุผลใน doc comment และ README ของ session `menuBoards` ยังหมายถึง "Board ที่เมนูเสนอ" (บันทึกใน decision log ว่าเปลี่ยนรายการ ไม่เปลี่ยนชนิด) Battle ที่สร้างด้วย Board 9x9 โดยตรง (simulator, test, Replay) ยังทำงาน; `openReplay` ของไฟล์ที่เล่นบน 9x9 ยังเปิดได้ ไม่เปลี่ยน engine จึงไม่ขยับ ENGINE_VERSION

**Blocked by:** None — can start immediately

**Status:** done

- [x] `menuBoards` คืนแค่ `crossroads`, `shallows`; test ใน `packages/session/test/battleChoice.test.ts` อัปเดต; `defaultChoice` ไม่เปลี่ยน
- [x] Board 9x9 ยังอยู่ใน `data/` และ `sim boards` / test ของ 9x9 ยังผ่าน; Replay บน 9x9 ยังเปิดได้
- [x] web test ที่วนตาม `menuBoards` ยังผ่าน (ไม่ต้องแก้ Codex path); ถ้าต้องแก้ไฟล์ของ Codex ให้เปิด ticket `Owner: codex`
- [x] decision log และ README ของ session บอกว่า 9x9 ซ่อนจากเมนูจนกว่า P1X-36 จะผ่านเป้า และวิธีเปิดกลับ
- [x] typecheck, test, build, path check, `check-replays` ผ่าน; ENGINE_VERSION ไม่เปลี่ยน

## Comments

- 2026-10-20 (claude): `menuBoards` filters to 7x7 Boards (`MENU_BOARD_SIZE`, doc comment says why and how to show 9x9 again); `data/` untouched, ENGINE_VERSION unchanged; 9x9 Battles still start in `battleChoice.test.ts`; no Codex file needed a change. PR `[P1X-37] Hide 9x9 Boards from the menu`.

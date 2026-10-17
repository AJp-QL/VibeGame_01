# 13 — ขนาด Board ต่อ Board: expand และย้าย engine, AI, simulator

**Owner:** claude

**What to build:** prefactor ก่อนเพิ่ม Board 9x9 (expand ของ expand–contract): ตอนนี้ขนาด Board เป็นค่าคงที่ 7 ของเกมที่ shared, engine, AI, battle และ web ใช้ตรงๆ ให้ขนาดเป็นของแต่ละ Board (และของ Battle) ตาม CONTEXT.md ส่วนที่เป็นของ Claude (shared model ของ Board, engine, AI, simulator) อ่านขนาดจาก Board/Battle ค่าคงที่เดิมยังอยู่เพื่อให้ battle และ web ไม่พังจนกว่า ticket 14 จะย้าย ผู้เล่นไม่เห็นความต่าง: Board 7x7 ทุกอันเล่นเหมือนเดิมทุกอย่าง

**Blocked by:** None — can start immediately

**Status:** in progress (PR open)

- [x] Board data มีขนาด (หรือขนาดได้จากจำนวนแถว) และ Battle state รู้ขนาด Board; การตรวจ data รองรับ Board สี่เหลี่ยมจัตุรัสขนาดอื่น
- [x] engine (deployment start zone, การไล่ช่อง, ระยะ, ชื่อช่อง), AI และ simulator ไม่ใช้ค่าคงที่ 7 อีก
- [x] ค่าคงที่เดิมยัง export อยู่ (deprecated) สำหรับ battle/web
- [x] Replay, simulator report และ test เดิมทั้งหมดได้ผลเท่าเดิม; ENGINE_VERSION ไม่เปลี่ยน (ถ้า dataHash เปลี่ยนเพราะ format ของ Board ให้ ticket 14 refresh visual fixtures)
- [x] test ด้วย Board ทดสอบขนาดอื่น (เช่น 9x9 ที่สร้างใน test) ผ่าน engine และ AI

## Comments

- Size is the number of terrain rows (`boardSize(board)`; the Battle reads it as `boardSizeOf(state)` = `state.terrain.length`), so Board files and the data hash do not change (checked: same hash as main). `isOnBoard` / `rotate180` / `areaTiles` / `isInStartZone` take an optional size (default 7); `startZoneRows(side, size)` is new; `BOARD_SIZE` and `START_ZONE_ROWS` stay, deprecated, for battle/web (ticket 14). Names run a1 to o15, Boards 3x3 to 15x15.
- AI keys that assumed 7 (`y * 7 + x`, `${x}${y}`) now use `tileKey` (radix 16) and comma-separated strings.
- Tests: shared (tile names, Board schema at 9x9, not square, asymmetric, size limits), engine `boardSize.test.ts` (13, a 9x9 `arena` fixture: Units, Moves, Blink, deployment zones, push, Burst, Attune), AI `boardSize.test.ts` (4, deploys in its zone, plays full Battles, deterministic, walks past the old edge), simulator `boardSize.test.ts`. All existing tests pass unchanged. ENGINE_VERSION unchanged.

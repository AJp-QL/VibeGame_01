# P1X-31 — คำอธิบาย Board 9x9 ในเมนู (ทำก่อน merge P1X-15)

**Owner:** codex

**What to build:** P1X-15 (PR #52) เพิ่ม Board 9x9 สองอัน `grand_crossroads` (Grand Crossroads) และ `wide_shallows` (Wide Shallows) ใน `data/boards/` ทำให้ test ของ web `packages/web/test/sessionText.test.ts` > "each Board has a Thai description" แดง เพราะ `th.menu.boardBlurb` ใน `packages/web/src/strings.ts` ยังไม่มีสอง id นี้ ไฟล์นี้เป็นของ Codex Claude จึงแก้ไม่ได้ และ P1X-16 (UI Board 9x9) รอ P1X-15 อยู่ จึงต้องเพิ่มคำอธิบายไว้ก่อนแล้วจึง merge PR #52 (แบบเดียวกับ P1X-25/26)

เพิ่ม `boardBlurb` ภาษาไทยของทั้งสอง id ในแบบเดียวกับ `crossroads` / `shallows` (หนึ่งประโยค บอกลักษณะ terrain ที่เด่น) `boardBlurb` เป็น `Record<string, string>` key ที่ยังไม่มีใน data ของ main ไม่ทำให้อะไรพัง ดูรูป Board จาก branch ของ PR #52: `git show origin/claude/p1x-15-board-9x9:data/boards/grand_crossroads.json` และ `…/wide_shallows.json` (ตัวอักษรใน `rows`: M ภูเขา, W น้ำ, F ป่า, D ทะเลทราย, L แสง, K มืด, `.` ปกติ; ทั้งสองหมุน 180° แล้วเหมือนเดิม) ไม่เปลี่ยนอย่างอื่น ส่วนที่เหลือของ UI 9x9 (mini Board, ขนาดจอ 375 px, fixtures) ยังเป็นของ P1X-16

**Blocked by:** None — ทำก่อนแล้วจึง merge P1X-15 (PR #52)

**Status:** done

- [x] `th.menu.boardBlurb` มี `grand_crossroads` และ `wide_shallows` เป็นภาษาไทย อ่านแล้วตรงกับ Board
- [x] test "each Board has a Thai description" ผ่านทั้งบน main และบน branch ของ PR #52 (merge PR #52 เข้า branch ทดสอบในเครื่อง ไม่ใส่ใน PR นี้)
- [x] แก้แค่ `packages/web/src/strings.ts` (และ test ถ้าจำเป็น); CI เขียวทั้งสาม job

## Comments

- Added both Thai blurbs after checking the terrain rows on `claude/p1x-15-board-9x9`. The existing 27 session text tests pass on current main and in a separate checkout with PR #52 merged for verification only. PR #52 changes are excluded from this branch.
- Typecheck and build pass. Full tests and CI are recorded in the PR. The current visual suite reports stale 0.11.0 fixtures against engine 0.12.0; P1X-30 owns that refresh.
- Full workspace run: 1,028 passed, 1 skipped. CI run 39204237380 passed all three jobs; the visual job used its documented stale-fixture warning.

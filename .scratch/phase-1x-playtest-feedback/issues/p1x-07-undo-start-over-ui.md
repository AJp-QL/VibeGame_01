# P1X-07 — UI: ปุ่ม Undo, Start over และตัวเลือกใน Replay viewer

**Owner:** codex

**What to build:** ระหว่าง Turn ของผู้เล่นมีปุ่ม "ย้อนกลับ" ที่บอกว่าจะย้อนถึงไหน ("ต้น Turn" / "หลังการทอยล่าสุด") ปิดเมื่อย้อนไม่ได้ และซ่อนใน Turn ของ AI เมนูใน Battle มี "เริ่มใหม่" ที่ถามยืนยันก่อน แล้วเริ่ม Battle ใหม่ด้วย Scenario, Board, โหมดและฝั่งเดิมแต่ Dice Seed ใหม่ Battle เดิมบันทึกว่าถูกทิ้งใน play stats ทั้งโหมด AI และ Hotseat และ Replay viewer มีตัวเลือกแสดง action ที่ถูก Undo (ค่าเริ่มต้นซ่อน) (spec user stories 14–17, 20–21, 23–27, 49) ถ้า ticket 06 ขยับ ENGINE_VERSION ให้ refresh visual fixtures ใน ticket นี้ด้วย

**Blocked by:** P1X-06 — Replay format 2 บันทึก Undo, P1X-02 — UI quick fixes (เมนูและ dialog ใช้ร่วมกัน)

**Status:** done

- [x] ปุ่ม "ย้อนกลับ" แสดง/ปิด/ซ่อนตามข้อมูลของ session และป้ายบอกจุดที่จะย้อนถึง
- [x] เมื่อปุ่มปิดเพราะเพิ่งทอยลูกเต๋า บอกเหตุผลให้ผู้เล่น (เช่น "ทอยลูกเต๋าแล้ว ย้อนผลไม่ได้") ตามเหตุผลใน spec (Undo ข้ามการทอยไม่ได้)
- [x] "เริ่มใหม่" ใน in-Battle menu มี dialog ยืนยัน, Battle ใหม่ใช้ Dice Seed ใหม่, Battle เดิมถูกบันทึกว่าถูกทิ้ง, ใช้ได้ทั้งสองโหมด
- [x] Replay viewer มีตัวเลือกแสดง action ที่ถูก Undo
- [x] ข้อความอยู่ใน strings ของ web มี text test; screenshot ที่ desktop และ 360 px
- [x] visual fixtures ตรงกับ engine ปัจจุบัน; CI เขียวทั้งสาม job

## Notes from P1X-06

- ENGINE_VERSION is 0.12.0 after P1X-06; the fixture refresh is P1X-30 (do it first or together).
- Use `snapshot.recorded` in `replayToExport`; `ReplayPlayer.setShowUndone`; `stats.recordUndo(index)` / `stats.recordBattleAbandoned(index)`. Details in the P1X-06 ticket comments.

## Implementation

- Undo uses only the session offer and records accepted Undos in play stats. A disabled button explains that dice results cannot be withdrawn. Start over preserves choices, changes Dice Seed and records abandonment in AI and Hotseat. Replay export now uses `snapshot.recorded`; the viewer offers the session show-undone toggle and labels withdrawn steps. Undo/Replay jumps cancel queued Board animations.
- [Desktop/mobile evidence](../evidence/07-undo-start-over-ui/README.md). Frozen install, typecheck, 1,032 tests passed (1 skipped), build, check-replays and path check pass. Pinned Chromium visual suite: 31/31 passed, baseline PNGs unchanged. Includes P1X-30 fixture refresh; merge PR #59 first. All three CI jobs passed (run 39205967967).

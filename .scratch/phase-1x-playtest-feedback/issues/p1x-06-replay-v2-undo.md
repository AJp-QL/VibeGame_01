# P1X-06 — Replay format 2 บันทึก Undo, playback และ play stats

**Owner:** claude

**What to build:** Replay บันทึกการ Undo ด้วย เพื่อให้ดูได้ว่าผู้เล่นเปลี่ยนใจตรงไหน: Replay format 2 มี action undo, เล่นซ้ำแล้วได้ผลเดิมทุกครั้ง, playback ข้าม action ที่ถูก Undo เป็นค่าเริ่มต้นและเปิดให้แสดงได้, Replay format 1 (v0.1.x) ยังเปิดได้เหมือนเดิม play stats นับจำนวน Undo ต่อ Battle และบันทึก Battle ที่ถูกทิ้ง (ใช้กับ Start over ใน ticket 07) (spec: Replay and analysis, user stories 26, 48–51)

**Blocked by:** P1X-05 — Undo ใน engine และ session

**Status:** done (PR open)

- [ ] Replay format 2 เพิ่ม action undo แบบเพิ่มเท่านั้น; ไฟล์ format 1 เปิดและเล่นได้ (test ด้วยไฟล์ v0.1.5 จริงจาก playtest และ visual fixtures)
- [ ] เล่นซ้ำ Replay ที่มี undo ได้ state สุดท้ายเท่ากับตอนเล่นจริง
- [ ] playback snapshot เลือกได้ว่าข้ามหรือแสดง action ที่ถูก Undo (ค่าเริ่มต้นข้าม) มี test ผ่าน session
- [ ] play stats มีจำนวน Undo ต่อ Battle และสถานะ "ถูกทิ้ง" (format play stats เพิ่มฟิลด์แบบเพิ่มเท่านั้น ข้อมูลเดิมใน localStorage ยังอ่านได้)
- [ ] ENGINE_VERSION ขยับตามกฎ ถ้า engine รับ action ใหม่; บอกใน ticket 07 ให้ Codex refresh visual fixtures
- [ ] CONTEXT.md นิยาม Replay ยังตรง; docs ของ format อัปเดต

## Comments

- Format 2 = `formatVersion` 2; `actions` may hold `{ "type": "undo", "withdraw": N }` (the N last standing actions; the withdrawn ones stay before it). Format 1 files open unchanged (all visual fixtures are tested) and may not hold an undo. `replayBattle` checks N against `undoPoint`; a mismatch is a broken Replay (`rejected` at the entry). `steps` hold every action with `undone`; `final` is the state the player had.
- **No ENGINE_VERSION bump (stays 0.11.0):** `undo` is a file entry, not an action `applyAction` accepts; same data + seed + actions give the same result. So no "refresh visual fixtures" follow-up is needed for P1X-07.
- For P1X-07 (Codex): export with `snapshot.recorded` (not `snapshot.actions`) in `replayToExport` so Undo reaches the file; `createReplayPlayer(...).setShowUndone(bool)` + `snapshot.hasUndone/showUndone/undone` for the toggle; after each `session.undo()` call `stats.recordUndo(statsIndex)` (or compare `snapshot.undos`); Start over calls `stats.recordBattleAbandoned(statsIndex)` before the new Battle. Until web switches to `recorded`, exported files contain only the standing actions (as before).
- Play stats: `BattleRecord.undos?`, `abandonedAt?`, `PlayStats.battlesAbandoned` (additive; old data reads as 0).

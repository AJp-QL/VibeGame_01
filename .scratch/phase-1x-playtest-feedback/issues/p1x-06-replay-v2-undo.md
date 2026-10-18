# 06 — Replay format 2 บันทึก Undo, playback และ play stats

**Owner:** claude

**What to build:** Replay บันทึกการ Undo ด้วย เพื่อให้ดูได้ว่าผู้เล่นเปลี่ยนใจตรงไหน: Replay format 2 มี action undo, เล่นซ้ำแล้วได้ผลเดิมทุกครั้ง, playback ข้าม action ที่ถูก Undo เป็นค่าเริ่มต้นและเปิดให้แสดงได้, Replay format 1 (v0.1.x) ยังเปิดได้เหมือนเดิม play stats นับจำนวน Undo ต่อ Battle และบันทึก Battle ที่ถูกทิ้ง (ใช้กับ Start over ใน ticket 07) (spec: Replay and analysis, user stories 26, 48–51)

**Blocked by:** 05 — Undo ใน engine และ session

**Status:** ready-for-agent

- [ ] Replay format 2 เพิ่ม action undo แบบเพิ่มเท่านั้น; ไฟล์ format 1 เปิดและเล่นได้ (test ด้วยไฟล์ v0.1.5 จริงจาก playtest และ visual fixtures)
- [ ] เล่นซ้ำ Replay ที่มี undo ได้ state สุดท้ายเท่ากับตอนเล่นจริง
- [ ] playback snapshot เลือกได้ว่าข้ามหรือแสดง action ที่ถูก Undo (ค่าเริ่มต้นข้าม) มี test ผ่าน session
- [ ] play stats มีจำนวน Undo ต่อ Battle และสถานะ "ถูกทิ้ง" (format play stats เพิ่มฟิลด์แบบเพิ่มเท่านั้น ข้อมูลเดิมใน localStorage ยังอ่านได้)
- [ ] ENGINE_VERSION ขยับตามกฎ ถ้า engine รับ action ใหม่; บอกใน ticket 07 ให้ Codex refresh visual fixtures
- [ ] CONTEXT.md นิยาม Replay ยังตรง; docs ของ format อัปเดต

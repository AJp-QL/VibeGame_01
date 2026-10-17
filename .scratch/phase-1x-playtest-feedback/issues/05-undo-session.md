# 05 — Undo ใน engine และ session

**Owner:** claude

**What to build:** ผู้เล่นย้อน action ของ Turn ตัวเองกลับถึงจุดปลอดภัยล่าสุดได้: จุดปลอดภัยคือต้น Turn หรือหลัง action ล่าสุดที่มีการทอยลูกเต๋า (attack roll, save, damage, heal, Bleed tick, initiative, Inspiration) รวมการตัดสินใจที่ตอบการทอยนั้น แล้วแต่อันไหนมาทีหลัง ใช้ได้เฉพาะฝั่งที่กำลังเล่นภายใน Turn ของตัวเอง และเมื่อมี action หลังจุดปลอดภัยอย่างน้อย 1 อย่าง ไม่มีใน Turn ของ AI ผลคือ state เหมือนตอนอยู่ที่จุดปลอดภัยทุกอย่าง (ตำแหน่ง, Command, Defend, Camouflage, Attune, activation ที่เริ่มแล้ว) session บอก UI ว่า Undo ใช้ได้ไหมและจะย้อนถึงไหน ("ต้น Turn" หรือ "หลังการทอยล่าสุด") และมีคำสั่ง Undo (spec: Undo, user stories 14–22) ticket นี้ยังไม่บันทึก Undo ลง Replay (ticket 06) Replay ที่ export ระหว่างนี้มีแค่ action ที่คงอยู่

**Blocked by:** 01 — Inspiration เฉพาะเมื่อพลาด (กติกาว่าการตัดสินใจ Inspiration เกิดเมื่อไรต้องนิ่งก่อน)

**Status:** in progress (PR open)

- [x] engine บอกได้ว่า action ใดใช้ลูกเต๋า (หรือตอบการทอย) เพื่อหาจุดปลอดภัย; กติกาจุดปลอดภัยเขียนใน rules (D-row) และ decision log
- [x] Undo สร้าง state ใหม่แบบ deterministic เท่ากับ state ที่จุดปลอดภัยทุกฟิลด์ (test หลายลำดับ action)
- [x] Undo ไม่ข้ามการทอยและไม่ข้ามต้น Turn; ไม่มีให้ใช้ใน Turn ของ AI และของอีกฝั่งใน Hotseat
- [x] snapshot บอก undo ใช้ได้ไหมและป้ายจุดที่จะย้อนถึง มี test ผ่าน session
- [x] ถ้า Undo ทำให้ engine รับ action ชนิดใหม่ ให้ขยับ ENGINE_VERSION ตามกฎ (ถ้าเป็นเรื่องของ session ล้วน ไม่ต้อง)

## Comments

- Engine: `undoPoint(states, actions)` and `drewDice` (`packages/engine/src/undo.ts`): a roll is detected by the dice stream moving, so every kind of roll counts without listing events; Inspiration answers, End Turn and anything before play are safe points. Rules §17.5, D-30; decision log row. Undo is session-only (no new engine action), so no ENGINE_VERSION bump; ticket 06 records it in the Replay.
- Session: `snapshot.undo` (`{ to, actions }` or null; null for the AI's Turn, a non-board screen, or the side that has not acted) and `undo()`; the session keeps the state after every action. After Undo `events` is empty and `revision` goes up (the Board must redraw the whole position; no animation). Tests: engine `undo.test.ts` (16, incl. a random-play property over 5 seeds), session `sessionUndo.test.ts` (14).

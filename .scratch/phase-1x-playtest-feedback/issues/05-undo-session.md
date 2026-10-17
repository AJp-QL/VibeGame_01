# 05 — Undo ใน engine และ session

**Owner:** claude

**What to build:** ผู้เล่นย้อน action ของ Turn ตัวเองกลับถึงจุดปลอดภัยล่าสุดได้: จุดปลอดภัยคือต้น Turn หรือหลัง action ล่าสุดที่มีการทอยลูกเต๋า (attack roll, save, damage, heal, Bleed tick, initiative, Inspiration) รวมการตัดสินใจที่ตอบการทอยนั้น แล้วแต่อันไหนมาทีหลัง ใช้ได้เฉพาะฝั่งที่กำลังเล่นภายใน Turn ของตัวเอง และเมื่อมี action หลังจุดปลอดภัยอย่างน้อย 1 อย่าง ไม่มีใน Turn ของ AI ผลคือ state เหมือนตอนอยู่ที่จุดปลอดภัยทุกอย่าง (ตำแหน่ง, Command, Defend, Camouflage, Attune, activation ที่เริ่มแล้ว) session บอก UI ว่า Undo ใช้ได้ไหมและจะย้อนถึงไหน ("ต้น Turn" หรือ "หลังการทอยล่าสุด") และมีคำสั่ง Undo (spec: Undo, user stories 14–22) ticket นี้ยังไม่บันทึก Undo ลง Replay (ticket 06) Replay ที่ export ระหว่างนี้มีแค่ action ที่คงอยู่

**Blocked by:** 01 — Inspiration เฉพาะเมื่อพลาด (กติกาว่าการตัดสินใจ Inspiration เกิดเมื่อไรต้องนิ่งก่อน)

**Status:** ready-for-agent

- [ ] engine บอกได้ว่า action ใดใช้ลูกเต๋า (หรือตอบการทอย) เพื่อหาจุดปลอดภัย; กติกาจุดปลอดภัยเขียนใน rules (D-row) และ decision log
- [ ] Undo สร้าง state ใหม่แบบ deterministic เท่ากับ state ที่จุดปลอดภัยทุกฟิลด์ (test หลายลำดับ action)
- [ ] Undo ไม่ข้ามการทอยและไม่ข้ามต้น Turn; ไม่มีให้ใช้ใน Turn ของ AI และของอีกฝั่งใน Hotseat
- [ ] snapshot บอก undo ใช้ได้ไหมและป้ายจุดที่จะย้อนถึง มี test ผ่าน session
- [ ] ถ้า Undo ทำให้ engine รับ action ชนิดใหม่ ให้ขยับ ENGINE_VERSION ตามกฎ (ถ้าเป็นเรื่องของ session ล้วน ไม่ต้อง)

# 16 — Simulator และการเทียบผลกับ sim v4

**What to build:** simulator แบบไม่มี UI ที่รัน Scenario หลายพันเกมด้วย engine และ AI ตัวเดียวกับเกม รายงานอัตราชนะ, จำนวน Turn, Tamer ล้มเป็นตัวแรก, สัดส่วนเกมที่จบด้วย turn limit, Unit ที่ล้มเป็นตัวแรก, damage ต่อเกมแยกตาม Unit และ skill ที่ถูกใช้ แล้วยืนยันว่าผลตรงกับ sim v4

**Blocked by:** 12 — Inspiration และ turn limit, 15 — AI

**Status:** done

- [x] config ตรงกับ sim v4 variant U4 ทั้ง Scenario 1 และ 2 และทุกโปรไฟล์ AI ที่ sim v4 ใช้
- [x] ผลต่างจาก sim v4 ไม่เกิน ±5 percentage point ในอัตราชนะ, จำนวน Turn, Tamer ล้มเป็นตัวแรก และเกมที่จบด้วย turn limit ถ้าไม่ผ่าน ให้รายงานสาเหตุที่พบ (กติกาที่ตีความต่างกัน) แทนการปรับตัวเลขให้ผ่าน
- [x] รันซ้ำด้วย Dice Seed ชุดเดิมได้ตัวเลขเท่าเดิม
- [x] เมื่อผ่านแล้ว บันทึกใน decision log ว่าเลิกใช้ Python sim เป็นเครื่องมือ tuning

# 23 — AI ในเกมให้คุณค่า Mark ข้าม Turn และ skill ที่ไม่ถูกใช้

**Owner:** claude

**What to build:** AI โปรไฟล์ในเกม (GAME_PROFILES) ให้คุณค่ากับ advantage ของ Marked ใน Turn ถัดไปของฝั่งตัวเอง (ticket 18) และพิจารณา Hex, Pin, Camouflage, Blink ให้ถูกใช้เมื่อคุ้ม โดยโปรไฟล์ sim-parity (SIM_PROFILES) ไม่เปลี่ยน

**Blocked by:** 22 — เอกสารและ tracker สำหรับหลาย agent

**Status:** ready-for-agent

- [ ] simulator แสดงว่า Mark, Hex, Pin, Camouflage ถูกใช้มากกว่า 0.1 ครั้งต่อ Battle ในอย่างน้อย 2 ชุด
- [ ] SIM_PROFILES และ parity test เดิมผ่านเหมือนเดิม
- [ ] AI ยัง deterministic และไม่ช้ากว่าเดิมเกิน 2 เท่าต่อ Battle

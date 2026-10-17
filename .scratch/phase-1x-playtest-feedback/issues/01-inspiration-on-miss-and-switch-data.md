# 01 — Inspiration เฉพาะเมื่อพลาด และข้อมูลการเปลี่ยน Unit / จบ Turn ใน session

**Owner:** claude

**What to build:** ผู้เล่นไม่ถูกถาม Inspiration หลังทอยโดนเองอีก: Inspiration เสนอเฉพาะเมื่อ attack roll ของฝั่งตัวเองพลาด (รวม Mark, ทุกเป้าของ Burst, counterattack) หรือ save ของฝั่งตัวเองไม่ผ่าน และ initiative ให้ฝั่งที่แพ้ตามเดิม (spec: Inspiration, user stories 32–36) และ session บอก UI ได้ว่าการเริ่ม Unit อื่นจะจบ activation ของ Unit ปัจจุบันที่ยังใช้ Action ได้หรือไม่ (Unit ไหน) และรายชื่อ Unit ที่เดินแล้วแต่ยังไม่ใช้ Action เพื่อใช้ใน dialog ยืนยันและคำเตือนตอนจบ Turn (user stories 28–31) ข้อมูลใหม่ใน snapshot เป็นแบบเพิ่มเท่านั้น

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] rules §18 และตาราง Inspiration แก้ตามกติกาใหม่ มี D-row ใน §23 และแถวใน decision log
- [ ] engine ไม่เสนอ Inspiration เมื่อโดน และยังเสนอเมื่อพลาด, save ไม่ผ่าน, initiative (test ผ่าน interface ของ engine ทุกกรณีรวม Burst หลายเป้าและ counterattack)
- [ ] ENGINE_VERSION ขยับ minor (0.9.0 → 0.10.0) ใน commit เดียวกัน; SIM_PROFILES และ sim-v4 parity ผ่านเหมือนเดิม; AI ยัง deterministic
- [ ] snapshot ของ session มีข้อมูล "เริ่ม Unit อื่นจะจบ Unit ที่ยังใช้ Action ได้" และ "Unit ที่เดินแล้วแต่ยังไม่ใช้ Action" มี test ผ่าน session (รวมกรณี Unit ปัจจุบันไม่มี Action ที่ทำได้แล้ว = ไม่ต้องเตือน)
- [ ] เปิด ticket 02 (Codex) ให้ refresh visual fixtures ตามกฎใน AGENTS.md (ticket 02 ครอบแล้ว)

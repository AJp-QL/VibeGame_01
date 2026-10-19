# P1X-17 — Release v0.2.0 และเตรียม playtest รอบถัดไป

**Owner:** claude

**What to build:** playtester รอบถัดไปได้เล่นเวอร์ชันที่มีทุกอย่างของ phase 1.x: release v0.2.0 ด้วย tag หลัง CI บน main เขียว ตรวจเว็บ live และเตรียมโน้ตสำหรับ playtest ว่ามีอะไรใหม่และอยากให้ลองอะไร (Move preview, Undo, Start over, ระยะใหม่, Board 9x9) (spec user story 52)

**Blocked by:** P1X-07 — UI Undo/Start over, P1X-10 — fixtures หลังแก้ระยะ, P1X-12 — UI Threat zone, P1X-16 — UI Board 9x9, P1X-19 — UI Move preview cleanup, P1X-24 — UI Action plan, P1X-29 — UI ข้อความระยะจาก session, P1X-34 — Board plan จาก port, P1X-35 — Undo เหตุผลจาก session

**Status:** ready-for-agent

- [ ] CI บน main เขียวทั้งสาม job (screenshot ถูกเทียบจริง ไม่ใช่ stale)
- [ ] tag v0.2.0, deploy ผ่าน, เว็บ live รายงาน v0.2.0 และ ENGINE_VERSION ปัจจุบัน
- [ ] โน้ต playtest (สิ่งใหม่ + คำถามที่อยากได้คำตอบ) และ NOTES.md อัปเดต
- [ ] ผู้ใช้เล่น 1 Battle บนเว็บ live ก่อนแจก URL

# 17 — Release v0.2.0 และเตรียม playtest รอบถัดไป

**Owner:** claude

**What to build:** playtester รอบถัดไปได้เล่นเวอร์ชันที่มีทุกอย่างของ phase 1.x: release v0.2.0 ด้วย tag หลัง CI บน main เขียว ตรวจเว็บ live และเตรียมโน้ตสำหรับ playtest ว่ามีอะไรใหม่และอยากให้ลองอะไร (Move preview, Undo, Start over, ระยะใหม่, Board 9x9) (spec user story 52)

**Blocked by:** 07 — UI Undo/Start over, 10 — fixtures หลังแก้ระยะ, 12 — UI Threat zone, 16 — UI Board 9x9, 19 — UI Move preview cleanup, 24 — UI Action plan, 29 — UI ข้อความระยะจาก session

**Status:** ready-for-agent

- [ ] CI บน main เขียวทั้งสาม job (screenshot ถูกเทียบจริง ไม่ใช่ stale)
- [ ] tag v0.2.0, deploy ผ่าน, เว็บ live รายงาน v0.2.0 และ ENGINE_VERSION ปัจจุบัน
- [ ] โน้ต playtest (สิ่งใหม่ + คำถามที่อยากได้คำตอบ) และ NOTES.md อัปเดต
- [ ] ผู้ใช้เล่น 1 Battle บนเว็บ live ก่อนแจก URL

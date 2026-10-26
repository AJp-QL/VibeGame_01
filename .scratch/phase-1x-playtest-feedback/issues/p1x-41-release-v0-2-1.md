# P1X-41 — Release v0.2.1 (action จาก Move preview) และ playtest สั้น

**Owner:** claude

**What to build:** เมื่อ P1X-39 และ P1X-40 merge แล้ว ออก v0.2.1 ด้วย tag จาก main หลัง CI เขียว ตรวจเว็บ live ว่ารายงาน v0.2.1 และ ENGINE_VERSION ปัจจุบัน และเขียนโน้ต playtest สั้นว่ามีอะไรเปลี่ยน (action ระหว่าง Move preview คิดจากช่องเงา, bottom sheet บนมือถือ, action หลังเดิน) และอยากให้ลองอะไร (ผู้ใช้ 2026-10-26: ออกเร็วหลังสอง ticket merge)

**Blocked by:** P1X-39 — session: action ระหว่าง Move preview; P1X-40 — UI: action จาก Move preview

**Status:** ready-for-agent

- [ ] CI บน main เขียวทั้งสาม job (screenshot ถูกเทียบจริง)
- [ ] tag v0.2.1, deploy ผ่าน, เว็บ live รายงาน v0.2.1
- [ ] โน้ต playtest (`docs/playtest/`) และ NOTES.md อัปเดต
- [ ] ผู้ใช้เล่น 1 Battle บนมือถือบนเว็บ live ก่อนแจก URL

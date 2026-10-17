# 10 — UI: refresh visual fixtures และข้อความ skill หลังแก้ระยะ

**Owner:** codex

**What to build:** หลัง ticket 09 เปลี่ยน data/กติกา Replay fixture ของ test ภาพล้าสมัย ต้องบันทึกใหม่และตรวจ baseline ทุกภาพตาม AGENTS.md และถ้ามีกติกาใหม่ที่ผู้เล่นต้องรู้ (เช่น disadvantage ที่ระยะไกล หรือ terrain ที่บัง line of sight) คำอธิบาย skill, preview และ legend ของ terrain ต้องบอกให้ครบ

**Blocked by:** 09 — ใช้ชุดแก้ระยะ skill ที่ผู้ใช้เลือก

**Status:** ready-for-agent

- [ ] visual fixtures บันทึกใหม่ด้วย engine และ data ปัจจุบัน baseline ตรวจด้วยตาทุกภาพ ภาพที่เปลี่ยนมีภาพก่อน/หลังใน PR
- [ ] ข้อความของกติกาใหม่ (ถ้ามี) อยู่ใน strings ของ web มี text test; terrain ใหม่ (ถ้ามี) มีสีและสัญลักษณ์บน Board และใน legend
- [ ] CI เขียวทั้งสาม job ไม่มีคำเตือน fixtures stale

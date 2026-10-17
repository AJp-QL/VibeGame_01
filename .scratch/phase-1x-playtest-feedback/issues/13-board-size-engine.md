# 13 — ขนาด Board ต่อ Board: expand และย้าย engine, AI, simulator

**Owner:** claude

**What to build:** prefactor ก่อนเพิ่ม Board 9x9 (expand ของ expand–contract): ตอนนี้ขนาด Board เป็นค่าคงที่ 7 ของเกมที่ shared, engine, AI, battle และ web ใช้ตรงๆ ให้ขนาดเป็นของแต่ละ Board (และของ Battle) ตาม CONTEXT.md ส่วนที่เป็นของ Claude (shared model ของ Board, engine, AI, simulator) อ่านขนาดจาก Board/Battle ค่าคงที่เดิมยังอยู่เพื่อให้ battle และ web ไม่พังจนกว่า ticket 14 จะย้าย ผู้เล่นไม่เห็นความต่าง: Board 7x7 ทุกอันเล่นเหมือนเดิมทุกอย่าง

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Board data มีขนาด (หรือขนาดได้จากจำนวนแถว) และ Battle state รู้ขนาด Board; การตรวจ data รองรับ Board สี่เหลี่ยมจัตุรัสขนาดอื่น
- [ ] engine (deployment start zone, การไล่ช่อง, ระยะ, ชื่อช่อง), AI และ simulator ไม่ใช้ค่าคงที่ 7 อีก
- [ ] ค่าคงที่เดิมยัง export อยู่ (deprecated) สำหรับ battle/web
- [ ] Replay, simulator report และ test เดิมทั้งหมดได้ผลเท่าเดิม; ENGINE_VERSION ไม่เปลี่ยน (ถ้า dataHash เปลี่ยนเพราะ format ของ Board ให้ ticket 14 refresh visual fixtures)
- [ ] test ด้วย Board ทดสอบขนาดอื่น (เช่น 9x9 ที่สร้างใน test) ผ่าน engine และ AI

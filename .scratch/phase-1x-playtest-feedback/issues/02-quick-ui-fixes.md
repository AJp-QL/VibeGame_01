# 02 — UI: ยืนยันก่อนเปลี่ยน Unit, คำเตือนจบ Turn, ข้อความ Camouflage และ refresh visual fixtures

**Owner:** codex

**What to build:** เมื่อผู้เล่นเริ่ม Unit อื่นขณะที่ Unit ปัจจุบันยังใช้ Action ได้ เกมถามก่อนว่า "X ยังใช้ Action ได้ เริ่ม Y เลยไหม" มีปุ่ม "เริ่ม Y" กับ "กลับไปเล่น X" คำเตือนตอนจบ Turn บอกรวม Unit ที่เดินแล้วแต่ยังไม่ใช้ Action ด้วย และคำอธิบาย Camouflage บอกว่าศัตรูที่ยืนติดกันยังเล็ง Unit ที่ Hidden ได้ (spec user stories 28–31, 37) ใช้ข้อมูลจาก session ที่ ticket 01 เพิ่ม และเพราะ ticket 01 ขยับ ENGINE_VERSION ต้องบันทึก visual fixtures ใหม่และตรวจ baseline ทุกภาพตาม AGENTS.md

**Blocked by:** 01 — Inspiration เฉพาะเมื่อพลาด และข้อมูลการเปลี่ยน Unit / จบ Turn ใน session

**Status:** ready-for-agent

- [ ] dialog ยืนยันก่อนเปลี่ยน Unit ขึ้นเฉพาะเมื่อ session บอกว่าจะจบ Unit ที่ยังใช้ Action ได้ และไม่ขึ้นในกรณีอื่น
- [ ] คำเตือนจบ Turn แสดง Unit ที่เดินแล้วแต่ยังไม่ใช้ Action
- [ ] คำอธิบาย Camouflage มีประโยคเรื่องศัตรูที่ยืนติดกัน
- [ ] ข้อความทั้งหมดอยู่ใน strings ของ web มี text test
- [ ] visual fixtures บันทึกใหม่ด้วย engine ปัจจุบัน baseline ตรวจด้วยตาทุกภาพ CI เขียวทั้งสาม job (ไม่มีคำเตือน fixtures stale)

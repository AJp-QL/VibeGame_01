# 12 — UI: Threat zone ในแผง Move preview

**Owner:** codex

**What to build:** แผง Move preview แสดง "⚠ N" สำหรับช่องที่กำลังดู คือจำนวนศัตรูที่อาจโจมตีช่องนั้นได้ใน Turn หน้า พร้อมคำอธิบายสั้นว่าเป็นค่าประมาณ ไม่ใช่การรับประกัน (spec user stories 7–8)

**Blocked by:** 11 — Threat zone ใน session, 04 — UI: Move preview

**Status:** ready-for-agent

- [ ] แผงแสดงจำนวนจาก session (ไม่คำนวณเอง) และไม่แสดงเมื่อเป็น 0 หรือแสดงแบบเด่นน้อย ตามที่ออกแบบใน PR
- [ ] คำอธิบาย "ค่าประมาณ" อยู่ใน strings ของ web มี text test
- [ ] screenshot ที่ desktop และ 360 px; CI เขียวทั้งสาม job

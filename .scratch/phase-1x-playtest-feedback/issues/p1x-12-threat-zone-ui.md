# P1X-12 — UI: Threat zone ในแผง Move preview และ overlay ทั้ง Board

**Owner:** codex

**What to build:** แผง Move preview แสดง "⚠ N" สำหรับช่องที่กำลังดู คือจำนวนศัตรูที่อาจโจมตีช่องนั้นได้ใน Turn หน้า พร้อมคำอธิบายสั้นว่าเป็นค่าประมาณ ไม่ใช่การรับประกัน และมีปุ่มเปิด/ปิด overlay Threat zone ทั้ง Board (ค่าเริ่มต้นปิด) ที่แต้มสีช่องตามจำนวนศัตรูที่อาจโจมตีได้ (spec user stories 7–8, 53)

**Blocked by:** P1X-11 — Threat zone ใน session, P1X-04 — UI: Move preview

**Status:** ready-for-agent

- [ ] แผงแสดงจำนวนจาก session (ไม่คำนวณเอง) และไม่แสดงเมื่อเป็น 0 หรือแสดงแบบเด่นน้อย ตามที่ออกแบบใน PR
- [ ] ปุ่มเปิด/ปิด overlay ทั้ง Board ค่าเริ่มต้นปิด สีตามจำนวนจาก session อ่านง่ายทั้ง desktop และ 360 px และไม่บังไฮไลต์ช่องที่เดินได้
- [ ] สีของ overlay ไม่ชนกับเครื่องหมายดาบบนศัตรูและจุดช่องที่ยืนโจมตีได้ของ Action plan (ticket 24) ถ้า 24 merge แล้ว
- [ ] คำอธิบาย "ค่าประมาณ" อยู่ใน strings ของ web มี text test
- [ ] screenshot ที่ desktop และ 360 px; CI เขียวทั้งสาม job

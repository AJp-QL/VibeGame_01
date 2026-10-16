# 17 — Build สำหรับ playtest

**What to build:** build ที่พร้อมแจกให้ playtester 5 คน: เล่นได้ทั้ง desktop และมือถือ 360 px, นับสถิติการเล่นในเครื่อง (จำนวนครั้งที่เปิดเกม, Battle ที่เริ่มและจบ, วันที่เล่น) แล้ว export มากับไฟล์ Replay, มีลิงก์แบบฟอร์มสั้นจากหน้าสรุปและเมนู และ deploy เป็น build ที่ติด tag

**Blocked by:** 13 — Scenario 2, Board ที่ 2 และเมนู, 14 — Replay, 15 — AI

**Status:** ready-for-agent

- [ ] smoke test: เปิดเกมได้และเล่นกับ AI จนจบ 1 Battle ทั้งขนาดจอ desktop และ 360 px
- [x] สถิติเก็บใน browser storage เท่านั้น ไม่ส่งออกไปที่ไหน และเกมยังทำงานได้ถ้า storage ใช้ไม่ได้
- [x] ข้อความ UI ทั้งหมดมาจาก string table ไม่มีข้อความฝังในโค้ด
- [ ] build ที่ deploy แสดงเวอร์ชันและตรงกับ git tag
- [x] มีคำอธิบายสั้นสำหรับ playtester: วิธีเล่น, วิธี export Replay และลิงก์แบบฟอร์ม

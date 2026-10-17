# 04 — UI: Move preview

**Owner:** codex

**What to build:** แตะช่องที่สว่างแล้วเห็นเงาของ Unit บนช่องนั้นแทนการเดินทันที พร้อมแผงที่บอกว่าจากช่องนั้น skill ไหนถึงศัตรูตัวไหน (ตัวที่ line of sight บังแสดงว่าเล็งไม่ได้) กดปุ่ม "เดิน" จึงเดินจริง Wispling ใช้ปุ่ม "Blink" แตะช่องอื่นย้ายเงา แตะ Unit ยกเลิก hint อธิบาย flow ใหม่ ใช้ได้ทั้งจอ 360 px และ desktop (spec user stories 1–13)

**Blocked by:** 03 — Move preview ใน session

**Status:** ready-for-agent

- [ ] เงา Unit และแผง preview แสดงตามข้อมูลของ session ไม่คำนวณกติกาเอง
- [ ] ปุ่ม "เดิน" / "Blink" ยืนยันการเดิน; แตะช่องอื่นและแตะ Unit ทำงานตามที่บอก
- [ ] hint ใน TurnPanel อธิบาย Move preview และบอกว่า "ยังเดินได้" เฉพาะเมื่อ Unit มีช่องที่เดินได้จริง (ตาม reachable ของ session ไม่ใช่แค่ยังไม่ได้เดิน) เช่น Unit ที่ติด Pin ต้องไม่ถูกบอกว่ายังเดินได้ (พบจาก review PR #16)
- [ ] ข้อความอยู่ใน strings ของ web มี text test
- [ ] screenshot test ของเงาและแผงที่ desktop และ 360 px ไม่มี horizontal scroll; CI เขียวทั้งสาม job

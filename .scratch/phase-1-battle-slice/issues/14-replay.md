# 14 — Replay

**What to build:** playtester export ไฟล์ Replay ของ Battle ล่าสุดได้ ผู้พัฒนา import แล้วเล่นซ้ำทีละ action หรือข้ามไปท้ายเกมได้ตรงเป๊ะ Replay เก็บ Dice Seed, Scenario, Board, โหมด, ลำดับ action, hash ของ data และเวอร์ชัน engine

**Blocked by:** 05 — Basic Attack ครบวง

**Status:** ready-for-agent

- [ ] รูปแบบไฟล์ Replay นิยามใน shared และตรวจ schema ตอน import
- [ ] เล่นซ้ำจาก Replay ได้ state สุดท้ายเดียวกับเกมจริงทุกครั้ง
- [ ] hash ของ data คำนวณจากเนื้อหาที่ normalize แล้ว ถ้า hash หรือเวอร์ชัน engine ไม่ตรง ระบบแจ้งว่าเวอร์ชันไม่ตรงและไม่พยายามแปลง
- [ ] test ผ่าน interface ของ engine: หลาย Battle หลาย Dice Seed เล่นซ้ำได้ผลเดิม และ Replay ที่ hash ไม่ตรงถูกปฏิเสธ

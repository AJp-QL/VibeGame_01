# P1X-16 — UI: Board 9x9

**Owner:** codex

**What to build:** ผู้เล่นเลือก Board 9x9 ได้ในเมนูคู่กับ 7x7 Board 9x9 พอดีจอกว้าง 375 px (ช่องราว 37 px) แตะได้แม่นและไม่มี horizontal scroll art และ legend ของ terrain ครบ และ visual fixtures/baseline ตรงกับ data ใหม่ (spec user stories 44–45)

**Blocked by:** P1X-15 — contract ค่าคงที่ขนาด Board และเพิ่ม Board 9x9

**Status:** ready-for-agent

- [ ] เมนูแสดง Board 9x9 พร้อม mini Board
- [ ] Board 9x9 เล่นได้ที่ desktop และ 360/375 px ไม่มี horizontal scroll, แตะถูกช่อง
- [ ] screenshot ของ 9x9 อย่างน้อย 1 ฉาก; visual fixtures บันทึกใหม่ตาม data ปัจจุบัน baseline ตรวจด้วยตา
- [x] `boardBlurb` ของ `grand_crossroads` และ `wide_shallows`: ทำใน P1X-31 (merge ก่อน P1X-15)
- [ ] CI เขียวทั้งสาม job

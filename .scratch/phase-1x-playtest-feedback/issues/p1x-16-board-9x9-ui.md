# P1X-16 — UI: Board 9x9

**Owner:** codex

**What to build:** ผู้เล่นเลือก Board 9x9 ได้ในเมนูคู่กับ 7x7 Board 9x9 พอดีจอกว้าง 375 px (ช่องราว 37 px) แตะได้แม่นและไม่มี horizontal scroll art และ legend ของ terrain ครบ และ visual fixtures/baseline ตรงกับ data ใหม่ (spec user stories 44–45)

**Blocked by:** P1X-15 — contract ค่าคงที่ขนาด Board และเพิ่ม Board 9x9

**Status:** ready-for-human

- [x] เมนูแสดง Board 9x9 พร้อม mini Board
- [x] Board 9x9 เล่นได้ที่ desktop และ 360/375 px ไม่มี horizontal scroll, แตะถูกช่อง
- [x] screenshot ของ 9x9 อย่างน้อย 1 ฉาก; visual fixtures บันทึกใหม่ตาม data ปัจจุบัน baseline ตรวจด้วยตา
- [x] `boardBlurb` ของ `grand_crossroads` และ `wide_shallows`: ทำใน P1X-31 (merge ก่อน P1X-15)
- [ ] CI เขียวทั้งสาม job

## Implementation / review

Board size labels distinguish 7×7 and 9×9 in the menu. Existing variable-size
rendering and mini Boards support both bundled 9×9 maps. The visual harness now
uses those real maps and tests selection, movement beyond column seven,
bottom-right inspection, all terrain swatches, and menu → Battle at desktop,
360 px and 375 px. Twelve new baselines were captured with pinned Chromium on
Linux; every one of the 39 baselines was inspected.

Fixture regeneration is unchanged because main already has the current
engineVersion/dataHash; the replay compatibility check passes.

[Visual review and every image](../evidence/p1x-16-board-9x9-ui/README.md).

CI acceptance remains pending until all three PR jobs pass.

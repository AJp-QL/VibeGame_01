# P1X-02 — UI: ยืนยันก่อนเปลี่ยน Unit, คำเตือนจบ Turn, ข้อความ Camouflage และ refresh visual fixtures

**Owner:** codex

**What to build:** เมื่อผู้เล่นเริ่ม Unit อื่นขณะที่ Unit ปัจจุบันยังใช้ Action ได้ เกมถามก่อนว่า "X ยังใช้ Action ได้ เริ่ม Y เลยไหม" มีปุ่ม "เริ่ม Y" กับ "กลับไปเล่น X" คำเตือนตอนจบ Turn บอกรวม Unit ที่เดินแล้วแต่ยังไม่ใช้ Action ด้วย และคำอธิบาย Camouflage บอกว่าศัตรูที่ยืนติดกันยังเล็ง Unit ที่ Hidden ได้ (spec user stories 28–31, 37) ใช้ข้อมูลจาก session ที่ ticket 01 เพิ่ม และเพราะ ticket 01 ขยับ ENGINE_VERSION ต้องบันทึก visual fixtures ใหม่และตรวจ baseline ทุกภาพตาม AGENTS.md

**Blocked by:** P1X-01 — Inspiration เฉพาะเมื่อพลาด และข้อมูลการเปลี่ยน Unit / จบ Turn ใน session

**Status:** done

- [x] dialog ยืนยันก่อนเปลี่ยน Unit ขึ้นเฉพาะเมื่อ session บอกว่าจะจบ Unit ที่ยังใช้ Action ได้ และไม่ขึ้นในกรณีอื่น
- [x] คำเตือนจบ Turn แสดง Unit ที่เดินแล้วแต่ยังไม่ใช้ Action
- [x] คำอธิบาย Camouflage มีประโยคเรื่องศัตรูที่ยืนติดกัน
- [x] ข้อความทั้งหมดอยู่ใน strings ของ web มี text test
- [x] visual fixtures บันทึกใหม่ด้วย engine ปัจจุบัน baseline ตรวจด้วยตาทุกภาพ CI เขียวทั้งสาม job (ไม่มีคำเตือน fixtures stale)


## Comments

- Uses `snapshot.actionAtStake` to hold a Move, Defend, attack, skill, or Command
  before starting another Unit. Selecting/inspecting alone does not start an
  activation. Confirm runs the held command once; Return/Escape reselects the
  current Unit without spending its Action. Stale commands are discarded.
- End Turn combines idle Units with `snapshot.movedWithoutAction`; all new
  player-facing text lives in web strings. Camouflage now explains adjacent
  enemies can target Hidden Units.
- Regenerated all fixtures for ENGINE_VERSION 0.10.0 using `visual:fixtures`;
  updated Linux baselines with pinned Chromium and inspected all 19 images.
- [Desktop/mobile screenshots and per-image inspection notes](../evidence/02-quick-ui-fixes/README.md).
- Validation: frozen install, typecheck, 813 tests passed (1 intentional skip),
  build, path ownership check (33 files), Replay validation, visual update
  (19/19), and three visual comparisons (57/57) passed. Desktop and 360 px
  browser interaction checks passed.
- [PR #25](https://github.com/AJp-QL/VibeGame_01/pull/25).
  [CI run](https://github.com/AJp-QL/VibeGame_01/actions/runs/39042308791):
  build, ownership, and Board visual regression all green; fixtures match.

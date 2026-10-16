# 19 — Tuning: บาลานซ์ทีม A กับ B ให้ใกล้ 50% และลด Battle ที่ยื้อถึง turn limit

**What to build:** ทั้ง 4 ชุด (Scenario 1/2 × Crossroads/Shallows) เล่นกับ AI แล้วทั้งสองทีมมีโอกาสชนะใกล้กัน ผู้เล่นที่เลือกทีม B ไม่รู้สึกว่าเสียเปรียบตั้งแต่ต้น และ Battle ส่วนใหญ่จบก่อน turn limit ตอนนี้ (baseline, engine 0.7.0) ทีม A ชนะ 63–88% และ S1 Crossroads จบด้วย turn limit 26% ดู docs/balance/phase-1-baseline.md ใช้ simulator ปรับตัวเลขใน data/ เป็นหลัก

**Blocked by:** 18 — Tuning: Marked อยู่ถึงจบ Turn ถัดไปของฝั่งผู้ Mark

**Status:** ready-for-agent

- [ ] ทุกชุด (S1/S2 × Crossroads/Shallows) ด้วย AI โปรไฟล์ในเกม (game:greedy ทั้งสองฝั่ง) ทีม A ชนะ 40–60% วัดอย่างน้อย 2,000 Battle ต่อชุด
- [ ] Battle ที่จบด้วย turn limit ไม่เกิน 15% ทุกชุด
- [ ] การเปลี่ยนเป็นตัวเลขใน data/ ที่มองเห็นได้ (species, skill, status, Scenario, Board) ไม่ฝังข้อยกเว้นในโค้ด แต่ละการเปลี่ยนมีแถวใน decision log พร้อมเหตุผลและผล simulator
- [ ] ถ้าปรับแค่ data แล้วไม่ถึงเป้า ให้หยุดแล้วรายงานทางเลือกที่ต้องแก้กติกา 2–3 ทาง พร้อมผล simulator ของแต่ละทาง แทนการแก้กติกาเอง
- [ ] ค่าที่ได้จากสูตรที่ test ตาราง kit อ้างอิงไว้ ถ้าเปลี่ยนต้องอัปเดต test และ rules §20 ให้ตรงกัน และไม่ทำให้การเทียบผลกับ sim v4 (sim-equivalent) พัง
- [ ] รายงาน balance ใหม่ (ก่อน/หลัง ทุกชุด) และอัปเดต docs/balance/phase-1-baseline.md

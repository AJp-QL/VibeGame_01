# 19 — Tuning: บาลานซ์ทีม A กับ B ให้ใกล้ 50% และลด Battle ที่ยื้อถึง turn limit

**Owner:** claude

**What to build:** ทั้ง 4 ชุด (Scenario 1/2 × Crossroads/Shallows) เล่นกับ AI แล้วทั้งสองทีมมีโอกาสชนะใกล้กัน ผู้เล่นที่เลือกทีม B ไม่รู้สึกว่าเสียเปรียบตั้งแต่ต้น และ Battle ส่วนใหญ่จบก่อน turn limit ตอนนี้ (baseline, engine 0.7.0) ทีม A ชนะ 63–88% และ S1 Crossroads จบด้วย turn limit 26% ดู docs/balance/phase-1-baseline.md ใช้ simulator ปรับตัวเลขใน data/ เป็นหลัก

**Blocked by:** 23 — AI ในเกมให้คุณค่า Mark ข้าม Turn และ skill ที่ไม่ถูกใช้

**Status:** needs-info

- [x] ทุกชุด (S1/S2 × Crossroads/Shallows) ด้วย AI โปรไฟล์ในเกม (game:greedy ทั้งสองฝั่ง) ทีม A ชนะ 40–60% วัดอย่างน้อย 2,000 Battle ต่อชุด
- [x] Battle ที่จบด้วย turn limit ไม่เกิน 15% ทุกชุด
- [ ] Hex และ Camouflage ถูกใช้มากกว่า 0.1 ครั้งต่อ Battle ในอย่างน้อย 2 ชุด (ต่อจาก ticket 23 ซึ่งผ่านแค่ชุดเดียว ดู docs/balance/ticket-23-ai-skills.md) โดยปรับตัวเลขใน data/ ไม่ใช่ดันค่าใน AI
- [x] การเปลี่ยนเป็นตัวเลขใน data/ ที่มองเห็นได้ (species, skill, status, Scenario, Board) ไม่ฝังข้อยกเว้นในโค้ด แต่ละการเปลี่ยนมีแถวใน decision log พร้อมเหตุผลและผล simulator
- [x] ถ้าปรับแค่ data แล้วไม่ถึงเป้า ให้หยุดแล้วรายงานทางเลือกที่ต้องแก้กติกา 2–3 ทาง พร้อมผล simulator ของแต่ละทาง แทนการแก้กติกาเอง
- [x] ค่าที่ได้จากสูตรที่ test ตาราง kit อ้างอิงไว้ ถ้าเปลี่ยนต้องอัปเดต test และ rules §20 ให้ตรงกัน และไม่ทำให้การเทียบผลกับ sim v4 (sim-equivalent) พัง
- [x] รายงาน balance ใหม่ (ก่อน/หลัง ทุกชุด) และอัปเดต docs/balance/phase-1-baseline.md

## Note (2026-10-16, branch claude/19-team-balance)

ผล 2,000 เกม/ชุด (game:greedy ทั้งสองฝั่ง, seed 0): A ชนะ 50.7/43.1/59.7/51.9%, turn limit 11.3/4.3/2.4/1.1%, Hex 0.25/0.61/0.20/0.19 ต่อ Battle (S1C/S1S/S2C/S2S) ผ่าน
Camouflage 0.015/0/0/0 ไม่ผ่าน: data อย่างเดียวไปไม่ถึง (แม้ตัดเงื่อนไข terrain ทิ้งก็ได้ >0.1 ชุดเดียว) หยุดตามข้อ 5 และเสนอทางแก้กติกา 3 ทางพร้อมผล simulator ใน docs/balance/ticket-19-team-balance.md
ต้องการการตัดสินใจ (ตัดสินแล้ว ดู note ถัดไป): เปิด ticket กติกาสำหรับ Camouflage (แนะนำ: Camouflage ไม่กิน Action) หรือยอมรับให้ Camouflage เป็น skill เฉพาะสถานการณ์และตัดเกณฑ์ข้อ 3 ส่วน Camouflage แล้วปิด ticket นี้

## Note (2026-10-16, ticket 27)

ผู้ใช้เลือกทางเลือก A: Camouflage ไม่กิน Action ข้อ 3 ส่วน Camouflage จึง **blocked by 27** — กติกา: Camouflage ไม่กิน Action (.scratch/phase-1-battle-slice/issues/27-camouflage-free-action.md) วัดผลใหม่หลัง 27

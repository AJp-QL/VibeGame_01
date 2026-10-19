# P1X-36 — ปรับ Board 9x9 ให้ผ่านเป้า balance และให้ AI เข้าหาศัตรู (approach phase)

**Owner:** claude

**What to build:** ผู้ใช้ยอมรับรายงาน P1X-20 (2026-10-19, decision log): คงกติกาของเกมตาม ticket 09 และหา approach phase จาก Board 9x9 แทน แต่ P1X-15 (`docs/balance/ticket-15-board-9x9.md`, `ticket-15-findings.md`) พบว่า Board 9x9 ทั้งสองอันพลาดเป้าทั้ง 4 ชุด (2,000 Battle ต่อชุด, AI ของเกมทั้งสองฝั่ง):

| ชุด | A ชนะ | ถึง Turn limit | Turn ก่อนโจมตีครั้งแรก |
|---|---|---|---|
| S1 grand_crossroads | 43.2% | **32.2%** | 4.12 |
| S1 wide_shallows | 46.3% | **16.5%** | 1.67 |
| S2 grand_crossroads | **79.5%** | **20.8%** | 0.51 |
| S2 wide_shallows | **64.9%** | 11.7% | 0.00 |

เป้า (spec user story 41): A ชนะ 40–60%, ถึง Turn limit ไม่เกิน 15% ทุกชุด และ AI เล่นบน 9x9 ได้สมเหตุสมผล (user story 46, P1X-15 ทำได้แค่บางส่วน: AI น่าจะรอยิงหลังภูเขาแทนการเดินเข้าหา) ตอนนี้ Board 9x9 อยู่ในเมนูบน main แล้วทั้งที่ยังพลาดเป้า

ทำตามลำดับที่ findings แนะนำ วัดใหม่ด้วย `sim boards --games 2000 --seed 0` หลังแต่ละขั้น และหยุดเมื่อผ่านเป้า:
1. **data อย่างเดียว:** ลด/ย้ายภูเขาบน `grand_crossroads` (8 ภูเขา + กลางกว้าง 9 ทำให้ AI รอ; `wide_shallows` มี 6 และดีกว่า) Board ยังหมุน 180° แล้วเหมือนเดิม และ start zone เดิม
2. **AI:** เมื่อ Unit ยิงอะไรไม่ได้ใน Turn นี้ ให้เดินเข้าใกล้ศัตรู (ลดระยะ หรือเข้าไปในระยะ Turn หน้า) แทนการรอ โดยใช้ helper ของ engine/session (`threatReach`, `longestAttackReach`, Threat zone) ไม่สร้างกติกาเอง ต้องไม่ทำให้ 7x7 หลุดเป้า (วัด 7x7 ซ้ำ) และ `SIM_PROFILES` / sim-v4 parity ไม่เปลี่ยน
3. ถ้าหลัง 1–2 แล้ว Turn limit ยังเกิน 15% หรือ S2 ยังเอียงไปทาง A: **หยุดและเสนอผู้ใช้** ทางที่เปลี่ยนกติกา (Turn limit ตามขนาด Board เช่น 10 → 14, start zone ใกล้ขึ้นบน 9x9) หรือยอมรับ 9x9 เป็นโหมดช้ากว่าโดยผ่อนเป้า ห้ามเปลี่ยนกติกาโดยไม่มีการตัดสินใจของผู้ใช้

การเปลี่ยน `data/` ทำให้ dataHash และ visual fixtures ล้าสมัย: ใส่หมายเหตุใน P1X-16 (Codex, refresh fixtures ของ 9x9 อยู่แล้ว) หรือเปิด ticket `Owner: codex` refresh fixtures ตาม AGENTS.md ถ้า P1X-16 merge ไปก่อน การแก้ AI อย่างเดียวไม่ขยับ ENGINE_VERSION; ถ้าขั้น 3 เปลี่ยนกติกาต้องขยับตามกฎ

**Blocked by:** None — P1X-15 merged (PR #52)

**Status:** ready-for-agent

- [ ] ขั้น 1 (data) วัดแล้ว ผลอยู่ในรายงานใหม่ `docs/balance/ticket-36-tune-9x9.md` เทียบกับ ticket 15 ทุกชุด รวม 7x7
- [ ] ขั้น 2 (AI เดินเข้าหาเมื่อยิงไม่ได้) มี test ใน `packages/ai` และวัดแล้วทั้ง 9x9 และ 7x7; 7x7 ยังผ่านเป้าทุกชุด; sim-v4 parity ผ่าน
- [ ] Board 9x9 ผ่านเป้าทุกชุด หรือรายงานหยุดที่ขั้น 3 พร้อมทางเลือกให้ผู้ใช้ตัดสิน (ไม่เปลี่ยนกติกาเอง)
- [ ] ทุกการเปลี่ยน data/AI มีแถว decision log พร้อมผล simulator; rules.md อัปเดตถ้า Board เปลี่ยน
- [ ] fixtures: หมายเหตุใน P1X-16 หรือ ticket Codex refresh; typecheck, test, build, path check, `check-replays` ผ่าน (exit 3 = stale ได้ถ้ามี ticket refresh)

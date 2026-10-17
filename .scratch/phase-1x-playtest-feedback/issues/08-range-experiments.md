# 08 — ทดลองระยะ skill ใน simulator

**Owner:** claude

**What to build:** รายงานที่ช่วยผู้ใช้เลือกวิธีแก้ "ระยะ skill ไม่เข้ากับขนาด Board" (ระยะ 4 บน Board 7x7 ถึงทุกช่อง): simulator รันได้ 3 variant แยกกันโดยไม่เปลี่ยนเกมจริง (a) ลดระยะใน data (เริ่มที่ Long Shot, Element Bolt, Pin 4 → 3 และ Mark 5 → 4) (b) disadvantage เมื่อโจมตีที่ระยะ 4 ขึ้นไป (สวิตช์กติกา) (c) terrain ที่บัง line of sight วางบน Board และมีตัวชี้วัดใหม่ "จำนวน Turn ก่อนการโจมตีครั้งแรก" รายงานเทียบ baseline กับแต่ละ variant และชุดผสมที่น่าสนใจ แล้วแนะนำชุดหนึ่งพร้อมเหตุผล (spec: Range experiments, user stories 38–43)

**Blocked by:** 01 — Inspiration เฉพาะเมื่อพลาด (วัดด้วยกติกา Inspiration ใหม่)

**Status:** in progress (waiting for the user to choose a combination; ticket 09 starts after)

- [x] simulator มี variant ทั้งสามแบบเลือกได้จาก CLI โดยไม่เปลี่ยน data/ และกติกาของเกมจริง; SIM_PROFILES และ sim-v4 parity ไม่เปลี่ยน
- [x] ตัวชี้วัดใหม่ "Turn ก่อนการโจมตีครั้งแรก" มี test
- [x] ทุก variant วัด ≥ 2,000 Battle ต่อชุด (Scenario 1/2 × Crossroads/Shallows) ด้วย game profile ทั้งสองฝั่ง: A win %, turn limit %, Turn ก่อนการโจมตีครั้งแรก, การใช้ skill
- [x] รายงานใน docs/balance เทียบทุก variant และแนะนำชุดผสม ระบุว่าส่วนไหนเป็นการแก้ data และส่วนไหนเป็นการแก้กติกา (ENGINE_VERSION)
- [ ] หยุดแล้วรอผู้ใช้เลือกชุดก่อน ticket 09

## Comments

- Report: `docs/balance/ticket-08-range-experiments.md` (+ `.json`), 64,000 Battles, `corepack pnpm sim ranges --games 2000 --seed 0`. Recommendation: variant c alone (mountains block sight + four extra mountain tiles per Board); a is rejected (turn limit 19.6%, team A up to 65%), b is balance-neutral but does not move the first-attack Turn. The effect of c is real but small and only on Crossroads; a bigger Board (tickets 14-16) is the stronger lever.
- Engine switches `VariantRules` (long-range disadvantage, sight-blocking terrain) are off in play, so no `ENGINE_VERSION` bump and sim-v4 parity is unchanged (all 887 tests pass). Last checkbox (user chooses the combination) is open: ticket 09 waits for that choice.

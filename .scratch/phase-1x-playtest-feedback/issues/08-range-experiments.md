# 08 — ทดลองระยะ skill ใน simulator

**Owner:** claude

**What to build:** รายงานที่ช่วยผู้ใช้เลือกวิธีแก้ "ระยะ skill ไม่เข้ากับขนาด Board" (ระยะ 4 บน Board 7x7 ถึงทุกช่อง): simulator รันได้ 3 variant แยกกันโดยไม่เปลี่ยนเกมจริง (a) ลดระยะใน data (เริ่มที่ Long Shot, Element Bolt, Pin 4 → 3 และ Mark 5 → 4) (b) disadvantage เมื่อโจมตีที่ระยะ 4 ขึ้นไป (สวิตช์กติกา) (c) terrain ที่บัง line of sight วางบน Board และมีตัวชี้วัดใหม่ "จำนวน Turn ก่อนการโจมตีครั้งแรก" รายงานเทียบ baseline กับแต่ละ variant และชุดผสมที่น่าสนใจ แล้วแนะนำชุดหนึ่งพร้อมเหตุผล (spec: Range experiments, user stories 38–43)

**Blocked by:** 01 — Inspiration เฉพาะเมื่อพลาด (วัดด้วยกติกา Inspiration ใหม่)

**Status:** ready-for-agent

- [ ] simulator มี variant ทั้งสามแบบเลือกได้จาก CLI โดยไม่เปลี่ยน data/ และกติกาของเกมจริง; SIM_PROFILES และ sim-v4 parity ไม่เปลี่ยน
- [ ] ตัวชี้วัดใหม่ "Turn ก่อนการโจมตีครั้งแรก" มี test
- [ ] ทุก variant วัด ≥ 2,000 Battle ต่อชุด (Scenario 1/2 × Crossroads/Shallows) ด้วย game profile ทั้งสองฝั่ง: A win %, turn limit %, Turn ก่อนการโจมตีครั้งแรก, การใช้ skill
- [ ] รายงานใน docs/balance เทียบทุก variant และแนะนำชุดผสม ระบุว่าส่วนไหนเป็นการแก้ data และส่วนไหนเป็นการแก้กติกา (ENGINE_VERSION)
- [ ] หยุดแล้วรอผู้ใช้เลือกชุดก่อน ticket 09

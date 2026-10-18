# P1X-01 — Inspiration เฉพาะเมื่อพลาด และข้อมูลการเปลี่ยน Unit / จบ Turn ใน session

**Owner:** claude

**What to build:** ผู้เล่นไม่ถูกถาม Inspiration หลังทอยโดนเองอีก: Inspiration เสนอเฉพาะเมื่อ attack roll ของฝั่งตัวเองพลาด (รวม Mark, ทุกเป้าของ Burst, counterattack) หรือ save ของฝั่งตัวเองไม่ผ่าน และ initiative ให้ฝั่งที่แพ้ตามเดิม (spec: Inspiration, user stories 32–36) และ session บอก UI ได้ว่าการเริ่ม Unit อื่นจะจบ activation ของ Unit ปัจจุบันที่ยังใช้ Action ได้หรือไม่ (Unit ไหน) และรายชื่อ Unit ที่เดินแล้วแต่ยังไม่ใช้ Action เพื่อใช้ใน dialog ยืนยันและคำเตือนตอนจบ Turn (user stories 28–31) ข้อมูลใหม่ใน snapshot เป็นแบบเพิ่มเท่านั้น

**Blocked by:** None — can start immediately

**Status:** done

- [x] rules §18 และตาราง Inspiration แก้ตามกติกาใหม่ มี D-row ใน §23 และแถวใน decision log
- [x] engine ไม่เสนอ Inspiration เมื่อโดน และยังเสนอเมื่อพลาด, save ไม่ผ่าน, initiative (test ผ่าน interface ของ engine ทุกกรณีรวม Burst หลายเป้าและ counterattack)
- [x] ENGINE_VERSION ขยับ minor (0.9.0 → 0.10.0) ใน commit เดียวกัน; SIM_PROFILES และ sim-v4 parity ผ่านเหมือนเดิม; AI ยัง deterministic
- [x] snapshot ของ session มีข้อมูล "เริ่ม Unit อื่นจะจบ Unit ที่ยังใช้ Action ได้" และ "Unit ที่เดินแล้วแต่ยังไม่ใช้ Action" มี test ผ่าน session (รวมกรณี Unit ปัจจุบันไม่มี Action ที่ทำได้แล้ว = ไม่ต้องเตือน)
- [x] เปิด ticket 02 (Codex) ให้ refresh visual fixtures ตามกฎใน AGENTS.md (ticket 02 ครอบแล้ว: ยังต้องทำก่อนที่ job ภาพจะเทียบภาพอีก ENGINE_VERSION 0.10.0 ทำให้ fixture ล้าสมัย job จะเตือนแต่ยังเขียว)

## Comments

- Engine: `rollD20` offers Inspiration only when the roll went against its owner (miss / failed save); initiative unchanged. 22 tests rewritten to the new rule (misses scripted), new cases for hit and passed save not offered; replay tests use `declineEveryOffer` in `test/fixtures.ts`. ENGINE_VERSION 0.10.0, rules §18/§21.6, D-29. Sim parity and AI tests pass unchanged apart from the AI test that expected a passed save to be offered.
- Session: `snapshot.actionAtStake` and `snapshot.movedWithoutAction` (+ exported functions), tests in `packages/session/test/sessionSwitch.test.ts`.
- Merged in PR #21.

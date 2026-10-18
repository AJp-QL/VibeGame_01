# 09 — ใช้ชุดแก้ระยะ skill ที่ผู้ใช้เลือก

**Owner:** claude

**What to build:** เกมจริงใช้ชุดแก้ระยะที่ผู้ใช้เลือกจากรายงานของ ticket 08: ตัวเลขใน data และ/หรือกติกาใหม่ (disadvantage ระยะไกล, terrain บัง line of sight) ตำแหน่งจึงมีผลต่อการเล่น และ balance ยังอยู่ในเป้า (spec: Range experiments, user stories 38, 41–43)

**Blocked by:** 08 — ทดลองระยะ skill ใน simulator และการเลือกชุดของผู้ใช้ (บันทึกใน decision log)

**Status:** in progress (PR open; one target open, see Comments)

- [x] data และ/หรือกติกาตามชุดที่ผู้ใช้เลือก; กติกาใหม่มี D-row ใน rules §23, ตาราง kit §20 และ test ตรงกัน, ทุกการเปลี่ยนมีแถว decision log พร้อมผล simulator
- [x] ENGINE_VERSION ขยับถ้ากติกาเปลี่ยน; กติกาใหม่อยู่นอก sim-equivalent layer (แบบ ticket 27) ทำให้ sim-v4 parity ผ่าน
- [ ] ≥ 2,000 Battle ต่อชุด: ทีม A ชนะ 40–60%, turn limit ≤ 15%, Turn ก่อนการโจมตีครั้งแรกสูงกว่า baseline ทุกชุด; รายงานและ docs/balance/phase-1-baseline.md อัปเดต
- [x] AI ในเกมใช้กติกาใหม่ได้ (เช่นเลี่ยงยิงจากระยะที่เสีย advantage) และยัง deterministic
- [x] ticket 10 (Codex) ระบุว่าต้อง refresh visual fixtures

## Comments

- The user chose **a+b+c** on 2026-10-18 (decision log). Applied: skill ranges in data, four extra mountains per Board in data, `RangeRules` on by default in the engine (`GAME_RANGE_RULES`), `ENGINE_VERSION` 0.11.0, rules §2.2, §5.1, §7.2, §15.1, D-31.
- sim-equivalent layer: old ranges, plain Boards and `NO_RANGE_RULES` (`simEquivalentData`, `packages/ai/test/simParity/rebuild.ts`), so sim-v4 parity and the decision parity with sim.py still hold. Engine and session rule tests run on the kit as before ticket 09 (`fixtures.ts`, `kit.ts`); the new data and rules have their own tests.
- **Open: the third target** (Turns before the first attack higher than before in *every* set) is met on Crossroads (S1 0.32 -> 0.44, S2 0.00 -> 0.20) but not on Shallows (S1 0.000 -> 0.002, S2 0.000), as the ticket 08 report said. The checkbox stays open; options are in `docs/balance/ticket-09-range-rules.md` (more sight blockers on Shallows as a measured variant, or the 9x9 Boards).
- Blocked on Codex ticket 21 (one web unit test fails with the new mountains) before the PR can merge green. Ticket 10 refreshes the visual fixtures and explains the new rules in the UI.

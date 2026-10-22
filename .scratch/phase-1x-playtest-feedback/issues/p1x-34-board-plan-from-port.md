# P1X-34 — UI: Board อ่านข้อมูล Action plan จาก port

**Owner:** codex

**What to build:** หลัง P1X-32 ให้ `packages/battle/src/BattleScene.ts` เลิกใช้ `type PlanSnapshot = BattleSnapshot & Partial<Pick<SessionSnapshot, …>>` และอ่าน `attackable`, `plan`, `mode` จาก `BattleSnapshot` ตรง (เหมือน `threatZone`) ผู้เล่นเห็นเหมือนเดิม screenshot ไม่เปลี่ยน

**Blocked by:** P1X-32 — port ของ Board: ข้อมูล Action plan; P1X-24 — UI: Action plan (PR #61)

**Status:** done

- [x] ไม่มี type ที่ขยาย `BattleSnapshot` เองใน packages/battle; อ่านจาก port ที่ P1X-32 เพิ่ม
- [x] screenshot ไม่เปลี่ยน (หรือ update baseline และตรวจทุกภาพถ้าเปลี่ยน); CI เขียวทั้งสาม job

## Implementation notes

- Read Action plan fields directly from `BattleSnapshot`; Replay ports retain the optional-field fallback. No rendering behavior change.
- Plan tile taps go through session input; Move preview and action confirmation only intercept tile taps when no plan is active. A regression test verifies origin selection does not ask to abandon another Unit before confirmation.
- Validation: frozen install, typecheck, production build, 1,086 tests passed (one existing skip), and Replay checks passed. Board visual comparison passed (37/37, unchanged baselines); path ownership check passed. All three [PR CI jobs](https://github.com/AJp-QL/VibeGame_01/actions/runs/39726099735) passed on implementation commit `11cbb39`.

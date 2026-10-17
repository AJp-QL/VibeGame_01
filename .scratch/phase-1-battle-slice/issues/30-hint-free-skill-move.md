# 30 — UI: hint ของ Unit ที่ยังเดินได้และยังใช้ skill ฟรีได้ บอกครบทั้งสองอย่าง

**Owner:** codex

**What to build:** ตั้งแต่ ticket 28 hint ใน TurnPanel (`turnHint`) เช็ค "ยังใช้ skill ฟรีได้" ก่อนเช็คการเดิน: ถ้า Unit ใช้ Action แล้ว (`hasActed`) และมีปุ่ม skill ที่ `free === true && usable` จะคืน `th.hintFreeSkill(...)` ทันที กรณี Quillfox ยืนบนป่า ยิง Long Shot ก่อนแล้วยังไม่ได้เดิน hint จึงบอกแค่ "ยังใช้ Camouflage ได้ (ไม่ใช้ Action)" แต่ไม่บอกว่ายังเดินได้ ทั้งที่ยังเดินได้ (พบตอน review PR #11) ให้ hint บอกครบ: ยังเดินได้ และยังใช้ skill ฟรีได้ ส่วนกรณีที่เดินแล้วและใช้ Action แล้วให้คงข้อความเดิมของ ticket 28

**Session API (มีแล้ว ไม่ต้องขอเพิ่ม):** `UnitState.hasMoved` / `hasActed`, `SessionSnapshot.skills[].free` / `usable`, `SessionSnapshot.canAttack` / `canDefend`

**Blocked by:** None — can start immediately

**Status:** done

- [x] Unit ที่ใช้ Action แล้ว ยังไม่เดิน และยังใช้ skill ฟรีได้ เห็น hint ที่บอกทั้ง "ยังเดินได้" และ "ยังใช้ <skill> ได้ (ไม่ใช้ Action)"
- [x] Unit ที่เดินแล้วและใช้ Action แล้วแต่ยังใช้ skill ฟรีได้ ยังเห็น `th.hintFreeSkill` แบบเดิม (test ของ ticket 28 ผ่าน)
- [x] ข้อความใหม่อยู่ใน `packages/web/src/strings.ts` มี test ข้อความใน `packages/web/test/sessionText.test.ts`
- [x] PR จาก branch `codex/30-…` CI เขียวทั้งสาม job

## Comments

2026-10-17 — Codex: Added `th.hintMoveAndFreeSkill` and selected it only after
Action when Move is unspent and a free skill is usable. Regression coverage uses
a real session: Quillfox on e7 uses Long Shot before moving, then moves to f7.
The existing Move + Action Camouflage test remains passing. Text tests: 12/12;
web tests: 39/39; engine tests: 529/529. Direct typecheck, production build and
Replay compatibility check passed using integrity-checked cached dependencies.
Frozen install could not reach the registry in this sandbox. The ownership
library accepts every changed path, but the CLI's Git subprocess reports EPERM.
Pinned Playwright is missing from the cache; visual compilation cannot resolve
`@playwright/test`. System Chromium also fails with a sandbox socket EPERM, so
desktop/mobile evidence could not be captured. CI acceptance remains pending.

CI verification: [PR #16 run 39021499529](https://github.com/AJp-QL/VibeGame_01/actions/runs/39021499529)
passed all three jobs: frozen install, typecheck, 757 tests passed / 1 skipped,
production build, ownership check, Replay compatibility, pinned Chromium install
and Board visual regression. Desktop/mobile evidence remains unavailable locally.

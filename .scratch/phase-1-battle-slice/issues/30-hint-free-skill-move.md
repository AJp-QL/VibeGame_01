# 30 — UI: hint ของ Unit ที่ยังเดินได้และยังใช้ skill ฟรีได้ บอกครบทั้งสองอย่าง

**Owner:** codex

**What to build:** ตั้งแต่ ticket 28 hint ใน TurnPanel (`turnHint`) เช็ค "ยังใช้ skill ฟรีได้" ก่อนเช็คการเดิน: ถ้า Unit ใช้ Action แล้ว (`hasActed`) และมีปุ่ม skill ที่ `free === true && usable` จะคืน `th.hintFreeSkill(...)` ทันที กรณี Quillfox ยืนบนป่า ยิง Long Shot ก่อนแล้วยังไม่ได้เดิน hint จึงบอกแค่ "ยังใช้ Camouflage ได้ (ไม่ใช้ Action)" แต่ไม่บอกว่ายังเดินได้ ทั้งที่ยังเดินได้ (พบตอน review PR #11) ให้ hint บอกครบ: ยังเดินได้ และยังใช้ skill ฟรีได้ ส่วนกรณีที่เดินแล้วและใช้ Action แล้วให้คงข้อความเดิมของ ticket 28

**Session API (มีแล้ว ไม่ต้องขอเพิ่ม):** `UnitState.hasMoved` / `hasActed`, `SessionSnapshot.skills[].free` / `usable`, `SessionSnapshot.canAttack` / `canDefend`

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Unit ที่ใช้ Action แล้ว ยังไม่เดิน และยังใช้ skill ฟรีได้ เห็น hint ที่บอกทั้ง "ยังเดินได้" และ "ยังใช้ <skill> ได้ (ไม่ใช้ Action)"
- [ ] Unit ที่เดินแล้วและใช้ Action แล้วแต่ยังใช้ skill ฟรีได้ ยังเห็น `th.hintFreeSkill` แบบเดิม (test ของ ticket 28 ผ่าน)
- [ ] ข้อความใหม่อยู่ใน `packages/web/src/strings.ts` มี test ข้อความใน `packages/web/test/sessionText.test.ts`
- [ ] PR จาก branch `codex/30-…` CI เขียวทั้งสาม job

# P1X-29 — UI: ข้อความกติกาของระยะและแนวเล็งอ่านจาก session

**Owner:** codex

**What to build:** หลัง ticket 28 ให้ web เลิกคิดกติกาของระยะเอง (พบจาก review PR #45, ticket 10): ข้อความ "ขวางแนวเล็ง" บอกทั้ง Unit และภูเขาตามข้อมูลช่อง terrain ใหม่ของ `BlockedTarget` (เลิกใช้ "รายการ Unit ว่าง = ภูเขา" ใน `th.blockedBy`) และใน `skillText.ts` / `strings.ts` ระยะที่ได้ disadvantage ใช้ `GAME_RANGE_RULES.longRangeDisadvantageFrom` และระยะเริ่มตรวจแนวเล็งใช้ค่าที่ ticket 28 export แทนเลข 4 และ 2 ที่เขียนไว้ ข้อความที่มีเลขระยะรับเลขเป็นพารามิเตอร์ ผู้เล่นเห็นข้อความเหมือนเดิมยกเว้นกรณีที่ Unit และภูเขาขวางพร้อมกัน ซึ่งตอนนี้บอกครบ

**Blocked by:** P1X-28 — session บอกช่อง terrain ที่บังแนวเล็ง และระยะที่กติกาของระยะเริ่มใช้; P1X-10 — refresh visual fixtures หลังแก้ระยะ (PR #45)

**Status:** done

- [x] ข้อความแนวเล็งที่ถูกบังมาจาก `blockedBy` + ช่อง terrain ของ session; กรณี Unit อย่างเดียว, ภูเขาอย่างเดียว, ทั้งสองอย่าง มี text test
- [x] `skillText.ts` และ `strings.ts` ไม่มีเลข 4 หรือ 2 ของกติการะยะเขียนตายตัว; อ่านจาก `@mt/session`; text test เดิมผ่าน
- [x] ข้อความทั้งหมดอยู่ใน strings ของ web; screenshot ไม่เปลี่ยน (หรือ update baseline และตรวจทุกภาพถ้าเปลี่ยน); CI เขียวทั้งสาม job

## Comments

- Implemented range descriptions using `GAME_RANGE_RULES.longRangeDisadvantageFrom` and
  `LINE_OF_SIGHT_FROM` from `@mt/session`. Both targeting panels use the Unit and
  terrain blocker fields independently; combined blockers now name both.
- [Desktop/mobile captures and local validation](../evidence/29-range-text-from-session/README.md).
  934 tests passed, 1 skipped; all 27 screenshot comparisons passed without baseline
  updates. Replay fixtures match the build. All three CI jobs passed on
  [PR #56](https://github.com/AJp-QL/VibeGame_01/pull/56):
  [CI run](https://github.com/AJp-QL/VibeGame_01/actions/runs/39152025777).

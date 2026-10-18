# P1X-10 — UI: refresh visual fixtures และข้อความ skill หลังแก้ระยะ

**Owner:** codex

**What to build:** หลัง ticket 09 เปลี่ยน data/กติกา Replay fixture ของ test ภาพล้าสมัย ต้องบันทึกใหม่และตรวจ baseline ทุกภาพตาม AGENTS.md และถ้ามีกติกาใหม่ที่ผู้เล่นต้องรู้ (เช่น disadvantage ที่ระยะไกล หรือ terrain ที่บัง line of sight) คำอธิบาย skill, preview และ legend ของ terrain ต้องบอกให้ครบ

**Blocked by:** P1X-09 — ใช้ชุดแก้ระยะ skill ที่ผู้ใช้เลือก

**Status:** done

- [x] visual fixtures บันทึกใหม่ด้วย engine และ data ปัจจุบัน baseline ตรวจด้วยตาทุกภาพ ภาพที่เปลี่ยนมีภาพก่อน/หลังใน PR
- [x] ข้อความของกติกาใหม่ (ถ้ามี) อยู่ใน strings ของ web มี text test; terrain ใหม่ (ถ้ามี) มีสีและสัญลักษณ์บน Board และใน legend
- [x] CI เขียวทั้งสาม job ไม่มีคำเตือน fixtures stale

## Comments

- จาก review PR #34 (2026-10-18): disadvantage ระยะไกล (ระยะ 4 ขึ้นไป, D-31) **ไม่อยู่ใน** `AttackPreview.rollModeSources` แต่อยู่ใน flag แยก `AttackPreview.longRangeDisadvantage?: true` (`rollMode` คิดรวมแล้ว) UI ที่แสดงเหตุผลของ advantage/disadvantage ต้องอ่าน flag นี้ด้วย ไม่งั้นการทอยที่เสีย disadvantage จะแสดงเหตุผลไม่ครบ ภูเขาที่บัง line of sight มาทาง `blockedTargets` ตามเดิม Unit ที่บินมองข้ามภูเขาได้ ticket 27 แก้ doc ของ engine ให้ตรง

- Implementation: `AttackPreview.longRangeDisadvantage` is rendered separately from
  `rollModeSources`, including an otherwise empty source list and cancellation
  against advantage. Text tests use real Mark previews from the current session.
  Skill summaries use the current data ranges; the legend explains range 4+
  disadvantage, mountain sight blockers and the Flying exception. Empty blocker
  lists for terrain now say mountain in both targeting and Move preview panels.
- [Before/after review of every baseline](../evidence/10-fixtures-after-range/README.md).

- Validation: frozen install, typecheck, build and path ownership check passed;
  `pnpm test --maxWorkers=2 --testTimeout=60000`: 912 passed, 1 skipped.
  The default five-second timeout expired in four simulator cases on the cloud
  worker; the longer timeout changes no repository configuration.
- Linux pinned-Chromium baseline update: 27/27 passed. CI ran the normal test
  command and the normal screenshot comparisons; all three jobs passed and
  `check-replays` reported that all Replay files match this build, with no stale
  warning: https://github.com/AJp-QL/VibeGame_01/actions/runs/39131738991

# P1X-35 — UI: ปุ่ม Undo ซ่อน/ปิดตาม session และบอกเหตุผลที่ถูก

**Owner:** codex

**What to build:** หลัง P1X-33 ให้ `UndoControls.tsx` ซ่อนหรือปิดปุ่ม Undo ตาม field ใหม่ของ session แทนการคิดเองจาก `sideToAct` / `aiSide` / phase / outcome และข้อความเมื่อปิดบอกเหตุผลตามที่ session ส่งมา: ต้น Turn ("ยังไม่มี action ให้ย้อน") แยกจากหลังทอยลูกเต๋า (ผลการทอยย้อนไม่ได้) ตามที่ P1X-07 ขอ ("เมื่อปุ่มปิดเพราะเพิ่งทอยลูกเต๋า บอกเหตุผลให้ผู้เล่น") ข้อความอยู่ใน `strings.ts` ถ้า P1X-33 ให้ `undo()` คืนผล ใช้ค่านั้นแทนการเทียบ `undos` ก่อน/หลัง

**Blocked by:** P1X-33 — session บอกว่าปุ่ม Undo ซ่อนหรือปิด และเพราะอะไร; P1X-07 — UI Undo / Start over (PR #60)

**Status:** done

- [x] `UndoControls` ไม่มีกติกาการซ่อนของตัวเอง; ใช้ field ของ session
- [x] ข้อความเหตุผลแยกต้น Turn กับหลังทอย มี text test ทุกกรณี
- [x] screenshot ไม่เปลี่ยน (หรือ update baseline และตรวจทุกภาพถ้าเปลี่ยน); CI เขียวทั้งสาม job

## Implementation notes

- Render only the session `undoState`: hidden, disabled with the matching Thai reason, or available with its offer.
- Use the boolean returned by `undo()` to record accepted Undos; cover accepted/rejected commands and every display state in text tests.
- Browser coverage captures turn-start and after-roll reasons at 1280 px and 360 px. Board baselines remain unchanged.
- Validation: frozen install, typecheck, 1,092 tests passed (one existing skip), production build, path ownership check, Replay checks, and 37/37 visual tests passed. All three [PR CI jobs](https://github.com/AJp-QL/VibeGame_01/actions/runs/39726283218) passed on implementation/evidence commit `04c7408`.
- Inspected all four [desktop/mobile captures](../evidence/p1x-35-undo-reason-ui/README.md); both reasons are readable with no horizontal overflow.

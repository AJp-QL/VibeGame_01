# P1X-35 — UI: ปุ่ม Undo ซ่อน/ปิดตาม session และบอกเหตุผลที่ถูก

**Owner:** codex

**What to build:** หลัง P1X-33 ให้ `UndoControls.tsx` ซ่อนหรือปิดปุ่ม Undo ตาม field ใหม่ของ session แทนการคิดเองจาก `sideToAct` / `aiSide` / phase / outcome และข้อความเมื่อปิดบอกเหตุผลตามที่ session ส่งมา: ต้น Turn ("ยังไม่มี action ให้ย้อน") แยกจากหลังทอยลูกเต๋า (ผลการทอยย้อนไม่ได้) ตามที่ P1X-07 ขอ ("เมื่อปุ่มปิดเพราะเพิ่งทอยลูกเต๋า บอกเหตุผลให้ผู้เล่น") ข้อความอยู่ใน `strings.ts` ถ้า P1X-33 ให้ `undo()` คืนผล ใช้ค่านั้นแทนการเทียบ `undos` ก่อน/หลัง

**Blocked by:** P1X-33 — session บอกว่าปุ่ม Undo ซ่อนหรือปิด และเพราะอะไร; P1X-07 — UI Undo / Start over (PR #60)

**Status:** ready-for-agent

- [ ] `UndoControls` ไม่มีกติกาการซ่อนของตัวเอง; ใช้ field ของ session
- [ ] ข้อความเหตุผลแยกต้น Turn กับหลังทอย มี text test ทุกกรณี
- [ ] screenshot ไม่เปลี่ยน (หรือ update baseline และตรวจทุกภาพถ้าเปลี่ยน); CI เขียวทั้งสาม job

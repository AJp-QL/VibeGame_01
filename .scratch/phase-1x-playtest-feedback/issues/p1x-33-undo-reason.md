# P1X-33 — session บอกว่าปุ่ม Undo ซ่อนหรือปิด และเพราะอะไร

**Owner:** claude

**What to build:** ตอนนี้ `SessionSnapshot.undo` เป็น `UndoOffer | null` และ `null` ใช้ทั้งกรณีที่ปุ่มควร "ซ่อน" (Turn ของ AI, หน้าส่งเครื่อง, Battle จบ) และกรณีที่ปุ่มควร "ปิดพร้อมเหตุผล" (ยังไม่มี action หลังจุดปลอดภัย เช่นต้น Turn หรือเพิ่งทอยลูกเต๋า) PR #60 (P1X-07) จึงคิดกติกาการซ่อนเองใน `UndoControls.tsx` (`state.sideToAct === snapshot.aiSide`, phase, outcome) และแสดงข้อความเดียวทุกกรณี ("ยังไม่มี action ที่ย้อนกลับได้ ผลการทอยลูกเต๋าย้อนไม่ได้") ซึ่งผิดตอนต้น Turn ticket P1X-07 ต้องการ "เมื่อปุ่มปิดเพราะเพิ่งทอยลูกเต๋า บอกเหตุผลให้ผู้เล่น" (พบจาก review PR #60)

เพิ่ม field ใหม่แบบเพิ่มอย่างเดียว (ไม่เปลี่ยนความหมายของ `undo`): เช่น `undoState: { kind: 'available', offer } | { kind: 'disabled', reason: 'turn-start' | 'after-roll' } | { kind: 'hidden' }` (ชื่อและรูปให้ผู้ทำเลือก แต่ UI ต้องแยก "ซ่อน" กับ "ปิด" และเหตุผลได้โดยไม่คิดกติกาเอง) เหตุผลเป็น code ไม่ใช่ข้อความ (ข้อความอยู่ใน web) กติกาจุดปลอดภัยเดิม (rules §17.5, D-30) ไม่เปลี่ยน ENGINE_VERSION ไม่ขยับ ถ้าต้องให้ `undo()` บอกผลว่ารับหรือไม่ (PR #60 เทียบ `undos` ก่อนและหลังเอง) เพิ่มค่าคืนแบบเพิ่มอย่างเดียวได้

**Blocked by:** None — can start immediately

**Status:** done (PR TBD)

- [x] snapshot บอกได้ว่า Undo ใช้ได้ / ปิด (พร้อมเหตุผล: ต้น Turn, หลังการทอยหรือคำตอบ Inspiration ล่าสุด) / ซ่อน (Turn ของ AI, หน้าส่งเครื่อง, Battle จบ, deployment); `undo` เดิมความหมายเดิม
- [x] test ทุกกรณีรวม Hotseat ทั้งสองฝั่งและ vs AI
- [x] README ของ session อธิบาย field ใหม่และบอกให้ UI ไม่คิดกติกาการซ่อนเอง
- [x] typecheck, test, build, path check ผ่าน; ENGINE_VERSION ไม่เปลี่ยน

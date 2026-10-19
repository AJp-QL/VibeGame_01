# P1X-32 — port ของ Board: ข้อมูล Action plan (`attackable`, `plan`, `mode`)

**Owner:** claude

**What to build:** Board (packages/battle) ต้องวาดเครื่องหมายดาบบนศัตรูที่โจมตีได้, ช่องที่จะยืนโจมตีของ Action plan และรู้ว่ากำลังเล็งแบบไหน แต่ `BattleSnapshot` ใน `packages/session/src/port.ts` ยังไม่มีข้อมูลเหล่านี้ PR #61 (P1X-24) จึงประกาศ `type PlanSnapshot = BattleSnapshot & Partial<Pick<SessionSnapshot, 'attackable' | 'plan' | 'mode'>>` ใน `BattleScene.ts` เพื่อขยายสัญญาที่ Claude เป็นเจ้าของเอง (พบจาก review PR #61) เพิ่ม field แบบ optional ลงใน `BattleSnapshot` ตามแบบ `movePreview?` / `threatZone?` / `eventBatches?`: `attackable?`, `plan?`, `mode?` ชนิดเดียวกับใน `SessionSnapshot` session ใส่ค่าจริง (ค่าเดียวกับ `SessionSnapshot`) Replay player ไม่ใส่ (หรือใส่ค่าว่าง) เพิ่มอย่างเดียวตาม contract rule ของ AGENTS.md ไม่เปลี่ยน engine จึงไม่ขยับ ENGINE_VERSION

**Blocked by:** None — can start immediately

**Status:** done (PR pending)

- [x] `BattleSnapshot.attackable?`, `plan?`, `mode?` (optional, doc comment) ใน `port.ts`; ชนิดที่ใช้ export จาก `@mt/session` ครบ
- [x] session ส่งค่าเดียวกับ `SessionSnapshot`; Replay player ไม่ส่งหรือส่งค่าว่าง; test ระดับ port (ชนิดและค่า) ใน session
- [x] README ของ session บอก field ใหม่ของ port และบอกว่า Board อ่านจาก port ไม่ cast
- [x] typecheck, test, build, path check ผ่าน; ENGINE_VERSION ไม่เปลี่ยน

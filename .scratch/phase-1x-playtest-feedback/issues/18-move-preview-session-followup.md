# 18 — Move preview ใน session: แตะ Unit ยกเลิกแค่ preview และ movePreview ใน BattleSnapshot

**Owner:** claude

**What to build:** แก้ช่องว่างสองข้อของ ticket 03 ที่พบจาก review PR #26 (ticket 04) (1) แตะ Unit ที่เลือกอยู่ขณะมี Move preview ต้องยกเลิกแค่ preview: Unit ยังถูกเลือก อยู่ในโหมดเดิม (เดิน: ช่องที่เดินได้ยังสว่าง; Blink: ยังเล็ง Blink อยู่ แต่ไม่มีช่องที่เลือก) ตอนนี้ `selectUnit` ล้างการเลือกทั้งหมด (toggle off) ซึ่งขัดกับ spec user story 3 "tap my Unit again to cancel the preview, so that I can go back to choosing" การแตะ Unit ครั้งถัดไป (ไม่มี preview แล้ว) ยกเลิกการเลือกเหมือนเดิม (2) เพิ่ม `movePreview` ลง `BattleSnapshot` ใน `port.ts` เพื่อให้ Board อ่านได้ผ่านสัญญาโดยไม่ต้อง cast (ตอนนี้ `BattleScene.ts` cast `snapshot as BattleSnapshot & { movePreview?: … }`) เป็นการเพิ่มแบบ optional (`readonly movePreview?: MovePreview | null`) เพื่อให้ port implementation อื่น (Replay player, fake ใน test ของ battle/web) ยัง compile ได้; session ใส่ค่าจริง Replay player ให้ `null` ไม่เปลี่ยน engine จึงไม่ขยับ ENGINE_VERSION

**Blocked by:** 04 — UI: Move preview (PR #26 merged ก่อน เพื่อไม่ให้ชนกับ wrapper ของ web)

**Status:** ready-for-agent

- [ ] ขณะมี Move preview, `selectUnit(selectedUnit)` และ `input({ type: 'tapUnit', unit: selectedUnit })` ล้าง `movePreviewTile` / `movePreview` เท่านั้น: `selectedUnit`, `mode`, `reachable` (หรือ `tileChoices` ของ Blink) คงเดิม; test ทั้ง Move และ Blink และ Hotseat ฝั่ง B
- [ ] ไม่มี preview: แตะ Unit ที่เลือกอยู่ยังยกเลิกการเลือกเหมือนเดิม (test เดิมผ่าน)
- [ ] `BattleSnapshot.movePreview?` เพิ่มแบบ optional ใน `port.ts` พร้อม doc comment; session ส่งค่าเดียวกับ `SessionSnapshot.movePreview`; Replay player ส่ง `null`; type `MovePreview` export จาก `@mt/session` อยู่แล้ว
- [ ] ไม่เปลี่ยนความหมายของ `input` แบบอื่น (แตะช่องที่สว่างยังเดินทันทีผ่าน `input`; web ใช้ `previewMove` ผ่าน wrapper ของตัวเอง) ตาม contract rule ของ AGENTS.md
- [ ] package README ของ session อัปเดต (บรรทัด Move preview และ port)
- [ ] typecheck, test, build, path check ผ่าน; ENGINE_VERSION ไม่เปลี่ยน

# 18 — Move preview ใน session: แตะ Unit ยกเลิกแค่ preview และ movePreview ใน BattleSnapshot

**Owner:** claude

**What to build:** แก้ช่องว่างสองข้อของ ticket 03 ที่พบจาก review PR #26 (ticket 04) (1) แตะ Unit ที่เลือกอยู่ขณะมี Move preview ต้องยกเลิกแค่ preview: Unit ยังถูกเลือก อยู่ในโหมดเดิม (เดิน: ช่องที่เดินได้ยังสว่าง; Blink: ยังเล็ง Blink อยู่ แต่ไม่มีช่องที่เลือก) ตอนนี้ `selectUnit` ล้างการเลือกทั้งหมด (toggle off) ซึ่งขัดกับ spec user story 3 "tap my Unit again to cancel the preview, so that I can go back to choosing" การแตะ Unit ครั้งถัดไป (ไม่มี preview แล้ว) ยกเลิกการเลือกเหมือนเดิม (2) เพิ่ม `movePreview` ลง `BattleSnapshot` ใน `port.ts` เพื่อให้ Board อ่านได้ผ่านสัญญาโดยไม่ต้อง cast (ตอนนี้ `BattleScene.ts` cast `snapshot as BattleSnapshot & { movePreview?: … }`) เป็นการเพิ่มแบบ optional (`readonly movePreview?: MovePreview | null`) เพื่อให้ port implementation อื่น (Replay player, fake ใน test ของ battle/web) ยัง compile ได้; session ใส่ค่าจริง Replay player ให้ `null` ไม่เปลี่ยน engine จึงไม่ขยับ ENGINE_VERSION

**Blocked by:** 04 — UI: Move preview (PR #26 merged ก่อน เพื่อไม่ให้ชนกับ wrapper ของ web); 25 — แก้ขั้น re-select ของ `move-preview.visual.ts` ก่อน merge (ไม่งั้น job ภาพแดง ดู Comments)

**Status:** done

- [x] ขณะมี Move preview, `selectUnit(selectedUnit)` และ `input({ type: 'tapUnit', unit: selectedUnit })` ล้าง `movePreviewTile` / `movePreview` เท่านั้น: `selectedUnit`, `mode`, `reachable` (หรือ `tileChoices` ของ Blink) คงเดิม; test ทั้ง Move และ Blink และ Hotseat ฝั่ง B
- [x] ไม่มี preview: แตะ Unit ที่เลือกอยู่ยังยกเลิกการเลือกเหมือนเดิม (test เดิมผ่าน)
- [x] `BattleSnapshot.movePreview?` เพิ่มแบบ optional ใน `port.ts` พร้อม doc comment; session ส่งค่าเดียวกับ `SessionSnapshot.movePreview`; Replay player ส่ง `null`; type `MovePreview` export จาก `@mt/session` อยู่แล้ว
- [x] ไม่เปลี่ยนความหมายของ `input` แบบอื่น (แตะช่องที่สว่างยังเดินทันทีผ่าน `input`; web ใช้ `previewMove` ผ่าน wrapper ของตัวเอง) ตาม contract rule ของ AGENTS.md
- [x] package README ของ session อัปเดต (บรรทัด Move preview และ port)
- [x] typecheck, test, build, path check ผ่าน; ENGINE_VERSION ไม่เปลี่ยน

## Comments

- `selectUnit` (and so `input` `tapUnit`) drops only the preview when the tapped Unit is the selected one and `movePreview` is not null: Move keeps `reachable`, Blink keeps `mode: skill` / `pendingSkill` with `pendingTile` cleared. `BattleSnapshot.movePreview?` added in `port.ts`; Replay player gives `null`. Tests in `sessionMovePreview.test.ts` (Move and Blink through `selectUnit` and `input`, Hotseat B, no preview, port type). ENGINE_VERSION unchanged.
- PR #29: job ภาพ (ticket 26) แดง 6 กรณี `preview-*`: `move-preview.visual.ts` แตะ Unit เดิมสองครั้งโดยคิดว่าครั้งแรกเลิกเลือก ซึ่งขัดกับ spec story 3 ที่ ticket นี้แก้ ไฟล์อยู่ใน `packages/web` (Codex) จึงเปิด ticket 25 (`Owner: codex`) ให้แก้ test ให้ใช้ได้กับทั้งสองพฤติกรรม แล้วค่อย merge PR นี้ ตามกฎ "ไม่ merge ถ้า CI แดง"
- Merged in PR #29 (after Codex ticket 25, PR #41, fixed the visual test that depended on the old deselect behaviour).

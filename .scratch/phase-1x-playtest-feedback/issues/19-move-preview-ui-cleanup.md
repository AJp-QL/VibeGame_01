# 19 — UI: Move preview cleanup หลัง ticket 18

**Owner:** codex

**What to build:** เก็บงานของ ticket 04 ตามที่ review PR #26 พบ หลังจาก session มี `BattleSnapshot.movePreview` และแตะ Unit ยกเลิกแค่ preview (ticket 18): Board อ่าน `snapshot.movePreview` ตรงจาก port แทนการ cast, ตรวจว่าแตะ Unit ขณะมีเงาแล้วเงาหายแต่ Unit ยังเลือกอยู่และช่องยังสว่าง (spec user story 3) และ hint "แตะ Unit เพื่อยกเลิก" ตรงกับพฤติกรรมนี้ รวมถึงเรื่องเล็กจาก review: ชื่อ field ใน BattleScene ใช้คำตาม CONTEXT.md (Move preview ไม่ใช่ "ghost move"), และ `packages/web/visual/README.md` อธิบาย flag `--disable-lcd-text` กับหน้า `move-preview` (ขนาดภาพ, threshold, รายการ capture `preview-*`)

**Blocked by:** 18 — Move preview ใน session: แตะ Unit ยกเลิกแค่ preview และ movePreview ใน BattleSnapshot; ticket 23 (แก้ test re-select) ควร merge ก่อน

**Status:** ready-for-agent

- [ ] `BattleScene.ts` อ่าน `snapshot.movePreview` จาก `BattleSnapshot` โดยไม่มี type cast
- [ ] แตะ Unit ขณะมีเงา: เงาและแผงหาย Unit ยังเลือกอยู่และช่องที่เดินได้ยังสว่าง (Move และ Blink); มี test
- [ ] field ใน BattleScene ใช้ชื่อตามคำใน CONTEXT.md
- [ ] `visual/README.md` อธิบาย `--disable-lcd-text` และหน้า `move-preview` พร้อมรายการ capture
- [ ] screenshot ไม่เปลี่ยน (หรือ update baseline และตรวจทุกภาพถ้าเปลี่ยน); CI เขียวทั้งสาม job

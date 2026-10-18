# P1X-28 — session บอกช่อง terrain ที่บังแนวเล็ง และระยะที่กติกาของระยะเริ่มใช้

**Owner:** claude

**What to build:** ให้ UI อธิบายเหตุผลที่เล็งไม่ได้และกติกาของระยะจากข้อมูลของ session แทนการเดาเอง (พบจาก review PR #45, ticket 10) ตอนนี้ `checkEnemyTarget` (engine `combat.ts`) คืน `no-line-of-sight` พร้อม `blockedBy` เป็น Unit ที่ขวาง และถ้าไม่มี Unit ขวางแต่ภูเขาบัง จะคืน `blockedBy: []` web จึงตีความ "รายการว่าง = ภูเขา" และเมื่อทั้ง Unit และภูเขาขวาง ข้อความบอกแค่ Unit นอกจากนี้ web เขียนเลข 4 (disadvantage ระยะไกล) และกติกา "ตรวจแนวเล็งจากระยะ 2" ไว้เองใน `skillText.ts`

เพิ่มแบบเพิ่มอย่างเดียว (contract rule ของ AGENTS.md): (1) rejection `no-line-of-sight` และ `BlockedTarget` ของ session (ทั้ง `snapshot.blocked` และ `movePreview.reach[].blocked`) มี field ใหม่บอกช่อง terrain บนเส้นที่บัง (เช่น `blockedByTerrain: readonly Tile[]`) ครบทั้งกรณีที่มี Unit ขวางด้วย; `blockedBy` (Unit) ความหมายเดิม (2) export ค่าระยะที่เริ่มตรวจแนวเล็ง (rules §7.1, ตอนนี้ 2) จาก engine และ re-export ผ่าน `@mt/session` ส่วนระยะของ disadvantage ระยะไกลใช้ `GAME_RANGE_RULES.longRangeDisadvantageFrom` ที่ re-export อยู่แล้ว (README ของ session บอกว่า UI ควรอ่านจากตรงนี้)

ไม่เปลี่ยนว่า action ไหนรับหรือไม่รับ ไม่เปลี่ยน state หรือลูกเต๋า จึงไม่ขยับ ENGINE_VERSION (ถ้าการเพิ่ม field ทำให้ต้องเปลี่ยนลำดับการตรวจ ให้ตรวจว่า code ของ rejection ยังเหมือนเดิมทุกกรณี) ticket 27 แก้ comment ใน `combat.ts` เหมือนกัน: อันที่ merge ทีหลัง merge `origin/main` ก่อนแล้วรัน check ใหม่

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] rejection `no-line-of-sight` และ `BlockedTarget` มีช่อง terrain ที่บัง (ว่างเมื่อไม่มี); เมื่อ Unit และภูเขาขวางพร้อมกัน ได้ทั้งสองอย่าง; Flying ผู้โจมตีไม่ถูกบังเหมือนเดิม; test ใน engine และ session (Move preview ด้วย)
- [ ] code ของ rejection และผลรับ/ไม่รับของทุก action เหมือนเดิม (test เดิมผ่านโดยไม่แก้); `check-replays` ผ่าน; ENGINE_VERSION ไม่เปลี่ยน
- [ ] ค่าระยะเริ่มตรวจแนวเล็ง export จาก engine และ `@mt/session`; engine ใช้ค่านี้เองแทนเลข 2
- [ ] README ของ engine และ session บอก field และค่าใหม่ และบอกให้ UI ใช้ `GAME_RANGE_RULES.longRangeDisadvantageFrom` แทนการเขียนเลขเอง
- [ ] typecheck, test, build, path check ผ่าน

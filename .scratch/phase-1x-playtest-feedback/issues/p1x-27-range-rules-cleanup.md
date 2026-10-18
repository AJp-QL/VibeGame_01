# P1X-27 — เก็บกวาดหลัง ticket 09 (กติกาของระยะ) ตาม review PR #34

**Owner:** claude

**What to build:** ทำให้สิ่งที่ ticket 09 (PR #34) ทิ้งไว้ตรงกับกติกาของ repo และตรงกับเกมที่เล่นจริง: review หลัง merge พบว่า (1) การเปลี่ยนชื่อ `VariantRules` → `RangeRules` และ field `variantRules` → `rangeRules` ของ `BattleSetup` / `BattleState` ไม่มี alias ซึ่งขัดกับ contract rule ของ AGENTS.md (เปลี่ยนแบบเพิ่มเท่านั้น) แม้ผลจริงน้อย (`@mt/session` ไม่เคย re-export, web/battle ไม่ได้ใช้ มีแค่เครื่องมือของ ticket 08) (2) doc ของ `AttackPreview.rollModeSources` บอกว่า "Every source of advantage or disadvantage" แต่ disadvantage ระยะไกลอยู่ใน flag `longRangeDisadvantage` แยก ทำให้ UI ที่อ่านแค่ sources อธิบายเหตุผลของการทอยผิด (3) ชื่อ/ข้อความเก่า "variant / ticket 08" ยังอธิบายกติกาที่ตอนนี้เป็นกติกาของเกมจริง (4) spec "AI ในเกมใช้กติกาใหม่ได้ (เช่นเลี่ยงยิงจากระยะที่เสีย advantage)" ยังไม่มี test ที่แสดงพฤติกรรมนี้ (5) ค่าของ kit ก่อน ticket 09 (`KIT_RANGES` / `LEGACY_RANGES`, `EXTRA_MOUNTAINS`) ถูกเขียนซ้ำสามที่

ไม่เปลี่ยนกติกาของเกม: ถ้าทุกข้อทำเฉพาะ type alias, doc, comment, ชื่อ test และ test ใหม่ ENGINE_VERSION ไม่ขยับ ถ้า test ข้อ AI พบว่า AI ไม่เลี่ยงระยะไกลและต้องแก้ AI ให้รัน simulator ใหม่ (ผลเทียบกับ `docs/balance/ticket-09-range-rules.md`) และ sim-v4 parity และบันทึกแถว decision log

**Blocked by:** None — P1X-09 merged แล้ว (PR #34)

**Status:** done (PR #53). The `combat.ts` comment is fixed in P1X-28 (same lines); the rest is here.

- [x] contract: engine export `type VariantRules = RangeRules` (มี `@deprecated` ชี้ไป `RangeRules`) และแถว decision log ว่า field `BattleSetup.variantRules` / `BattleState.variantRules` เปลี่ยนชื่อโดยไม่มี alias เพราะใช้แค่ tools ของ ticket 08 (ไม่มี consumer ใน session/battle/web) หรือเพิ่ม alias field ถ้าทำได้โดยไม่ซับซ้อน
- [x] doc ของ `AttackPreview.rollMode` / `rollModeSources` บอกว่า net roll mode รวม `longRangeDisadvantage` ด้วย (ไม่เพิ่ม member ใหม่ใน union `RollModeSource` เพราะ switch ที่ครบทุกกรณีใน web จะพัง); README ของ engine และ session บอก flag นี้ (ticket 10 มี comment แล้วว่า UI ต้องแสดง flag นี้)
- [x] ข้อความเก่าแก้หมด: `tools/simulator/README.md` บรรทัด `VariantRules.longRangeDisadvantageFrom` / `VariantRules.sightBlockedBy`; comment ใน `combat.ts` ("Variant rules (ticket 08)…"), `rollMode.ts` ("variant rules"), `ai/src/model.ts` ("variant rules only", "variant rules, ticket 08"); doc ของ `longRangeFrom` ใน `rangeRules.ts` ("`undefined` (the game)" ซึ่งเกมตอนนี้ได้ 4); doc ของ `BattleState.rangeRules` ว่า optional เพราะอะไร
- [x] doc comment ของ `GAME_RANGE_RULES`, `BattleSetup.rangeRules`, `BattleState.rangeRules` อ้าง rules §7.2 (ภูเขาบัง line of sight) ไม่ใช่ §7.3
- [x] ชื่อ test ของ engine ที่ยังพูดว่า "variant b/c" หรือ "the game is unchanged: terrain never blocks" เปลี่ยนให้ตรงความจริง (kit ก่อน 09 กับ `NO_RANGE_RULES`); พิจารณาเปลี่ยนชื่อ option `realRules` ใน `fixtures.ts` ให้บอกว่าเปลี่ยน data + Board + กติกาพร้อมกัน
- [x] `packages/session/README.md` บอก re-export ใหม่ `RangeRules`, `GAME_RANGE_RULES`, `NO_RANGE_RULES`
- [x] test ของ AI (กติกาจริง): เมื่อมีช่องที่ยิงจากระยะ 3 ได้ AI ไม่เลือกยิงจากระยะ 4 ขึ้นไปที่เสีย disadvantage (หรือบันทึกว่า AI ทำไม่ได้แล้วแก้ AI ตามย่อหน้าบน)
- [x] test ภูเขาบัง Burst (`checkCentre`) ด้วย Unit ใน test ที่ไม่บิน เพราะ Wispling ตัวเดียวที่ใช้ Burst บินได้ เส้นทางนี้จึงยังไม่ถูกทดสอบ
- [x] ค่าของ kit ก่อน 09 มีที่เดียว หรืออย่างน้อยมี test ที่ยืนยันว่าสามชุด (`packages/engine/test/fixtures.ts`, `packages/session/test/kit.ts`, `tools/simulator/src/variants.ts`) เท่ากัน
- [x] typecheck, test, build, path check, `check-replays` ผ่าน; ENGINE_VERSION ไม่เปลี่ยน (ยกเว้นตามย่อหน้าบน)

# packages/battle/

renderer ของกระดานต่อสู้ 7x7 ด้วย 2D framework

**เจ้าของ:** Codex (ADR 0004) สัญญาที่ใช้ (`BattleSessionPort`, `BattleSnapshot`, `BoardInput` และชื่อจาก engine) มาจาก `@mt/session` ของ Claude ขอเปลี่ยนผ่าน ticket

## เก็บอะไร
- การวาดกระดาน, unit, animation, เอฟเฟกต์, input บนกระดาน
- แสดงผลจาก state ของ engine เท่านั้น ไม่มี logic กติกา

## อ้างอิง PRD
- F3 Tactical grid battle, Technical requirements (hybrid rendering, tile 32x32)

## แนวทาง/กฎการตั้งชื่อ
- ใช้ Phaser 4 (ADR 0003, docs/research/phase-1-stack.md)
- dependency: `@mt/session` (port type และชื่อจาก engine ที่ session re-export เช่น `derivedValues`, `UnitState`) และ `@mt/shared` เท่านั้น ไม่ import web หรือ engine ตรง web ส่ง session (หรือ Replay player) ที่ implement `BattleSessionPort` เข้ามา
- ไม่มีข้อความของตัวเอง: คำที่ Board วาดมาจาก web ผ่าน `BoardLabels` (`src/labels.ts`)
- ภาพ pixel art ต้องตั้ง nearest-neighbor และ scale เป็นจำนวนเต็ม

## สถานะ
- `createBattleGame(parent, session)` วาด Board 7x7 (tile 32x32, `pixelArt`, zoom จำนวนเต็มด้วย MAX_ZOOM) สีช่องตามธาตุ และ Unit ภาพชั่วคราว (silhouette ต่อ species, สีตามธาตุ, ฐานและธงสีทีม)
- แตะ/คลิก Unit แล้วเห็นช่องที่เดินได้, แตะช่องเพื่อเดิน (ใช้แค่ pointerdown ไม่พึ่ง hover) และเล่น animation เดินตาม path ในเหตุการณ์ของ engine
- ticket 05: ไฮไลต์เป้าที่โจมตีได้ (สีแดง) และเป้าที่เลือก, แถบ HP ใต้ Unit, animation ชั่วคราวของการโจมตี (พุ่งเข้าหาเป้า, ตัวเลข damage หรือคำว่าพลาด, Unit ล้มจางหายไป) ข้อความบน Board มาจาก string table ของ web ผ่าน `BoardLabels`
- ticket 06: ช่องธาตุมีเครื่องหมายพิกเซลเล็กที่มุมซ้ายบน (`TERRAIN_GLYPHS` ใน `src/palette.ts`) ให้แยกช่องสีใกล้กันได้ (ทะเลทราย/แสง, ภูเขา/มืด) และ export สีกับเครื่องหมายให้ web วาด legend, Unit ที่ติด Guarded มีไอคอนโล่ที่มุมบนฝั่งตรงข้ามธงทีม, เป้าในระยะที่ถูกบังแนวเล็งแสดงเป็นกากบาทสีเทา (`snapshot.blockedTargets`) และแตะเลือกไม่ได้
- วาดเฉพาะ `snapshot.units` (Unit ที่ผู้ถือเครื่องเห็นได้) ช่วง deployment จึงไม่วาดและแตะ Unit ที่ซ่อนอยู่ของอีกฝั่งไม่ได้ ช่องที่สว่างช่วง deployment คือช่องที่วาง Unit ที่เลือกได้ และ Unit ของฝั่งที่เล่นซึ่งไม่เหลือ action ที่ทำได้แสดงจางลง

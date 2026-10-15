# packages/battle/

renderer ของกระดานต่อสู้ 7x7 ด้วย 2D framework

## เก็บอะไร
- การวาดกระดาน, unit, animation, เอฟเฟกต์, input บนกระดาน
- แสดงผลจาก state ของ engine เท่านั้น ไม่มี logic กติกา

## อ้างอิง PRD
- F3 Tactical grid battle, Technical requirements (hybrid rendering, tile 32x32)

## แนวทาง/กฎการตั้งชื่อ
- ใช้ Phaser 4 (ADR 0003, docs/research/phase-1-stack.md)
- ไม่ import web: ประกาศ interface `BattleSessionPort` ที่ต้องการไว้ใน `src/port.ts` แล้ว web ส่ง implementation เข้ามา
- ภาพ pixel art ต้องตั้ง nearest-neighbor และ scale เป็นจำนวนเต็ม

## สถานะ
- `createBattleGame(parent, session)` วาด Board 7x7 (tile 32x32, `pixelArt`, zoom จำนวนเต็มด้วย MAX_ZOOM) สีช่องตามธาตุ และ Unit ภาพชั่วคราว (silhouette ต่อ species, สีตามธาตุ, ฐานและธงสีทีม)
- แตะ/คลิก Unit แล้วเห็นช่องที่เดินได้, แตะช่องเพื่อเดิน (ใช้แค่ pointerdown ไม่พึ่ง hover) และเล่น animation เดินตาม path ในเหตุการณ์ของ engine
- ticket 05: ไฮไลต์เป้าที่โจมตีได้ (สีแดง) และเป้าที่เลือก, แถบ HP ใต้ Unit, animation ชั่วคราวของการโจมตี (พุ่งเข้าหาเป้า, ตัวเลข damage หรือคำว่าพลาด, Unit ล้มจางหายไป) ข้อความบน Board มาจาก string table ของ web ผ่าน `BoardLabels`
- วาดเฉพาะ `snapshot.units` (Unit ที่ผู้ถือเครื่องเห็นได้) ช่วง deployment จึงไม่วาดและแตะ Unit ที่ซ่อนอยู่ของอีกฝั่งไม่ได้ ช่องที่สว่างช่วง deployment คือช่องที่วาง Unit ที่เลือกได้ และ Unit ของฝั่งที่เล่นซึ่งไม่เหลือ action ที่ทำได้แสดงจางลง

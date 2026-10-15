# data/scenarios/

Scenario ที่กำหนดทีม stat และ Board ไว้ล่วงหน้า (CONTEXT.md) ใช้ใน playtest และ simulation

## เก็บอะไร
- Board ที่ใช้, ทีม A และ B: Tamer (Level, 6 stat, loadout) และ Monster 2 ตัว (species, ธาตุ, Star, 6 stat, loadout)
- loadout คือ skill ที่เพิ่มจาก Basic Attack และ Defend ซึ่งทุก Unit มี (rules §20.1)

## อ้างอิง PRD
- Prototype kit, rules §20

## แนวทาง/กฎการตั้งชื่อ
- <scenario_id>.json เช่น scenario_1
- เก็บแบบ Monster จริง ไม่เก็บค่าที่คำนวณแล้ว (HP, Guard, ระยะเดิน)
- ลำดับ Monster ในทีม = ลำดับ Unit (rules §21.4)

## สถานะ
- มี scenario_1 (ต้นเกม: Tamer Level 1, Monster 1 Star)
- `startingTiles` (Tamer, Monster 1, Monster 2) เป็นช่องเริ่มชั่วคราวจนกว่าจะมี deployment ใน ticket 04
- scenario_2 รอ ticket 13

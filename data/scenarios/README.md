# data/scenarios/

Scenario ที่กำหนดทีม stat และ Board ไว้ล่วงหน้า (CONTEXT.md) ใช้ใน playtest และ simulation

## เก็บอะไร
- Board ตั้งต้น (เมนูเลือกไว้ให้ก่อน แต่เล่นบน Board ไหนก็ได้), ทีม A และ B: Tamer (Level, 6 stat, loadout) และ Monster 2 ตัว (species, ธาตุ, Star, 6 stat, loadout)
- loadout คือ skill ที่เพิ่มจาก Basic Attack และ Defend ซึ่งทุก Unit มี (rules §20.1)

## อ้างอิง PRD
- Prototype kit, rules §20

## แนวทาง/กฎการตั้งชื่อ
- <scenario_id>.json เช่น scenario_1
- เก็บแบบ Monster จริง ไม่เก็บค่าที่คำนวณแล้ว (HP, Guard, ระยะเดิน)
- ลำดับ Monster ในทีม = ลำดับ Unit (rules §21.4)

## สถานะ
- มี scenario_1 (ต้นเกม: Tamer Level 1, Monster 1 Star)
- Scenario ไม่กำหนดช่องเริ่ม: ผู้เล่นวาง Unit เองใน deployment (rules §17.1)
- มี scenario_2 (กลางเกม: Tamer Level 6, Monster 4 Star) ใช้ค่าตาม Prototype kit: Tidewall 4 Star POW 20, Quillfox 4 Star SPI 16 (rules §20.2, D-25) ไม่ใช่ค่าของ sim v4

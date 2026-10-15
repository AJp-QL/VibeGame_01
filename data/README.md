# data/

ข้อมูลเกม (data-driven) ที่ engine อ่าน แยกตามประเภท

## เก็บอะไร
- species/, skills/, statuses/, elements/, traits/, boards/, campaigns/, scenarios/

## อ้างอิง PRD
- F1 Shared stat model, F3, F4, F7 Monster design, Content/progression/economy

## แนวทาง/กฎการตั้งชื่อ
- รูปแบบ JSON, หนึ่ง entity ต่อหนึ่งไฟล์
- ชื่อไฟล์และ id เป็น snake_case ภาษาอังกฤษ ตรงกัน เช่น fangrel.json มี id "fangrel"
- schema นิยามไว้ที่ packages/shared (`loadGameData`) และถูกตรวจตอน `pnpm test`, ตอน build/dev และตอนเกมโหลด โฟลเดอร์ที่ยังไม่มี schema ห้ามมีไฟล์ .json
- เก็บแค่ค่าต้นทาง (stat, Star, Level, ธาตุ, ข้อมูล species) ไม่เก็บค่าที่คำนวณได้ (HP, ระยะเดิน ฯลฯ)
- ลำดับ: docs/rules -> data/ -> packages/engine

## สถานะ
- มี boards/crossroads และ boards/shallows, species 4 ตัว, scenarios/scenario_1 และ scenario_2, skills ครบทุก loadout + Basic Attack + Defend, statuses ครบ 10 ตัวของ phase 1, elements/element_wheel (ticket 07)
- traits, campaigns ยังว่าง

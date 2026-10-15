# data/boards/

แผนที่กระดานต่อสู้ 7x7

## เก็บอะไร
- ชนิด terrain ต่อช่อง, จุดเกิดของแต่ละฝ่าย, สิ่งกีดขวางที่บัง line of sight

## อ้างอิง PRD
- F3 Tactical grid battle, Technical requirements (tile 32x32)

## แนวทาง/กฎการตั้งชื่อ
- <board_id>.json: `rows` 7 สตริง แถว 1 ก่อน แต่ละตัวอักษรคือช่อง a ถึง g ใช้สัญลักษณ์เดียวกับ rules §2.2 (`.` ปกติ, F ป่า, W น้ำ, M ภูเขา, D ทะเลทราย, L แสง, K มืด)
- พิกัดแบบ a1-g7 ตามที่ใช้ใน playtest
- ระยะใช้ Chebyshev, line of sight ใช้ Bresenham (ตาม prototype)

## สถานะ
- มี crossroads.json (rules §2.2)
- จุดเกิดยังไม่อยู่ใน Board (โซนวางเป็นกติกา rules §17.1) ส่วนช่องเริ่มชั่วคราวอยู่ใน Scenario

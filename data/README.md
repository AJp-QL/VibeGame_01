# data/

ข้อมูลเกม (data-driven) ที่ engine อ่าน แยกตามประเภท

## เก็บอะไร
- species/, skills/, statuses/, traits/, boards/, campaigns/

## อ้างอิง PRD
- F1 Shared stat model, F3, F4, F7 Monster design, Content/progression/economy

## แนวทาง/กฎการตั้งชื่อ
- รูปแบบ JSON หรือ YAML (เลือกแบบเดียวทั้งโปรเจกต์ ยังไม่ตัดสินใจ), หนึ่ง entity ต่อหนึ่งไฟล์
- ชื่อไฟล์และ id เป็น snake_case ภาษาอังกฤษ ตรงกัน เช่น fangrel.json มี id "fangrel"
- schema นิยามไว้ที่ packages/shared และต้อง validate ผ่านก่อน commit
- ลำดับ: prototype/rules -> data/ -> packages/engine

## สถานะ
- ยังว่าง, รอเฟส 1 (แปลงจาก rules v4)

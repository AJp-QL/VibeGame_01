# packages/server/

server ขนาดเล็กสำหรับข้อมูลที่ต้องอยู่นอกเครื่องผู้เล่น

## เก็บอะไร
- account และ profile snapshot
- share code
- registry ของ seed hash ที่ใช้แล้ว (seed ใช้ได้ครั้งเดียวต่อ account)
- การตรวจสอบ rarity ด้วยการรัน engine ซ้ำจาก seed

## อ้างอิง PRD
- F6 Social (share codes, seed rules), Technical requirements (local-first save + small server)

## แนวทาง/กฎการตั้งชื่อ
- ไม่เก็บ save หลัก (local-first)
- ใช้ packages/engine ตัวเดียวกับ client เพื่อผลลัพธ์ตรงกัน
- ต้องยืนยันชื่อ library และเวอร์ชันจาก docs จริงก่อนเริ่ม implement (ตาม PRD)

## สถานะ
- ยังว่าง, รอเฟสที่มี F6

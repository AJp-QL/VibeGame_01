# packages/

โค้ดของเกมแยกเป็น package ตามหน้าที่

## เก็บอะไร
- engine/ : rules engine (หัวใจ)
- ai/ : Enemy AI
- shared/ : types และ schema
- battle/ : renderer กระดาน
- web/ : React app
- server/ : backend ขนาดเล็ก

## อ้างอิง PRD
- Technical requirements, MVP roadmap

## แนวทาง/กฎการตั้งชื่อ
- ทิศทาง dependency: shared <- engine <- ai / battle / web / server; engine ห้าม import package อื่นนอกจาก shared
- ภาษา, build tool และ framework ยังไม่ล็อก ต้องยืนยันชื่อ library และเวอร์ชันจาก docs จริงก่อนเริ่ม implement (ตาม PRD)

## สถานะ
- ยังว่าง, รอเฟส 1

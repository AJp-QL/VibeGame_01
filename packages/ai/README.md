# packages/ai/

Enemy AI ที่ใช้ร่วมกันระหว่างตัวเกมและ simulation

## เก็บอะไร
- logic การเลือก action ของฝ่ายศัตรู ทำงานบน state ของ engine
- โปรไฟล์พฤติกรรม เช่นแบบที่ใช้ใน sim: greedy, tamer_rush, neutral

## อ้างอิง PRD
- F3 Tactical grid battle, F4 Campaign, Prototype kit

## แนวทาง/กฎการตั้งชื่อ
- deterministic เมื่อให้ seed เดียวกัน ต้องได้ action เดียวกัน
- เรียก engine เท่านั้น ห้ามมี logic กติกาซ้ำ

## สถานะ
- ยังว่าง; ต้องเสร็จก่อนเฟส 1 (งานถัดไปคือ Enemy AI)

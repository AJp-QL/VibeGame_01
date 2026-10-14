# docs/rules/

กติกา Battle ฉบับรวม ซึ่งเป็นต้นฉบับเดียวที่ engine ใช้ implement (ADR 0001)

## เก็บอะไร
- rules.md : กติกา Battle ฉบับรวมของ phase 1 (รวม rules v1–v4, PRD, decision log และ ruling จาก simulation/playtest) พร้อมส่วน Determinism และรายการ "ต้องตัดสิน" (D-NN)

## อ้างอิง PRD
- F1 Shared stat model, F3 Tactical grid battle, F5 Tamer, F7 Monster design (Skill spec: vertical slice), Prototype kit, Technical requirements (deterministic engine, seeded RNG)

## แนวทาง/กฎการตั้งชื่อ
- ไฟล์เดียว rules.md ใช้ git แทนเลขเวอร์ชัน ห้ามสร้าง rules_v2.md หรือไฟล์ซ้อน (decision log 2026-10-14)
- อ้างอิงข้อด้วย "rules §X.Y" และประเด็นค้างด้วย "D-NN" ห้ามเปลี่ยนเลขข้อเดิมโดยไม่แก้ที่อ้างอิง
- ทุกการเปลี่ยนกติกาต้องเพิ่มแถวใน docs/decisions/decision-log.md, เมื่อตัดสินข้อ D-NN แล้วให้แก้ข้อที่เกี่ยวข้องและลบแถวออกจาก §23
- ตัวเลขที่ปรับบาลานซ์ได้อยู่ใน data/ ส่วนเอกสารนี้เก็บสูตร ลำดับ และ ruling
- ภาษาไทย คำศัพท์เกมเป็นอังกฤษตาม CONTEXT.md

## สถานะ
- ฉบับแรกจาก ticket 02 (phase 1); PRNG ยังเป็นช่องว่างรอ ticket 01 และมีรายการต้องตัดสิน D-01 ถึง D-27

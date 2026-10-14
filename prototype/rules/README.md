# prototype/rules/

กติกาของ paper prototype ระบบต่อสู้ แยกตามเวอร์ชัน

## เก็บอะไร
- v1_rules.md : กติกาฐาน (single source of truth ของ prototype) จุดที่ตีความเองระบุเป็น [INTERP]
- v2_changes.md : การเปลี่ยนแปลง A-E หลังจำลองรอบ 1 (ใช้ทับ v1)
- v3_changes.md : การเปลี่ยนแปลงหลังจำลองรอบ 2 (ใช้ทับ v1+v2)
- v4_changes.md : การเปลี่ยนแปลงหลังจำลองรอบ 3 (ใช้ทับ v1+v2+v3) วางไว้เป็นรอบสุดท้ายก่อนอัปเดต PRD

## อ้างอิง PRD
- F3 Tactical grid battle, F5 Tamer, F7 Monster design (skills), Prototype kit

## แนวทาง/กฎการตั้งชื่อ
- กติกาปัจจุบัน = v1 + v2 + v3 + v4 อ่านตามลำดับ
- ไฟล์ใหม่: v<N>_changes.md ระบุว่าใช้ทับเวอร์ชันไหนและอนุมัติหลังรอบจำลองไหน
- การตัดสินใจที่ได้จากแต่ละเวอร์ชันให้ลง docs/decisions/decision-log.md

## สถานะ
- v4 คือฉบับล่าสุด; รอ merge กลับเข้า PRD

## หมายเหตุ

ไฟล์ในโฟลเดอร์นี้เป็นประวัติของแต่ละรอบ กฎที่ใช้จริงให้ยึด PRD และ docs/decisions/decision-log.md เป็นหลัก ตัวอย่างเช่น v4_changes.md ข้อ 5 ระบุว่า Command หักล้างการป้องกัน Tamer ได้ แต่หลัง simulation รอบ 4 (variant U4) ตัดสินแล้วว่าหักล้างไม่ได้

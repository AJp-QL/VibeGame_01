# 03 — Walking skeleton

**Owner:** claude (historical, mixed)

**What to build:** เส้นทางแรกที่ผ่านทุกชั้น: workspace TypeScript ตาม ticket 01, data ของ Crossroads และ Scenario 1 ในรูปแบบ Monster จริงที่ผ่าน schema, engine สร้าง Battle จาก Scenario + Board + Dice Seed แล้วให้ Unit เดินและจบ Turn ได้, React + Phaser แสดง Board และ Unit ภาพชั่วคราว (silhouette ต่อ species + สีตามธาตุ + ตัวบ่งชี้ฝั่ง) แตะ Unit แล้วเห็นช่องที่เดินได้ แตะช่องเพื่อเดิน และ deploy เป็นเว็บ static ที่แสดงเวอร์ชัน

**Blocked by:** 01 — ยืนยัน stack ด้วย research, 02 — rules ฉบับรวม

**Status:** done

- [x] engine มี interface สาธารณะ: สร้าง Battle (รับแหล่งลูกเต๋าเป็น Dice Seed หรือลำดับผลทอยสำหรับ test), ถาม action ที่ทำได้, ส่ง action แล้วได้ state ใหม่ + รายการเหตุการณ์, action ผิดกติกาถูกปฏิเสธพร้อมเหตุผลโดย state ไม่เปลี่ยน
- [x] engine import ได้แค่ shared และไม่แตะ UI, network หรือเวลาจริง
- [x] ระยะเดินคำนวณจากสูตร (ปัดเข้าหาศูนย์, แบบเบาและหนัก, ต่ำสุด 2), วัด 8 ทิศ, เดินผ่าน Unit ไม่ได้ยกเว้น Flying มี test ผ่าน interface ของ engine
- [x] data ที่ผิด schema ถูกปฏิเสธทั้งตอน build และตอนโหลด
- [x] UI สร้างจาก state และรายการเหตุการณ์ของ engine เท่านั้น ข้อความทั้งหมดมาจาก string table ภาษาไทย
- [x] pixel art คม (nearest-neighbor, integer scale) และ input ใช้ได้ทั้ง tap และ click โดยไม่พึ่ง hover
- [x] deploy ได้ build ที่แสดงเวอร์ชันตรงกับ git tag

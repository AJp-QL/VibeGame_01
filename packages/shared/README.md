# packages/shared/

types และ data schema ที่ใช้ร่วมกันทุก package

## เก็บอะไร
- type ของ monster, tamer, skill, status, trait, board, campaign, save
- schema สำหรับ validate ไฟล์ใน data/

## อ้างอิง PRD
- F1 Shared stat model, F6 Social (รูปแบบ share code), F7, Technical requirements

## แนวทาง/กฎการตั้งชื่อ
- หนึ่ง schema ต่อหนึ่งโฟลเดอร์ใน data/ ชื่อตรงกัน เช่น species, skills
- เปลี่ยน schema ต้องอัปเดตไฟล์ใน data/ ในชุดเดียวกัน
- ต้องยืนยันชื่อ library และเวอร์ชันจาก docs จริงก่อนเริ่ม implement (ตาม PRD)

## สถานะ
- มี schema (zod) ของ boards, species, scenarios และ `loadGameData()` ที่ตรวจทั้งโฟลเดอร์ data/ (schema, id ตรงชื่อไฟล์, การอ้างอิงข้ามไฟล์) ใช้ทั้งตอน build, test และโหลด
- มี type ของ Tile และตัวแปลงชื่อช่อง a1–g7
- ยังไม่มี schema ของ skills, statuses และ Replay

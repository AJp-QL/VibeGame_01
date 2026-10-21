# tools/

script ช่วยงานพัฒนาที่ไม่ใช่ส่วนของตัวเกม

## เก็บอะไร
- script validate data/ กับ schema, ประกอบ sprite 6 layer เพื่อพรีวิว, ตรวจขนาด 32x32
- เครื่องมือ export หรือแปลงข้อมูล

## อ้างอิง PRD
- Technical requirements, F7 Monster design

## แนวทาง/กฎการตั้งชื่อ
- หนึ่งเครื่องมือต่อหนึ่งไฟล์หรือโฟลเดอร์ ตั้งชื่อเป็นคำกริยา เช่น validate_data, compose_sprite
- ทุกเครื่องมือต้องมี usage อยู่ต้นไฟล์

## สถานะ
- path-check/: ตัวตรวจ path ตามเจ้าของและชื่อ branch ที่ CI รัน (ดู path-check/README.md) เป็น workspace package `@mt/path-check`
- claude-hooks/ (CA-02): hook ของ Claude Code, `guard` block การแก้ไฟล์ที่ branch นั้นไม่มีสิทธิ์ตาม `.github/ownership.json` ก่อน Claude แก้ และ `engine-version` (CA-03) เตือนตอนจบ turn ถ้า engine source หรือ `data/` เปลี่ยนแต่ `ENGINE_VERSION` ไม่เปลี่ยน (ดู claude-hooks/README.md) เป็น workspace package `@mt/claude-hooks` ใช้ path-check
- simulator/ (ticket 16): Battle แบบไม่มี UI ด้วย engine + AI, รายงานอัตราชนะและ metric ชุดเดียวกับ sim v4, parity กับ sim v4 และ baseline บาลานซ์ (ดู simulator/README.md) เป็น workspace package `@mt/simulator` ใช้ engine + ai

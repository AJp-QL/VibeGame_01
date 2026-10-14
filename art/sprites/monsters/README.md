# art/sprites/monsters/

ชิ้นส่วน sprite มอนสเตอร์ที่ประกอบซ้อนกันเป็น 6 layer

## เก็บอะไร
- body/, accessory/, pattern/, palette/, effects/ (rarity effect)
- age marker ยังไม่มีโฟลเดอร์แยก (อาจอยู่ใน effects/ หรือเพิ่มโฟลเดอร์ทีหลัง)

## อ้างอิง PRD
- F7 Monster design (sprite composition: body, accessory, pattern, palette, rarity effect, age marker)

## แนวทาง/กฎการตั้งชื่อ
- <species>_<layer>_<variant>.png เช่น fangrel_body_01.png
- ไฟล์ PNG ขนาด 32x32 ต่อเฟรม, scale ด้วย nearest-neighbor เท่านั้น (ห้าม smoothing)
- ทุก layer ต้องจัดตำแหน่งบน canvas 32x32 เดียวกัน เพื่อซ้อนได้ตรง

## สถานะ
- ยังว่าง

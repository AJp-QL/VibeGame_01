# data/species/

นิยามสายพันธุ์มอนสเตอร์ หนึ่งไฟล์ต่อหนึ่ง species

## เก็บอะไร
- base stat ตาม shared stat model, element, ประเภทการเคลื่อนที่ (เช่น Flying, Aquatic), growth, lifespan
- rarity, skill เริ่มต้น, ข้อมูล layer สำหรับประกอบ sprite

## อ้างอิง PRD
- F1 Shared stat model, F2 Ranch (lifespan, training), F7 Monster design (rarity, stars, growth, species roster)

## แนวทาง/กฎการตั้งชื่อ
- <species_id>.json หรือ .yaml เช่น fangrel, tidewall, wispling, quillfox
- rarity = ความหลากหลาย ไม่ใช่พลัง (ตาม decision log)

## สถานะ
- มี 4 species ของ phase 1: Fangrel, Tidewall, Wispling, Quillfox แต่ละไฟล์มี role, build (light/heavy), movement (ground/flying/aquatic) และ guardBonus (D-06)
- ยังไม่มี base stat, growth, lifespan, rarity และข้อมูล sprite

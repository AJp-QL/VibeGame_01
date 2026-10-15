# packages/engine/

rules engine แบบ deterministic ที่ใช้ร่วมกันทุกส่วนของเกม

## เก็บอะไร
- กติกาการต่อสู้ 7x7, d20 check, การคำนวณ stat, growth, combine
- pure functions: state + action -> state ใหม่ ไม่มี side effect, ไม่แตะ UI/network/เวลาจริง
- seeded RNG และ replay จาก seed + ลำดับ action

## อ้างอิง PRD
- Technical requirements (deterministic engine, seeded RNG)
- F1, F3, F7

## แนวทาง/กฎการตั้งชื่อ
- ใช้งานโดย battle, web, server, ai และ simulation
- อ่านข้อมูลจาก data/ ผ่าน schema ใน packages/shared
- ต้องผ่าน test เทียบผลกับ prototype/simulation ได้
- ต้องยืนยันชื่อ library และเวอร์ชันจาก docs จริงก่อนเริ่ม implement (ตาม PRD)

## สถานะ
- interface สาธารณะ (Seam A) ใน `src/index.ts`: `createBattle`, `legalActions`, `applyAction`, `derivedValues` และ dice stream (xoshiro128** + SplitMix64 ตาม rules §21.5, หรือผลทอยที่กำหนดเองสำหรับ test)
- กติกาที่ทำแล้ว: Move (สูตรระยะเดิน, 8 ทิศ, Unit บัง, Flying, Aquatic) และจบ Turn สลับฝั่ง ทีม A เริ่มก่อนและ Unit อยู่ที่ช่องเริ่มของ Scenario จนกว่าจะมี deployment และ initiative (ticket 04)
- test อยู่ใน `test/` ผ่าน interface สาธารณะเท่านั้น และมี test ตรวจว่า engine import แค่ shared และไม่ใช้เวลาจริง, ตัวสุ่ม, network หรือ DOM

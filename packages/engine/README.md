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
- interface สาธารณะ (Seam A) ใน `src/index.ts`: `createBattle`, `legalActions`, `previewAction`, `applyAction`, `derivedValues`, `unitsVisibleTo` และ dice stream (xoshiro128** + SplitMix64 ตาม rules §21.5, หรือผลทอยที่กำหนดเองสำหรับ test)
- กติกาที่ทำแล้ว:
  - deployment (rules §17.1, `src/deployment.ts`): Battle เริ่มที่ `phase: 'deployment'` ทีม A วางก่อนแล้วทีม B action `deploy` (วางหรือย้ายก่อนยืนยัน เฉพาะช่องว่างในโซนเริ่ม 2 แถวหลัง) และ `confirmDeployment` (ต้องวางครบ 3 Unit) การวางของแต่ละฝั่งซ่อนจากอีกฝั่ง (`unitsVisibleTo`, event `unitPlaced.hiddenFrom`) จนทั้งสองฝั่งยืนยัน แล้วเปิดเผยพร้อมกัน
  - initiative (rules §17.2, D-09, `src/initiative.ts`): d20 + AGI mod สูงสุดในทีม (รวม Tamer) A ทอยก่อน B เสมอทอยใหม่ทั้งคู่ เก็บผลทุกคู่ใน `state.initiative` (Inspiration ยังไม่ทำ รอ ticket 12)
  - Turn, Round และ activation (rules §17.3–17.4, `src/turns.ts`): เลือกลำดับ Unit เอง Unit ละ Move 1 ครั้งและ Action 1 ครั้ง (`hasMoved`, `hasActed`), activation จบเมื่อ Unit อื่นเริ่ม, Turn แรกของฝั่งที่เริ่มก่อนเล่นได้ 2 จาก 3 Unit (`state.activations`), จบ Turn ได้ทุกเมื่อ
  - Move (สูตรระยะเดิน, 8 ทิศ, Unit บัง, Flying, Aquatic)
- `createBattle({ ..., preset })` ข้าม deployment และ initiative แล้ววาง Unit ที่ช่องใดก็ได้ ใช้ใน test, เครื่องมือ และ puzzle เท่านั้น
- ค่าที่ได้จากสูตรครบ (HP, Guard, Ward, proficiency, attack bonus, damage mod) และ Basic Attack (ticket 05): attack roll, critical, ทอย 1 พลาด, damage ตามระยะ, Unit ล้มออกจาก Board, ชนะเมื่อ Tamer ล้มหรือ Monster หมด, preview เป็นเศษส่วนจริงโดยไม่ทอย
- กติกาการโจมตีอยู่ใน `src/combat.ts` โดยมีช่องรอสำหรับ Hidden, Taunted และ status อื่น (ticket 07 ขึ้นไป)
- ticket 06:
  - line of sight (rules §7, `src/lineOfSight.ts`): Bresenham จากผู้โจมตีไปเป้า (D-01) Unit บนเส้นบังการโจมตีระยะ 2 ขึ้นไป ยกเว้นผู้โจมตีเป็น Flying ถูกบังแล้วถูกปฏิเสธด้วย `no-line-of-sight` พร้อม `blockedBy` และ `lineOfSightTiles(from, to)` export ไว้ให้ test, AI และ UI
  - advantage/disadvantage (rules §4, §5, §9, `src/rollMode.ts`): element wheel (แสงกับมืดหักล้างกันตาม D-08), terrain ใต้ผู้โจมตี (Tamer และ Flying ไม่ได้รับผล, Aquatic นับน้ำเป็นธาตุตัวเอง), การป้องกัน Tamer (`cancellableByCommand: false` ให้ ticket 11) preview มี `rollModeSources` ทุกแหล่งก่อนหักล้าง และ `rollMode` คือผลสุทธิ
  - Defend (rules §12): action `defend` ใช้ Action ของ Unit ผ่านกฎ activation ได้ Guarded (`statuses`, Guard และ Ward +2) หลุดตอนเริ่ม Turn ถัดไปของฝั่งตัวเอง (event `defended`, `statusApplied`, `statusEnded`) ค่า +2 ยังอยู่ในโค้ด (`DEFEND_GUARDED_BONUS`) จนกว่า status จะย้ายไป data (ticket 07)
- test อยู่ใน `test/` ผ่าน interface สาธารณะเท่านั้น และมี test ตรวจว่า engine import แค่ shared และไม่ใช้เวลาจริง, ตัวสุ่ม, network หรือ DOM

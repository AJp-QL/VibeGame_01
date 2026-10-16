# packages/

โค้ดของเกมแยกเป็น package ตามหน้าที่

## เก็บอะไร
- engine/ : rules engine (หัวใจ)
- ai/ : Enemy AI
- shared/ : types และ schema
- session/ : interaction model ของ Battle แบบไม่มี UI (เลือก Unit, เล็ง, action ที่ทำได้, AI ทีละขั้น, Replay, playStats) และ port type
- battle/ : renderer กระดาน
- web/ : React app
- server/ : backend ขนาดเล็ก

## อ้างอิง PRD
- Technical requirements, MVP roadmap

## แนวทาง/กฎการตั้งชื่อ
- ทิศทาง dependency (ADR 0004):
  ```
  shared <- engine <- ai
  shared, engine, ai <- session        (Claude)
  session, shared    <- battle         (Codex)
  session, battle, shared <- web       (Codex)
  engine, ai, shared <- tools/simulator
  ```
  engine ห้าม import package อื่นนอกจาก shared; session ห้าม import battle/web; battle และ web ไม่ import engine/ai ตรง (ใช้ชื่อที่ session re-export); tools/simulator ใช้ engine + ai
- เจ้าของ (ADR 0004): Claude ดูแล shared, engine, ai, session, tools/simulator; Codex ดูแล battle, web
- stack และเวอร์ชันตาม docs/research/phase-1-stack.md (TypeScript, pnpm, Vite, Vitest, React, Phaser)

## สถานะ
- pnpm workspace + TypeScript project references (`tsc -b`) ตั้งแล้วใน ticket 03: มี shared, engine, battle, web; ai มาใน ticket 15 (ขึ้นกับ engine + shared); session มาใน ticket 20 (แยกจาก web, battle และ web ใช้); server ยังว่าง
- แต่ละ package export `src/index.ts` ตรงๆ (ไม่มี build step) และ import ข้ามได้แค่ package ที่ประกาศใน `dependencies` (import ผิดทิศ `tsc -b` และ Vitest จะ fail)

# packages/

โค้ดของเกมแยกเป็น package ตามหน้าที่

## เก็บอะไร
- engine/ : rules engine (หัวใจ)
- ai/ : Enemy AI
- shared/ : types และ schema
- battle/ : renderer กระดาน
- web/ : React app
- server/ : backend ขนาดเล็ก

## อ้างอิง PRD
- Technical requirements, MVP roadmap

## แนวทาง/กฎการตั้งชื่อ
- ทิศทาง dependency: shared <- engine <- ai / battle / web / server; engine ห้าม import package อื่นนอกจาก shared
- stack และเวอร์ชันตาม docs/research/phase-1-stack.md (TypeScript, pnpm, Vite, Vitest, React, Phaser)

## สถานะ
- pnpm workspace + TypeScript project references (`tsc -b`) ตั้งแล้วใน ticket 03: มี shared, engine, battle, web; ai และ server ยังว่าง
- แต่ละ package export `src/index.ts` ตรงๆ (ไม่มี build step) และ import ข้ามได้แค่ package ที่ประกาศใน `dependencies` (import ผิดทิศ `tsc -b` และ Vitest จะ fail)

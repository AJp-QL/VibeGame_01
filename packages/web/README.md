# packages/web/

React app สำหรับ ranch, campaign map และเมนู

## เก็บอะไร
- หน้า ranch (training รายสัปดาห์, lifespan, combine), campaign node map, เมนู, หน้า Tamer
- ฝังหน้าจอ battle จาก packages/battle
- local-first save

## อ้างอิง PRD
- F2 Ranch, F4 Campaign, F5 Tamer, F6 Social, Technical requirements (hybrid rendering, local-first save)

## แนวทาง/กฎการตั้งชื่อ
- ใช้ React ตาม PRD; ต้องตรวจเวอร์ชันจาก docs จริงก่อนใช้
- logic เกมทั้งหมดเรียกผ่าน packages/engine
- `src/session.ts` (BattleSession) เป็น store เดียวที่ทั้ง React (`useSyncExternalStore`) และ Phaser อ่าน ห่อ engine ไว้และไม่มีกติกาของตัวเอง
- ข้อความ UI ทุกข้อความมาจาก `src/strings.ts` (ภาษาไทย คำศัพท์เกมเป็นภาษาอังกฤษตาม CONTEXT.md)
- data/ ถูกตรวจ schema สองจุด: ตอน build/dev (plugin ใน `vite.config.ts`) และตอนโหลดในเบราว์เซอร์ (`src/gameData.ts`)

## คำสั่ง (รันที่ root ของ repo)
pnpm ไม่ได้ติดตั้งแบบ global บนเครื่องนี้ ใช้ `corepack pnpm ...` แทน `pnpm ...` ได้ทุกคำสั่ง
- `pnpm install`
- `pnpm dev`: dev server (Vite) ที่ http://localhost:5173
- `pnpm test`: Vitest ทุก package
- `pnpm typecheck`: `tsc -b`
- `pnpm build`: type-check แล้ว build ไปที่ `packages/web/dist` (เว็บ static ทั้งโฟลเดอร์)
- `pnpm preview`: เปิด build ใน `dist` ดูในเครื่อง

## เวอร์ชันใน UI
`vite.config.ts` ใส่ `__APP_VERSION__` ตอน build: ใช้ env `APP_VERSION` ถ้ามี ไม่อย่างนั้นใช้ `git describe --tags --always --dirty` ซึ่งได้ชื่อ tag ตรงๆ เมื่อ build จาก commit ที่ติด tag (เช่น `v0.1.0`) UI แสดงที่ท้ายหน้า

## Deploy (Cloudflare, ขั้นตอนของคน)
build ได้โฟลเดอร์ static ที่ `packages/web/dist` (`base` = `/` ตั้ง env `BASE_PATH` ถ้าจะวางใต้ path ย่อย) ยังไม่ได้ deploy จริงและไม่มี account หรือ secret ใน repo
1. ติด tag ที่ commit ที่จะ deploy: `git tag v0.1.0` (ทุก build ที่ deploy ต้องติด tag ตาม spec)
2. `corepack pnpm install` แล้ว `corepack pnpm build` (หรือ `APP_VERSION=v0.1.0 corepack pnpm build` ถ้า build จากที่ที่ไม่มี tag เช่น CI ที่ clone ตื้น)
3. ทางที่ 1 (Workers static assets, Cloudflare แนะนำสำหรับโปรเจกต์ใหม่): ใน `packages/web` รัน `npx wrangler login` แล้ว `npx wrangler deploy` ซึ่งอ่าน `wrangler.jsonc` และอัปโหลด `./dist`
4. ทางที่ 2 (Pages ผ่าน Git): ตั้ง build command = `corepack enable && pnpm install --frozen-lockfile && pnpm build`, output directory = `packages/web/dist`, env `APP_VERSION` = tag ที่ deploy
5. เปิดเว็บแล้วตรวจว่าเวอร์ชันท้ายหน้าตรงกับ tag

## สถานะ
- ticket 03 (walking skeleton): หน้า Battle เดียว แสดง Scenario 1 บน Crossroads เลือก Unit แล้วเดิน และจบ Turn ได้ มี log จากรายการเหตุการณ์ และแสดงเวอร์ชัน
- ticket 04: deployment แบบ Hotseat (ทีม A วาง → ยืนยัน → หน้าส่งเครื่องปิด Board → ทีม B วาง → ยืนยัน → เปิดเผยพร้อมกัน), หน้าผลทอย initiative และฝั่งที่เริ่มก่อน, ป้ายบอก "2 จาก 3 Unit" ใน Turn แรก, Unit ที่เล่นต่อไม่ได้แสดงจางลง และคำเตือนก่อนจบ Turn ถ้ายังมี Unit ที่ไม่ได้ทำอะไร (`idleUnits` ใน `src/session.ts`)
- ticket 05: เลือก Unit → กด "โจมตี" → แตะเป้าที่ไฮไลต์ → เห็น preview (% โอกาสโดน, ช่วง damage, % critical) → ยืนยันหรือยกเลิก, HP ทุก Unit (รายการ Unit และแถบบน Board), log ครบทุกเหตุการณ์, หน้าสรุปผล (ผู้ชนะ, สาเหตุ, Round) และเริ่ม Battle ใหม่
- ticket 13: เมนูก่อนเริ่ม Battle (`src/Menu.tsx`, model ใน `src/battleChoice.ts`): เลือก Scenario (ต้นเกม/กลางเกม), Board (ทุก Board ใน data พร้อมแผนที่ย่อ), โหมด (Hotseat; "เล่นกับ AI" แสดงแต่กดไม่ได้จนกว่าจะมี AI ticket 15) และทีมที่เล่น (มีใน model แสดงเฉพาะโหมด AI) หน้าสรุปผลมี "เล่นอีกครั้ง (ตั้งค่าเดิม)" และ "กลับไปเมนู"

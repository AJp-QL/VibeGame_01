# packages/web/

React app สำหรับ ranch, campaign map และเมนู

**เจ้าของ:** Codex (ADR 0004): React components, styles และข้อความ UI interaction model ของ Battle อยู่ที่ `@mt/session` (Claude) ขอเปลี่ยนสัญญาผ่าน ticket

## เก็บอะไร
- หน้า ranch (training รายสัปดาห์, lifespan, combine), campaign node map, เมนู, หน้า Tamer
- ฝังหน้าจอ battle จาก packages/battle
- local-first save

## อ้างอิง PRD
- F2 Ranch, F4 Campaign, F5 Tamer, F6 Social, Technical requirements (hybrid rendering, local-first save)

## แนวทาง/กฎการตั้งชื่อ
- ใช้ React ตาม PRD; ต้องตรวจเวอร์ชันจาก docs จริงก่อนใช้
- dependency: `@mt/session`, `@mt/battle`, `@mt/shared` ไม่ import `@mt/engine` / `@mt/ai` ตรง: ชื่อจาก engine ที่ใช้ (`createBattle`, `legalActions`, `ENGINE_VERSION`, type ต่างๆ) มาจาก re-export ของ session
- BattleSession (`@mt/session`) เป็น store เดียวที่ทั้ง React (`useSyncExternalStore`) และ Phaser อ่าน ห่อ engine ไว้และไม่มีกติกาของตัวเอง
- web เหลือเฉพาะสิ่งที่เป็นข้อความหรือแตะเบราว์เซอร์: `src/strings.ts`, `src/skillText.ts`, `src/replay.ts` (`describeAction`, ดาวน์โหลดไฟล์), `src/storage.ts` (localStorage ของ playStats), delay ของ AI ใน `useBattleSession.ts`
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

## โครงสร้างหน้าจอ (ticket 24)
- `App.tsx`: ประกอบหน้าจอเมนู / Battle / Replay / วิธีเล่น; `appScreens.ts`: สร้างหน้าจอ, เริ่ม Battle และเตรียมไฟล์ export
- `BattleScreen.tsx`: ประกอบหน้า Battle; `useBattleSession.ts`: subscribe snapshot, บันทึกผลจบ Battle และตั้งเวลาให้ AI เล่นทีละ action
- `DeploymentPanel.tsx`, `TurnPanel.tsx`, `BattleMenu.tsx`, `InspirationPrompt.tsx`: การวาง Unit, ปุ่มใน Turn, เมนู Battle และการตัดสินใจ Inspiration
- `UnitDetails.tsx`, `SkillButtons.tsx`, `ActionPreview.tsx`: ข้อมูล Unit, skill และ preview; `battleText.ts`: ชื่อและการจัดรูปแบบที่ใช้ร่วมกัน
- `BattleStatus.tsx`, `EventLog.tsx`: สถานะ, ผล Battle และ log ที่ทั้ง Battle และ Replay ใช้; `TerrainLegend.tsx`: คำอธิบาย terrain และ swatch

## เวอร์ชันใน UI
`vite.config.ts` ใส่ `__APP_VERSION__` ตอน build: ใช้ env `APP_VERSION` ถ้ามี ไม่อย่างนั้นใช้ `git describe --tags --always --dirty` ซึ่งได้ชื่อ tag ตรงๆ เมื่อ build จาก commit ที่ติด tag (เช่น `v0.1.0`) UI แสดงที่ท้ายหน้า

## Deploy (Cloudflare, ขั้นตอนของคน)
คู่มือทีละขั้นฉบับเต็ม (login, deploy ครั้งแรก, ติด tag, ตรวจเวอร์ชัน, ลิงก์แบบฟอร์ม): `docs/deploy/cloudflare.md` สรุปสั้น:

build ได้โฟลเดอร์ static ที่ `packages/web/dist` (`base` = `/` ตั้ง env `BASE_PATH` ถ้าจะวางใต้ path ย่อย) ยังไม่ได้ deploy จริงและไม่มี account หรือ secret ใน repo
1. ติด tag ที่ commit ที่จะ deploy: `git tag v0.1.0` (ทุก build ที่ deploy ต้องติด tag ตาม spec)
2. `corepack pnpm install` แล้ว `corepack pnpm build` (หรือ `APP_VERSION=v0.1.0 corepack pnpm build` ถ้า build จากที่ที่ไม่มี tag เช่น CI ที่ clone ตื้น)
3. ทางที่ 1 (Workers static assets, Cloudflare แนะนำสำหรับโปรเจกต์ใหม่): ใน `packages/web` รัน `npx wrangler login` แล้ว `npx wrangler deploy` ซึ่งอ่าน `wrangler.jsonc` และอัปโหลด `./dist`
4. ทางที่ 2 (Pages ผ่าน Git): ตั้ง build command = `corepack enable && pnpm install --frozen-lockfile && pnpm build`, output directory = `packages/web/dist`, env `APP_VERSION` = tag ที่ deploy
5. เปิดเว็บแล้วตรวจว่าเวอร์ชันท้ายหน้าตรงกับ tag

## สถานะ
- ticket 20: session, battleChoice, playStats และ model ของ Replay ย้ายไป `packages/session` (ชื่อไฟล์ในบรรทัดสถานะด้านล่างเป็นตำแหน่งเดิมก่อนย้าย)
- ticket 17 (build สำหรับ playtest): สถิติการเล่นในเครื่อง (`src/playStats.ts`: เปิดเกม, Battle ที่เริ่ม/จบพร้อมโหมด Scenario Board ผล, วันที่เล่น) เก็บใน localStorage เท่านั้น ถ้า storage ใช้ไม่ได้นับในหน่วยความจำ ใส่ใน `meta.stats` ของทุก Replay ที่ export และ export เดี่ยวได้จากเมนู ("ส่งออกสถิติการเล่น") ลิงก์แบบฟอร์มจาก `src/config.ts` (`FEEDBACK_FORM_URL` หรือ env `VITE_FEEDBACK_FORM_URL`, ว่าง = ซ่อน) หน้า "วิธีเล่น" (`src/Playtest.tsx`, สำเนา `docs/playtest/playtester-guide.md`) Board (`@mt/battle` `boardFit.ts`): zoom เป็นจำนวนเต็มของ device pixel ต่อ pixel ของ Board (คมที่ devicePixelRatio ไม่เต็ม เช่น 1.5625) ขยับ canvas ให้ตรง device pixel อ่านตำแหน่ง canvas ใหม่ก่อนทุกการแตะ (แก้แตะโดนช่องผิดเมื่อ layout เลื่อน) และถอด canvas ทันทีตอน unmount (แก้ canvas ซ้อนตอน dev double mount) Burst บอกเหตุผลเมื่อศัตรูในพื้นที่เป็น Hidden test `test/uiStrings.test.ts` สแกนข้อความ UI ที่ฝังในโค้ด
- ticket 03 (walking skeleton): หน้า Battle เดียว แสดง Scenario 1 บน Crossroads เลือก Unit แล้วเดิน และจบ Turn ได้ มี log จากรายการเหตุการณ์ และแสดงเวอร์ชัน
- ticket 04: deployment แบบ Hotseat (ทีม A วาง → ยืนยัน → หน้าส่งเครื่องปิด Board → ทีม B วาง → ยืนยัน → เปิดเผยพร้อมกัน), หน้าผลทอย initiative และฝั่งที่เริ่มก่อน, ป้ายบอก "2 จาก 3 Unit" ใน Turn แรก, Unit ที่เล่นต่อไม่ได้แสดงจางลง และคำเตือนก่อนจบ Turn ถ้ายังมี Unit ที่ไม่ได้ทำอะไร (`idleUnits` ใน `src/session.ts`)
- ticket 05: เลือก Unit → กด "โจมตี" → แตะเป้าที่ไฮไลต์ → เห็น preview (% โอกาสโดน, ช่วง damage, % critical) → ยืนยันหรือยกเลิก, HP ทุก Unit (รายการ Unit และแถบบน Board), log ครบทุกเหตุการณ์, หน้าสรุปผล (ผู้ชนะ, สาเหตุ, Round) และเริ่ม Battle ใหม่
- ticket 13: เมนูก่อนเริ่ม Battle (`src/Menu.tsx`, model ใน `src/battleChoice.ts`): เลือก Scenario (ต้นเกม/กลางเกม), Board (ทุก Board ใน data พร้อมแผนที่ย่อ), โหมด (Hotseat; "เล่นกับ AI" แสดงแต่กดไม่ได้จนกว่าจะมี AI ticket 15) และทีมที่เล่น (มีใน model แสดงเฉพาะโหมด AI) หน้าสรุปผลมี "เล่นอีกครั้ง (ตั้งค่าเดิม)" และ "กลับไปเมนู"
- ticket 06: legend ของ terrain ใต้ Board (สีและเครื่องหมายเดียวกับ Board, แตะ "Terrain และธาตุ" เพื่อดูกฎ element wheel, terrain, การป้องกัน Tamer และแนวเล็ง), preview แสดงแหล่ง advantage/disadvantage ทุกแหล่งและผลรวมหลังหักล้าง, ปุ่ม "ป้องกัน" (Defend), ป้าย Guarded ใน card ของ Unit และรายการ HP, เป้าที่ถูกบังแนวเล็งแสดงในรายการพร้อม Unit ที่ขวาง และแตะแล้วบอกเหตุผลแทนการเลือก, log บอก Advantage/Disadvantage ของแต่ละการทอย
- ticket 14 (Replay, `src/replay.ts`, `src/ReplayScreen.tsx`): session เก็บ action ที่ engine รับทุกตัว (`snapshot.actions`) export ไฟล์ Replay ได้จากหน้าสรุปผลและจาก "เมนู Battle" ระหว่างเล่น (ซึ่งมี "ออกจาก Battle" แบบยืนยันอีกครั้ง) เมนูหลักมี "เปิดไฟล์ Replay": ไฟล์ผิด schema แจ้งรายการปัญหา, เวอร์ชัน engine หรือ hash ของ data ไม่ตรงแจ้ง "เวอร์ชันไม่ตรง" พร้อมค่าทั้งสองฝั่ง, action ถูกปฏิเสธแจ้งลำดับ action ถ้าเปิดได้จะเข้าหน้าดู Replay แบบอ่านอย่างเดียว: ไปต้นเกม, ย้อน/ถัดไปทีละ action, ไปท้ายเกม พร้อม Board, log และ HP ณ ขั้นนั้น สถิติของ playtester (ticket 17) ใส่ใน `meta.stats` ตอน export (`exportReplay` ใน `src/App.tsx`)
- ticket 12: หลัง d20 ที่ใช้ Inspiration ได้ แผงควบคุมแสดงผลทอยพร้อมปุ่ม "ใช้ Inspiration ทอยใหม่" / "ไม่ใช้" (`useInspiration` / `declineInspiration` ใน `src/session.ts`) ถ้าฝั่งที่ต้องตัดสินไม่ใช่ฝั่งที่ถือเครื่อง (save ระหว่าง Turn ของอีกฝั่ง) จะมีหน้าส่งเครื่อง (`screen: 'decisionHandoff'`) ก่อน และอีกครั้งตอนส่งคืน Inspiration ของ initiative ตอบในหน้าผล initiative แถบบนแสดง Round x/10, damage รวมของแต่ละทีม และ Inspiration ที่เหลือ หน้าสรุปผลบอกผู้ชนะหรือเสมอ สาเหตุ (รวมครบ 10 Round ตัดสินด้วย damage รวม) จำนวน Round และ damage รวม หน้า Replay อธิบาย action ใหม่ (`describeAction` ย้ายมาอยู่ `src/replay.ts`)
- ticket 15 (เล่นกับ AI): เมนูเปิดโหมด "เล่นกับ AI" พร้อมเลือกทีม (`aiOpponent` ใน `src/battleChoice.ts`, AI เล่นอีกทีมด้วย `DEFAULT_GAME_PROFILE`) `createBattleSession(state, { ai })`: AI คิด deployment ก่อนผู้เล่นวางและซ่อนไว้ (ทีม A: ใส่ทันที, ทีม B: ใส่ทันทีหลังผู้เล่นยืนยัน แล้วเปิดเผยพร้อมกัน) Board แสดงสิ่งที่ทีมของผู้เล่นเห็นตลอด ไม่มีหน้าส่งเครื่อง ผู้เล่นทำได้เฉพาะเมื่อเป็นการตัดสินใจของตัวเอง (`decidingSide`) `snapshot.aiToAct` บอกว่า AI ต้องเล่น และ `session.aiStep()` เล่น 1 action ของ AI ผ่าน engine (บันทึกใน `snapshot.actions` เหมือน action ของผู้เล่น Replay จึงเล่นซ้ำได้) `useBattleSession.ts` เรียก `aiStep` ทีละครั้งหลัง delay 700 ms (400 ms ตอนตอบ Inspiration) ระหว่างนั้นแผงควบคุมบอกว่า AI กำลังเล่น/ตัดสินใจ และ log กับ Board แสดงผลทีละขั้น

## Board visual regression (ticket 25)

Separate from `pnpm test`:

```sh
corepack pnpm --filter @mt/web exec playwright install --with-deps chromium
corepack pnpm --filter @mt/web test:visual
# Review and deliberately replace Linux + pinned Chromium baselines:
corepack pnpm --filter @mt/web test:visual:update
```

See [visual/README.md](visual/README.md) for replay fixtures, deterministic animation
frames, baseline status, three-run verification, and ticket 26's CI/artifact commands.

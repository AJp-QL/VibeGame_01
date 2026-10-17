# packages/session/

interaction model ของ Battle แบบไม่มี UI (ADR 0004): สิ่งที่ผู้เล่นทำได้ ณ ตอนนี้ คำนวณจาก engine แล้วส่งให้ battle (Phaser) และ web (React) วาด

**เจ้าของ:** Claude (ADR 0004) battle และ web เป็นของ Codex และใช้ package นี้ผ่าน `src/index.ts` เท่านั้น snapshot API และ port type เป็นสัญญา: เปลี่ยนแบบเพิ่มเท่านั้น Codex ขอการเปลี่ยนผ่าน ticket

## เก็บอะไร
- `src/session.ts`: `createBattleSession(state, { ai? })` store เดียวที่ React (`useSyncExternalStore`) และ Phaser อ่าน การเลือก Unit, การเล็ง (Basic Attack, skill แบบ Unit/ช่อง/พื้นที่, Command, Attune), action ที่ทำได้, preview, หน้า Hotseat (ส่งเครื่อง, initiative), Inspiration และการสั่ง AI ทีละขั้น (`aiStep`), `idleUnits`, และข้อมูลเตือนก่อนทิ้ง Action (phase 1.x ticket 01, เพิ่มอย่างเดียว): `snapshot.actionAtStake` (Unit ที่เล่นอยู่และยังใช้ Action ได้ การเริ่ม Unit อื่นจะเสีย Action นั้น) และ `snapshot.movedWithoutAction` (Unit ที่เดินแล้วแต่ยังไม่ใช้ Action และยังใช้ได้) พร้อม `actionAtStake(state)` / `movedWithoutAction(state)` ที่เรียกกับ state ตรงๆ ได้ Basic Attack, Defend และ skill ที่ไม่ฟรีนับเป็น Action, การเดินและ Camouflage ไม่นับ ไม่มีกติกาของตัวเอง ทุกอย่างมาจาก `legalActions` / `previewAction` / `applyAction` / `unitSkills` / `unitsVisibleTo`
- `src/port.ts`: `BattleSessionPort`, `BattleSnapshot`, `BoardInput` (ย้ายมาจาก battle) สิ่งที่ Board ต้องการจาก session; `BoardLabels` (คำที่ Board วาด) ยังอยู่ใน battle
- `src/battleChoice.ts`: ตัวเลือกก่อน Battle (Scenario, Board, โหมด, ทีมที่เล่นกับ AI) → `BattleSetup` ของ engine และ `aiOpponent`
- `src/replay.ts`: Replay ของ Battle ที่เล่นอยู่ (`battleReplay`), ชื่อไฟล์ (`replayFileName`), เปิดข้อความไฟล์ (`openReplay` → invalid / incompatible / broken / ready) และเล่นซ้ำแบบอ่านอย่างเดียว (`createReplayPlayer`) การดาวน์โหลดไฟล์และบรรทัดอธิบาย action (`describeAction`) อยู่ใน web
- `src/playStats.ts`: สถิติการเล่นของ playtester (`createPlayStats(storage, now)`) storage และนาฬิกาส่งเข้ามา (web ส่ง `localStorage` และเวลาจริง, test ส่งของตัวเอง)
- `src/index.ts` re-export ชื่อจาก engine และ ai ที่ battle/web ใช้ (`createBattle`, `derivedValues`, `legalActions`, `decidingSide`, `ENGINE_VERSION`, ค่าคงที่และ type) UI จึงไม่ import `@mt/engine` / `@mt/ai` ตรง ต้องการชื่อเพิ่มให้เพิ่มที่นี่ (เพิ่มอย่างเดียว)

## แนวทาง/กฎการตั้งชื่อ
- dependency: `@mt/shared`, `@mt/engine`, `@mt/ai` เท่านั้น ห้าม import battle, web, React, Phaser
- ไม่มีข้อความที่ผู้เล่นเห็น (ไม่มีภาษาไทยใน `src/`): session ให้ข้อมูล (event, action, enum เช่น `rejection`, `blocked[].reason`) แล้ว web แปลงเป็นข้อความด้วย `strings.ts` / `skillText.ts` / `describeAction`
- ไม่แตะ DOM, เวลาจริง, timer หรือการสุ่ม: delay ระหว่าง action ของ AI อยู่ใน web (`App.tsx`), นาฬิกาของ playStats ส่งเข้ามา (`Date` ใช้เป็น type ได้ แต่สร้างเวลาเองไม่ได้)
- `test/boundaries.test.ts` ตรวจทั้งหมดนี้ (แบบเดียวกับ engine)

## สถานะ
- ticket 20: แยกออกจาก web พฤติกรรมเดิมทุกอย่าง test ของ session, battleChoice, playStats และ Replay ย้ายมาที่ `test/` ส่วน test ข้อความ (บรรทัด Replay, เหตุผลที่เล็งไม่ได้, ข้อความ skill, ชื่อในเมนู, hash ของ data ที่ bundle) อยู่ที่ `packages/web/test/sessionText.test.ts`

# data/skills/

นิยาม skill ของมอนสเตอร์และ Tamer หนึ่งไฟล์ต่อหนึ่ง skill ตรวจด้วย `SkillSchema` (packages/shared/src/combatData.ts)

## เก็บอะไร
- `tier`: `minor` / `major` (cooldown 2 Turn ตาม rules §13.2) / `signature` (1 ครั้งต่อ Battle) / `passive`
- `target`: `enemy`, `self`, `selfAndAllies` (ตัวเองและพวกในระยะ รวม Tamer), `ally` (รวมตัวเอง), `allyMonster`, `tile`, `area`, `none` (Passive)
- `range`: ระยะ (0 สำหรับ `self`/`none`)
- `attack`: `physical` หรือ `elemental` ถ้า skill ทอย attack roll (ไม่มี = ไม่ทอยโจมตี)
- `damage`, `tamerDamage`: เต๋า damage (`{ count, sides }`)
- `area`: `{ radius, maxTargets }` สำหรับ `area` (Burst)
- `dcStat`: stat ของ Save DC ผู้ใช้ (D-07) ต้องมีเมื่อ status ใดมี save
- `applies`: status ที่ให้ `[{ status, save?, bonus? }]` ทั้ง attack skill (ติดเมื่อโดนและเป้ายังไม่ล้ม) และ skill ที่ไม่ทอยโจมตี (ทอย save ถ้ามี `save`)
- `effects`: `retreat` (Hit and Run), `push`, `counterattackDamage`, `replacesMove`, `requiresTerrain`, `cover`, `terrainTurns`, `heal`

## อ้างอิง PRD
- F3 Tactical grid battle, F5 Tamer (4 class), F7 Monster design (skills)

## แนวทาง/กฎการตั้งชื่อ
- `<skill_id>.json` เช่น `shield_bash.json`
- `basic_attack` และ `defend` ต้องมีเสมอ (engine ใช้ทุก Unit) Defend +2 อยู่ใน `defend.json` (`applies[0].bonus`)
- skill ทุกตัวใน loadout ของ Scenario ต้องมีไฟล์ที่นี่ (`loadGameData` ตรวจ) และ status ใน `applies` ต้องมีใน data/statuses

## สถานะ
- มีครบทุก skill ใน loadout ของ phase 1 (rules §15) + Basic Attack + Defend
- engine ใช้ได้แล้ว: Basic Attack, Defend, Heavy Blow, Rend, Hit and Run, Pack Howl (ticket 07)
- skill อื่นมีข้อมูลแล้วแต่ engine ยังไม่เปิด (ticket 08 Tidewall, 09 Wispling, 10 Quillfox, 11 Tamer) ดู packages/engine/src/skillHandler.ts

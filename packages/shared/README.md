# packages/shared/

types และ data schema ที่ใช้ร่วมกันทุก package

## เก็บอะไร
- type ของ monster, tamer, skill, status, trait, board, campaign, save
- schema สำหรับ validate ไฟล์ใน data/

## อ้างอิง PRD
- F1 Shared stat model, F6 Social (รูปแบบ share code), F7, Technical requirements

## แนวทาง/กฎการตั้งชื่อ
- หนึ่ง schema ต่อหนึ่งโฟลเดอร์ใน data/ ชื่อตรงกัน เช่น species, skills
- เปลี่ยน schema ต้องอัปเดตไฟล์ใน data/ ในชุดเดียวกัน
- ต้องยืนยันชื่อ library และเวอร์ชันจาก docs จริงก่อนเริ่ม implement (ตาม PRD)

## สถานะ
- มี schema (zod) ของ boards, species, scenarios, skills, statuses และ element wheel (`src/combatData.ts`, ticket 07) และ `loadGameData()` ที่ตรวจทั้งโฟลเดอร์ data/ (schema, id ตรงชื่อไฟล์, การอ้างอิงข้ามไฟล์) ใช้ทั้งตอน build, test และโหลด
- ขนาด Board (phase 1.x ticket 13 เพิ่ม; ticket 15 ลบค่าคงที่และค่าเริ่มต้นเดิม): Board เป็นสี่เหลี่ยมจัตุรัสที่ขนาดคือจำนวนแถวของ terrain (`boardSize(board)`, 3 ถึง `MAX_BOARD_SIZE` = 15) ไฟล์ Board ไม่เปลี่ยนรูปแบบ (data hash จึงไม่เปลี่ยน) schema ตรวจว่าทุกแถวยาวเท่าจำนวนแถวและเหมือนเดิมเมื่อหมุน 180° ชื่อช่องคือตัวอักษรคอลัมน์กับเลขแถว (`a1` ถึง `o15`) `isOnBoard(tile, size)` และ `rotate180(tile, size)` รับขนาดเป็นอาร์กิวเมนต์ท้าย (ต้องระบุ; ticket 15 ลบ `BOARD_SIZE` และค่าเริ่มต้น 7 ออก ไม่มีค่าคงที่ขนาด Board อีก) engine, AI, session และ simulator อ่านขนาดจาก Battle ด้วย `boardSizeOf(state)` (`state.terrain.length`)
- มี type ของ Tile และตัวแปลงชื่อช่อง a1–g7
- `loadGameData` ตรวจด้วยว่า skill ใน loadout ของ Scenario มีจริง, status ที่ skill ให้มีจริง และมี element wheel ไฟล์เดียว
- รูปแบบไฟล์ Replay (`src/replay.ts`, ticket 14): `ReplaySchema`, `parseReplay` / `parseReplayText` (ตรวจ schema ตอน import), `serializeReplay` (header แล้ว action บรรทัดละตัว) ฟิลด์: `format`, `formatVersion` (เปลี่ยนเมื่อรูปไฟล์เปลี่ยน), `engineVersion`, `dataHash`, `scenarioId`, `boardId`, `mode`, `humanSide?`, `diceSeed`, `preset?`, `meta?` (`appVersion`, `createdAt`, `stats` สำหรับ ticket 17) และ `actions` (Action ของ engine ตามที่เป็น schema ตรวจแค่ว่าเป็น object ที่มี `type` engine ตัดสินเองตอนเล่นซ้ำ)
- hash ของ data (`src/dataHash.ts`): SHA-256 ของ canonical JSON (ไม่มีช่องว่าง เรียง key ทุกชั้น) ของ GameData ที่ผ่าน `loadGameData` แล้ว จึงไม่ขึ้นกับช่องว่าง, line ending, ลำดับ key หรือลำดับไฟล์ เขียน SHA-256 เองด้วย integer 32 บิต ได้ค่าเดียวกันทั้ง browser และ Node (test เทียบกับ node:crypto และ Web Crypto)

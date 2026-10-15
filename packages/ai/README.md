# packages/ai/

Enemy AI ที่ใช้ร่วมกันระหว่างตัวเกมและ simulation

## เก็บอะไร
- logic การเลือก action ของฝ่ายศัตรู ทำงานบน state ของ engine
- โปรไฟล์พฤติกรรมแบบที่ใช้ใน sim: greedy, tamer_rush, neutral

## อ้างอิง PRD
- F3 Tactical grid battle, F4 Campaign, Prototype kit

## แนวทาง/กฎการตั้งชื่อ
- deterministic เมื่อให้ seed เดียวกัน ต้องได้ action เดียวกัน
- เรียก engine เท่านั้น ห้ามมี logic กติกาซ้ำ
- dependency: `@mt/engine` และ `@mt/shared` เท่านั้น ไม่มี UI ไม่มีเวลาจริง (delay ระหว่าง action อยู่ใน web)

## Interface (`src/index.ts`, ticket 15)
- `createAi(battle, side, profile)` → `AiState` หน่วยความจำของ AI เป็นข้อมูลล้วน: dice stream ของ AI เอง (`aiDiceStream` ของ engine = สำเนา stream เริ่มต้นของ Battle แล้ว `jump()` 1 ครั้ง, rules §21.5 ข้อ 4), activation ที่กำลังเล่น และ Unit ที่เล่นแล้วใน Turn นี้ ส่ง state ของ Battle ตอนสร้าง (ก่อนทอยลูกใดๆ)
- `chooseAction(state, ai)` → `{ action, ai }` action ถัดไปที่ legal ณ ตอนนี้ เรียกเมื่อ `decidingSide(state)` เป็นฝั่งของ AI: deployment, Inspiration (initiative, attack roll, save ระหว่าง Turn ของอีกฝั่ง), ขั้นถอยของ Hit and Run และทุก action ใน Turn (Command, Move/Blink, Action, จบ Turn) เป็น pure function: state + `ai` เดิม → ผลเดิม และไม่แตะลูกเต๋าของ Battle
- `planDeployment(state, ai)` → deploy ทั้ง 3 Unit + Confirm คิดจาก Board และ Unit ของตัวเองเท่านั้น จึงคิดก่อนอีกฝั่งวางได้ (vs AI ให้ AI วางก่อนแบบซ่อน rules §17.1)
- `SIM_PROFILES` / `GAME_PROFILES` / `DEFAULT_GAME_PROFILE` (ดูด้านล่าง)

## วิธีคิด (port จาก prototype/simulation/sim.py class `AI`)
- greedy มองหนึ่ง activation ด้วยค่าคาดหมาย: ทุก Turn เล่นได้กี่ activation ก็วางแผนทุก Unit ที่ยังไม่เล่น เลือกตัวที่ `gain` สูงสุด (เสมอ = ตัวแรกตามลำดับ Unit) แล้วเล่นตามแผนจนจบ แผน = ช่องที่ไป (เดินหรือ Blink) + Action โดยเลือกระหว่าง "เดินก่อนแล้วทำ" กับ "ทำก่อนแล้วเดินไปช่องที่ดีที่สุด" Tamer ได้ Command ตอนเริ่มหรือจบ activation ตาม `cmd_value` สูตร น้ำหนัก (`w`, `kb`, `wdef`, `kbdef`, `pen`, `threat`, `pos_value`, `attack_val`, คะแนนของ skill ทุกตัว) และลำดับการไล่ช่อง/ผู้สมัครเหมือน sim.py ทุกอย่าง (`src/planner.ts`, `src/model.ts`)
- กติกาทั้งหมดมาจาก engine: action ที่ legal (`legalActions` สำหรับปลายทาง, `previewAction` ตรวจทุก action ที่พิจารณาบน state หลังเดินจริงจาก `applyAction`), โอกาสโดน/damage/save (`previewAction`, `previewAttackWhatIf`), advantage/disadvantage (`rollModeSources` ใน preview), ระยะเดิน (`moveRangeNow`), terrain (`terrainEffectAt`), cooldown (`unitSkills`) AI ทำแค่คณิตศาสตร์ค่าคาดหมาย (`src/odds.ts` = `hit_probs`/`dmg_stats`/`ev_raw` ของ sim) บนตัวเลขที่ engine ให้
- Inspiration ตาม sim.py: ใช้เมื่อ attack roll ใส่ Tamer พลาด และเมื่อ save ของตัวเองไม่ผ่าน ไม่ใช้กับ initiative
- deployment ตาม sim.py `deploy`: Monster ก่อนแล้ว Tamer ช่องละคะแนนสุ่ม (จาก stream ของ AI) + terrain ×3 + บทบาท (Tamer แถวหลังกลาง, ระยะประชิดแถวหน้า, ระยะไกลแถวหลัง)

## โปรไฟล์
| โปรไฟล์ | ใช้ที่ | ต่างจาก sim.py |
|---|---|---|
| `SIM_PROFILES.greedy / tamer_rush / neutral` (sim-parity) | simulator ticket 16 | ไม่ต่าง: รวม quirk ของ cache ใน sim.py (`simQuirks: true`: ค่าตำแหน่งที่ Hit and Run คิดไว้ขณะยังยืนที่ช่องโจมตีถูกใช้ซ้ำเมื่อแผนไปถึงช่องนั้น) |
| `GAME_PROFILES.*` (in-game) | เว็บ (`DEFAULT_GAME_PROFILE` = greedy) | heuristic ปกป้อง Tamer (`protectTamer` 0.5: โทษของภัยต่อ Tamer ในค่าตำแหน่งของ Monster ×1.5 และ Tamer ได้ +0.5 เมื่อมี Monster ติดกัน) และรุมเป้าเดียว (`focusFire` 0.5: ค่าการโจมตี ×(1 + 0.5 × สัดส่วน HP ที่เป้าเสียไป)) และไม่มี quirk ของ cache |

ค่า heuristic มาจากการลองเทียบ game:greedy กับ sim:greedy 200 เกมต่อค่า (`test/versus.ts`): ทุกค่าที่ลองอยู่ในช่วง 47–57% ชนะ (ใกล้ noise) ค่า 0.5/0.5 ได้ 53% (S1) และ 57% (S2)

## Test และเครื่องมือ
- `test/ai.test.ts`: เล่นจนจบทุก Scenario × Board × โปรไฟล์ × Dice Seed 2 ค่า (AI ทั้งสองฝั่ง) ทุก action อยู่ใน `legalActions`, deterministic, ไม่กินลูกเต๋าของ Battle (เล่น action ที่บันทึกซ้ำโดยไม่มี AI ได้ state เดียวกัน), deployment อยู่ในโซน, ตอบ Inspiration/ขั้นถอย
- `test/simParity.test.ts`: decision parity กับ sim.py: `test/simParity/sim_decisions.json` (107 จุดตัดสินใจจาก sim.py variant U4, S1/S2, ทั้ง 3 โหมด) สร้าง state เดียวกันใน engine แล้วต้องเลือกแผนเดียวกันทุกจุด (Unit, ลำดับ, ช่อง, action, เป้า, Command, ขั้นถอย) สร้างใหม่ด้วย `python packages/ai/test/simParity/dump_sim_decisions.py --games 4 --every 5 --out packages/ai/test/simParity/sim_decisions.json` (ชุดใหญ่ `--games 40 --every 1` ตรง 6,830/6,830 ตรวจด้วย `AI_PROBE=<file> AI_PROBE_OUT=<report> npx vitest run packages/ai/test/simParityProbe.test.ts`) `rebuild.ts` ใช้ stat ของ sim.py และให้ Tidewall เดิน 3 เพื่อเทียบแค่การตัดสินใจ
- `node packages/ai/test/bench.ts [games] [scenario] [mode] [sim|game]`: เวลาต่อ Battle (AI ทั้งสองฝั่ง ตั้งแต่ deployment จนจบ)
- `node packages/ai/test/versus.ts [games] [scenario] [game:greedy] [sim:greedy] [board]`: โปรไฟล์ต่อโปรไฟล์ สลับทีม

## สถานะ
- ticket 15 เสร็จ: AI ครบทุก skill ใน loadout, เวลา ~50–70 ms ต่อ Battle บนเครื่องพัฒนา
- หมายเหตุสำหรับ ticket 16: ความต่างที่รู้แล้วระหว่าง engine กับ sim.py (ไม่ใช่ AI): Tidewall เดิน 2 (rules §3.2, DL 2026-10-14; sim 3), data Scenario 2 Tidewall POW 20 และ Quillfox SPI 16 (sim 16 และ 12), ลำดับเป้าของ Burst และลูกเต๋าของ deployment (rules §21.7)

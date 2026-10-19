# tools/simulator/

Simulator แบบไม่มี UI (ticket 16): รัน Battle หลายพันเกมด้วย engine และ AI ตัวเดียวกับเกม แทน Python sim (prototype/simulation/sim.py) เป็นเครื่องมือ tuning

## Usage (จาก root ของ repo)
```
corepack pnpm sim run --scenario scenario_1 --board crossroads --a sim:greedy --b game:greedy \
  [--games 1000] [--seed 0] [--sim-equivalent] [--format md|json] [--out file]
corepack pnpm sim parity   [--games 2000] [--other-games 1000] [--seed 0] [--out docs/balance/sim-v4-parity]
corepack pnpm sim baseline [--games 1000] [--seed 0] [--out docs/balance/phase-1-baseline]
corepack pnpm sim ranges   [--games 2000] [--seed 0] [--workers n] [--out docs/balance/ticket-08-range-experiments]
corepack pnpm sim distance [--games 2000] [--seed 0] [--workers n] [--only ids] [--out docs/balance/ticket-20-distance-experiments]
```
- โปรไฟล์ AI: `sim:<mode>` = `SIM_PROFILES` (port ของ sim.py), `game:<mode>` = `GAME_PROFILES` (AI ในเกม), mode = `greedy` | `tamer_rush` | `neutral`
- `--seed` = Dice Seed ฐาน (hex 1–16 หลัก) Battle ที่ i (นับจาก 0) ใช้ seed = ฐาน + (i+1)·0x9e3779b97f4a7c15 mod 2^64 (ฐาน 0 = `seedOf(i + 1)` ของ packages/ai/test/play.ts) ใส่ค่าเดิมได้ตัวเลขเดิมทุกตัว
- `run` พิมพ์ Markdown หรือ JSON (`{ config, overrides, metrics }`); `parity` และ `baseline` เขียน `<out>.md` + `<out>.json`
- ความเร็ว ~0.1–0.15 วินาทีต่อ Battle (thread เดียว)

## Range experiments (phase 1.x ticket 08)
`sim ranges` (ticket 08; ตั้งแต่ ticket 09 เกมเล่น variant `abc`) วัด variant ของระยะ skill ทุกแบบบนทุกชุด (Scenario 1/2 × Crossroads/Shallows) ด้วย AI ของเกม (`game:greedy`) ทั้งสองฝั่ง กระจายไปหลาย worker thread (`--workers`, ค่าเริ่มต้น = จำนวน CPU) และเขียน `<out>.md` (ตาราง) + `<out>.json` `run --variant <id>` เล่น variant เดียว Variant ไม่แตะ `data/` และกติกาของเกม มีอยู่แค่ในการรันนี้ (`src/variants.ts`) และเขียนเป็นชุดเต็มของสามส่วน (เปิดหรือปิด) ไม่ว่า data/ มีอะไร: `baseline` ยังหมายถึงระยะ, Board และกติกาก่อน ticket 09 และ `abc` = เกมตอนนี้ (test ยืนยันว่าเล่นได้ตัวเลขเดียวกับ run ธรรมดา) ตัวเลือก `--only baseline,abc` วัดเฉพาะบาง variant:
- `a` ระยะสั้นลงใน data: Long Shot, Element Bolt, Pin 4 → 3, Mark 5 → 4
- `b` attack roll ที่ระยะ 4 ขึ้นไปได้ disadvantage (กติกา `RangeRules.longRangeDisadvantageFrom` ของ engine (ตั้งแต่ ticket 09 เป็นกติกาของเกม))
- `c` ภูเขาบัง line of sight (กติกา `RangeRules.sightBlockedBy` ของ engine (ตั้งแต่ ticket 09 เป็นกติกาของเกม)) พร้อมภูเขาเพิ่ม 4 ช่องต่อ Board เป็นคู่ที่หมุน 180° แล้วเหมือนเดิม (`EXTRA_MOUNTAINS`)
- `ab`, `ac`, `bc`, `abc` = ผสม; `baseline` = วันนี้
- ตัวชี้วัดใหม่ `turnsBeforeFirstAttack` (ใน `GameRecord` และ `Metrics`): จำนวน Turn (ของสองฝั่ง) ที่จบไปก่อน Turn ที่มี attack roll ครั้งแรก, 0 = โจมตีใน Turn แรก, Battle ที่ไม่มี attack roll เลยนับทุก Turn ที่มี
- เป้าหมาย (spec story 41): ทีม A ชนะ 40–60%, turn limit ไม่เกิน 15% ทุกชุด, Turn ก่อนโจมตีครั้งแรกสูงกว่า baseline

## Library (`src/index.ts`)
- `loadRepoData()` = data/ ผ่าน `loadGameData` แบบที่เกมใช้
- `simulateGames(data, { scenario, board, profiles: { A, B } }, games, baseSeed)` → `GameRecord[]` (หนึ่งรายการต่อ Battle: ผู้ชนะ, สาเหตุ, ฝั่งที่เล่นก่อน, Turn ของแต่ละฝั่ง, Unit ที่ล้มก่อน, damage ตามผู้โจมตี, การโจมตี/โดน, Tamer โดน, Shield Bash ผลัก, action ที่ใช้)
- `aggregate(records)` → `Metrics` ชุดเดียวกับ `aggregate` ของ sim.py v4 (A/B ชนะ, เสมอ, ผู้เล่นก่อนชนะ, rounds, Turn A/B, 10-turn limit, Tamer ล้มก่อน, ชนะด้วย Tamer/Monster/limit, Unit ที่ล้มก่อน, damage ต่อเกมตามผู้โจมตี, Tamer hits, pushes, action ต่อเกม) + standard error
- `metricsTables`, `skillTable` = ตาราง Markdown
- `simEquivalentData(data)` = เงื่อนไขเดียวกับ sim v4 (ดูด้านล่าง), `runParity`, `compareWithSimV4`, `parityTable`
- `summarizeBattle` เป็น pure function ของ action + event (test ใช้ event ที่เขียนเอง)

## นิยามที่ตรงกับ sim.py
- damage ต่อเกม (`dmg_by`): ทุก `damageDealt` (การโจมตีและโจมตีกลับ ไม่รวม Bleed) นับ min(damage, HP ที่เป้ามีก่อนโดน) อย่างน้อย 1 (ต่างเล็กน้อย: ถ้า Cover รับแทน engine ใช้ HP ของ Tamer ที่รับ, sim ใช้ HP ของเป้า)
- การโจมตี: `attackRolled` หลัง Inspiration (ลูกที่ reroll แทนลูกเดิม) รวมโจมตีกลับและ Mark; Tamer hits = ที่โดน Tamer
- rounds = max(Turn A, Turn B) เหมือน sim; "Tamer first down" = Unit แรกที่ล้มเป็น Tamer

## เงื่อนไขเดียวกับ sim (test/tool เท่านั้น, decision log 2026-10-16, D-25)
`simEquivalentData` คืนสำเนา GameData ที่แก้แล้ว ไม่แตะ data/ และไม่เปลี่ยนเกม:
- stat ทุก Unit = `TEMPL` ของ sim.py v4 ตาม species + Star (Tamer ตาม Level) ที่ต่างจาก data จริงมีแค่ Scenario 2: Tidewall POW 20 → 16, Quillfox SPI 16 → 12
- (ticket 09, D-31) ระยะ Long Shot, Element Bolt, Pin 4 และ Mark 5 กลับเป็นของ sim v4, Board ไม่มีภูเขาเพิ่ม 4 ช่อง และไม่ใช้กติการะยะ (`NO_RANGE_RULES`, `simEquivalentData(...).rangeRules`)
- Tidewall เดิน 3 แบบ kit exception ของ sim.py ผ่าน field `moveBonus` ของ species (optional, ไม่มีใน data/ จึงไม่เปลี่ยน data hash, Replay และ ENGINE_VERSION; ถ้าไม่ตั้ง = 0)
- ไม่ได้ปรับ (เทียบได้เชิงสถิติเท่านั้น, rules §21.7): ลูกเต๋าของ deployment (AI stream แทน `random.Random`), ลำดับเป้าของ Burst (ตามที่เลือก ไม่ใช่ลำดับ Unit), ลูกเต๋าทุกลูกมาจาก stream ของ engine

## Test
`test/simulator.test.ts`: determinism (seed เดิม → JSON เดิม), metric บน Battle ที่เขียนเองและ record ที่คิดมือ, เงื่อนไข sim-equivalent (Tidewall เดิน 3 / data จริงเดิน 2, data hash ไม่เปลี่ยน), argument ของ CLI, parity smoke 100 เกมต่อ config (S1/S2 U4 อยู่ใน 4 SE ของ sim v4)

## สถานะ
- ticket 16: รายงาน parity `docs/balance/sim-v4-parity.md`, baseline กติกาจริง `docs/balance/phase-1-baseline.md`

`sim distance` (ticket 20) วัดวิธีวัดระยะ (Chebyshev ของเกม, ไม่มีทแยง, ทแยงสลับ 1/2) คูณระยะ long shot (3 ของเกม หรือ 2) บนเกมหลัง ticket 09 พร้อมตัวชี้วัดช่องปลอดภัย/ถูกคุกคามต้น Turn (`src/threat.ts`, นิยาม Threat zone) Variant อยู่แค่ในการรัน: วิธีวัดระยะเปิดด้วย `withDistanceMetric` ของ engine ผ่าน `Matchup.distanceMetric` (ค่าเริ่มต้น Chebyshev, เกมไม่เคยตั้ง) รายงาน: `docs/balance/ticket-20-range-experiments-followup.md`

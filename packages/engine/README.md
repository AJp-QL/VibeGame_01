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
  - initiative (rules §17.2, D-09, `src/initiative.ts`): d20 + AGI mod สูงสุดในทีม (รวม Tamer) A ทอยก่อน B เสมอทอยใหม่ทั้งคู่ เก็บผลทุกคู่ใน `state.initiative` (รวมคู่หลังใช้ Inspiration ดู ticket 12 ด้านล่าง)
  - Turn, Round และ activation (rules §17.3–17.4, `src/turns.ts`): เลือกลำดับ Unit เอง Unit ละ Move 1 ครั้งและ Action 1 ครั้ง (`hasMoved`, `hasActed`), activation จบเมื่อ Unit อื่นเริ่ม, Turn แรกของฝั่งที่เริ่มก่อนเล่นได้ 2 จาก 3 Unit (`state.activations`), จบ Turn ได้ทุกเมื่อ
  - Move (สูตรระยะเดิน, 8 ทิศ, Unit บัง, Flying, Aquatic)
- `createBattle({ ..., preset })` ข้าม deployment และ initiative แล้ววาง Unit ที่ช่องใดก็ได้ ใช้ใน test, เครื่องมือ และ puzzle เท่านั้น
- ค่าที่ได้จากสูตรครบ (HP, Guard, Ward, proficiency, attack bonus, damage mod) และ Basic Attack (ticket 05): attack roll, critical, ทอย 1 พลาด, damage ตามระยะ, Unit ล้มออกจาก Board, ชนะเมื่อ Tamer ล้มหรือ Monster หมด, preview เป็นเศษส่วนจริงโดยไม่ทอย
- กติกาการโจมตีอยู่ใน `src/combat.ts` (`attackOnce` ใช้ร่วมกันระหว่าง Basic Attack และ skill) โดยมีช่องรอสำหรับ Hidden, Taunted, Marked, Weakened, Cover, Counter
- ticket 06:
  - line of sight (rules §7, `src/lineOfSight.ts`): Bresenham จากผู้โจมตีไปเป้า (D-01) Unit บนเส้นบังการโจมตีระยะ 2 ขึ้นไป ยกเว้นผู้โจมตีเป็น Flying ถูกบังแล้วถูกปฏิเสธด้วย `no-line-of-sight` พร้อม `blockedBy` และ `lineOfSightTiles(from, to)` export ไว้ให้ test, AI และ UI
  - advantage/disadvantage (rules §4, §5, §9, `src/rollMode.ts`): element wheel (แสงกับมืดหักล้างกันตาม D-08), terrain ใต้ผู้โจมตี (Tamer และ Flying ไม่ได้รับผล, Aquatic นับน้ำเป็นธาตุตัวเอง), การป้องกัน Tamer (`cancellableByCommand: false` ให้ ticket 11) preview มี `rollModeSources` ทุกแหล่งก่อนหักล้าง และ `rollMode` คือผลสุทธิ
  - Defend (rules §12): action `defend` ใช้ Action ของ Unit ผ่านกฎ activation ได้ Guarded (`statuses`, Guard และ Ward +2) หลุดตอนเริ่ม Turn ถัดไปของฝั่งตัวเอง (event `defended`, `statusApplied`, `statusEnded`) ค่า +2 อยู่ใน data/skills/defend.json (ticket 07)
- skill และ status (ticket 07):
  - action `useSkill` (`{ unit, skill, target? | targets? | tile? | element? }` ตามชนิดเป้าของ skill) และ `retreat` (`{ unit, to: Tile | null }` ขั้นถอยของ Hit and Run) ใน `src/skills.ts`; `unitSkills(state, unitId)` คืน loadout พร้อม tier, cooldown ที่ UI แสดง (rules §13.2), Signature ที่ใช้แล้ว และ skill ที่ engine ใช้ได้แล้ว
  - tier และ cooldown: Minor ไม่มี, Major ใช้ Turn N ใช้อีกได้ Turn N + 2 ของฝั่งตัวเอง (D-16, `unit.skillsUsed`), Signature 1 ครั้งต่อ Battle, Passive ใช้ไม่ได้ skill ที่ติด cooldown ไม่อยู่ใน `legalActions`
  - status (`src/statuses.ts`): ข้อมูลจาก data/statuses, save = d20 + mod เทียบ 8 + proficiency + mod ของ `dcStat` (ไม่มีกฎ 1/20, D-27), ไม่ซ้อน ติดซ้ำเริ่มนับใหม่ (`refreshed`), นับลดตอนจบ Turn ของฝั่งที่ติด และข้ามครั้งแรกถ้าติดใน Turn ของฝั่งตัวเอง (D-02, `skipCountdown`), Guarded/Countering หลุดตอนเริ่ม Turn ถัดไปของฝั่งตัวเองก่อน Bleed tick, Bleed tick ตามลำดับ Unit (event `statusTicked`) และจบ Battle ได้ ผลที่ใช้แล้ว: Bleed, Rallied (+1 attack roll ใน `statusAttackBonuses` ของ preview), Guarded, Pin (ระยะเดิน 0 และไม่มีขั้นถอย)
  - Hit and Run: หลังโจมตี (โดนหรือพลาด) ตั้ง `state.pending` ให้เลือกถอย ระหว่างนั้น action อื่นถูกปฏิเสธด้วย `decision-pending` ขั้นถอยไม่ใช่ Move
  - preview ของ skill: `AttackPreview` (+ `statuses` พร้อม % ไม่ผ่าน save), `SavePreview` (skill ที่ทอยแค่ save), `EffectPreview` (Pack Howl) เป็นเศษส่วนจริง
  - เพิ่ม skill: ลงทะเบียน handler ในไฟล์ของเจ้าของ (`fangrelSkills.ts`, `tidewallSkills.ts`, `wisplingSkills.ts`, `quillfoxSkills.ts`, `tamerSkills.ts`) ดู `src/skillHandler.ts`
  - element wheel อ่านจาก data/elements (`BattleSetup.elementWheel`), status จาก `BattleSetup.statuses`
- Inspiration และ turn limit (ticket 12):
  - `state.inspiration` (ฝั่งละ 1 ต่อ Battle, rules §18) หลัง d20 ที่ทอยใหม่ได้ (initiative, attack roll, save; rules §21.6) ถ้าฝั่งเจ้าของ d20 ยังมี Inspiration engine หยุด action ไว้กลางทาง: `state.pending = { kind: 'inspiration', side, roll, resume }` (event `inspirationOffered` ตามหลัง event ของการทอย) state ณ จุดนั้นแสดงผลถึงลูกที่ทอย (เช่น damage ก่อน save) ระหว่างนั้น `legalActions` คืนแค่ `useInspiration` / `declineInspiration` ของฝั่งนั้น action อื่นถูกปฏิเสธด้วย `decision-pending` ตอบผิดฝั่งหรือไม่มีให้ตอบได้ `no-decision`
  - ใครตัดสิน: attack roll = ฝั่งผู้โจมตี, save = ฝั่งเป้า (อาจเป็นระหว่าง Turn ของอีกฝั่ง), initiative = ฝั่งที่แพ้ก่อน ถ้าทอยใหม่แล้วลำดับกลับ ฝั่งที่กลายเป็นฝ่ายแพ้ใช้ของตัวเองได้ เสมอ = ทอยคู่ใหม่ (D-09) `decidingSide(state)` บอกว่าฝั่งไหนต้องเล่นตอนนี้ (Hotseat ใช้ส่งเครื่อง)
  - เสนอทุกครั้งที่ยังไม่ใช้ แม้ทอยใหม่จะเปลี่ยนผลไม่ได้ (rules §18 "ใช้ได้ไม่ว่าผลแรกจะสำเร็จหรือไม่") ใช้ = ทอยใหม่ทันทีจำนวนลูกเท่าเดิม (advantage/disadvantage ทอยใหม่ทั้ง 2 ลูกภายใต้สถานะเดิม) ผลใหม่ใช้แน่นอน event ใหม่มี `rerolled: true` (initiative: `rerolled: <side>`) ไม่ใช้ = ไม่ดึงลูกเต๋า ลำดับลูกเต๋าจึงเหมือนไม่มี Inspiration
  - กลไก (`src/resolution.ts`): action ที่อาจทอย d20 แบบนี้ (Basic Attack, `useSkill`, `confirmDeployment` ที่ทอย initiative) เขียนเป็น generator ที่ `yield` event และจุดตัดสินใจ `runResolution` เดินจนจบหรือจนเจอจุดที่ยังไม่มีคำตอบ คำตอบ resolve action เดิมใหม่จาก state ก่อน action (เก็บใน `pending.resume`) พร้อมคำตอบก่อนหน้า ได้ลูกเต๋าเดิมทุกลูก แล้วทำต่อ state เป็นข้อมูลล้วน Replay จึงเก็บแค่ action
  - ticket 08–11: ทอย attack roll ผ่าน `attackOnce` (Mark, ทุกเป้าของ Burst, counterattack) และ save ผ่าน `giveSkillStatuses` แล้วได้ Inspiration เอง d20 อื่นที่ทอยใหม่ได้ใช้ `yield* rollD20(...)` handler `resolve` เป็น generator (ดู `src/skillHandler.ts`) ขั้นถอยของ Hit and Run ถูกเสนอหลัง Inspiration ของ attack roll เสมอ
  - preview ไม่สนใจ Inspiration: % เป็นของการทอยครั้งเดียว
  - damage รวม (`state.damageDealt`, rules §19.2, D-11): ทุกครั้งที่ Unit เสีย HP นับให้ฝั่งตรงข้ามเต็มจำนวนรวม overkill และ Bleed (นับใน `loseHp`) heal ไม่หักลบ เมื่อจบ Turn ที่ปิด Round 10 (`ROUND_LIMIT`) Battle จบด้วย `cause: 'turnLimit'` ฝั่งที่ damage รวมมากกว่าชนะ เท่ากัน `winner: null` (เสมอ) event `battleEnded` มี `damageDealt`
  - `BattleSetup.inspiration` (ค่าเริ่มต้นทั้งสองฝั่งมี) ปิดได้สำหรับ test และเครื่องมือ fixture ของ test ปิดไว้เป็นค่าเริ่มต้น test ของ Inspiration เปิดเอง
- Tidewall (ticket 08, `src/tidewallSkills.ts`, `src/taunt.ts`, `src/push.ts`, counterattack ใน `src/combat.ts`):
  - Taunt และ Counter เป็น GENERIC (save SPI เทียบ DC จาก VIT → Taunted 1 พร้อม `source`; Countering บนตัวเอง) Pincer Guard เป็น Passive ไม่มี handler (`counteringOf` อ่าน `effects.counterattackDamage` จาก loadout แทน dice ของ Countering)
  - counterattack (rules §10.5 ข้อ 6, §14.2, D-23): อยู่ใน `attackOnce` ทุกการโจมตี (Basic Attack, skill, Mark, ทุกเป้าของ Burst) ทั้งโดนและพลาด เมื่อเป้าติด Countering ผู้โจมตีอยู่ระยะ 1 และทั้งคู่ยังไม่ล้ม: event `counterattack` แล้ว `attackRolled`/`damageDealt` ที่ `skill: 'counterattack'` (`COUNTERATTACK`) แล้ว `statusEnded` (Countering) counterattack ใช้ `attackOnce(..., { counterattack: true })` จึงได้ Inspiration ของฝั่งผู้ counter, advantage/disadvantage และ Weakened ตามปกติ และไม่ทำให้เกิด counter ต่อ ticket 10/11 ใส่ขั้น 5 (Off-balance, Hidden, Command) ก่อนบรรทัด counter และต้องไม่ใช้ Command กับ counterattack (`options.counterattack`)
  - `AttackPreview.counterattack` (มีเมื่อเป้าติด Countering ที่ระยะ 1): preview ของ counterattack ที่จะตามมา
  - Shield Bash: damage → counterattack (ถ้ามี) → ผลัก (rules §6.4) เฉพาะเมื่อโดนและทั้งคู่ยังไม่ล้ม event `unitPushed` หรือ `pushBlocked` (`blockedBy`: id ของ Unit หรือ `'offBoard'`) การผลักไม่ใช่ Move ไม่สนใจ Pin ticket 10 ตรวจ Hidden หลังผลักใน `push()`
  - Taunted (rules §14.3, D-05, `src/taunt.ts`): กรณีของ Unit ที่ติด Taunted ถูกตัดสินตอนเริ่ม activation (`activate` เก็บ `state.activations.tauntDuty`): โจมตีผู้ taunt ได้ใน activation นี้ (จากช่องเดิม หรือหลัง Move/Blink, ด้วย attack ใดก็ได้ รวม Burst ที่มีผู้ taunt ใน `targets`) → Action ต้องเป็นการโจมตีผู้ taunt, Move อิสระ; ไม่อย่างนั้น → Move/Blink ได้เฉพาะช่องที่ใกล้ผู้ taunt ที่สุด และ Action ต้องไม่ใช่การโจมตี ฝ่าฝืน = `taunted` กรองใน `legalActions` และตรวจใน `applyAction`/`previewAction` (`tauntCheck`) ผู้ taunt ล้ม = ไม่มีผล ฝั่งจบ Turn ได้เสมอ Unit ไม่ถูกบังคับให้ต้อง Move หรือใช้ Action
- Replay (ticket 14, `src/replay.ts`): `recordReplay(header, data, actions, meta?)`, `replayCompatibility(replay, data)` (เวอร์ชัน engine และ hash ของ data ต้องตรงทั้งคู่ ไม่ตรง = รายงาน ไม่แปลง), `replayBattle(replay, data)` คืน state เริ่มต้น, state + เหตุการณ์ทุกขั้น และ state สุดท้าย หรือ error พร้อม index ของ action ที่ถูกปฏิเสธ
- `ENGINE_VERSION` (`src/version.ts`, semver): ต้อง bump ใน commit เดียวกับการเปลี่ยน engine ที่ทำให้ data + Dice Seed + action ชุดเดิมได้ผลต่างไป (state, เหตุการณ์, ลำดับลูกเต๋า หรือ action ที่รับ/ปฏิเสธ) รวม action ใหม่และทุก ticket กติกา ช่วง 0.x bump เลขกลาง (0.1.0 → 0.2.0) เปิด Replay เก่าด้วยการ checkout git tag ของ build ที่บันทึก (`meta.appVersion`)
- test อยู่ใน `test/` ผ่าน interface สาธารณะเท่านั้น และมี test ตรวจว่า engine import แค่ shared และไม่ใช้เวลาจริง, ตัวสุ่ม, network หรือ DOM

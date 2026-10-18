# กติกา Battle ฉบับรวม (phase 1)

เอกสารนี้เป็นต้นฉบับเดียวของกติกา Battle ที่ engine ใช้ implement (ADR 0001) รวม rules v1–v4 ใน `prototype/rules/`, PRD (F1, F3, F5, F7 ส่วน "Skill spec: vertical slice" และ Prototype kit), decision log และ ruling จาก simulation และ playtest เข้าไว้ที่เดียว ไม่ต้องอ่านแหล่งเดิมซ้อนกันอีก ตัวเลขที่ปรับบาลานซ์ได้ (stat, ระยะ, dice) จะย้ายไปอยู่ใน `data/` ส่วนเอกสารนี้กำหนดสูตรและลำดับการทำงาน

คำศัพท์ทั้งหมดใช้ตาม `CONTEXT.md` อ้างอิงข้อในเอกสารนี้ด้วยรูปแบบ "rules §X.Y" ส่วนประเด็นที่ยังต้องตัดสินใช้รหัส "D-NN" (ดู §23)

ป้ายแหล่งที่มาในวงเล็บเหลี่ยม: [v1]–[v4] = rules ใน prototype/rules, [PRD] = PRD, [DL] = decision log แถววันที่ 2026-10-14, [sim] = การตีความใน prototype/simulation/sim.py, [PT] = ruling จาก playtest, [ใหม่] = กำหนดในเอกสารนี้

---

## 1. ขอบเขตและลำดับความสำคัญ

### 1.1 ขอบเขต
- ครอบคลุมทุกกติกาที่ Battle vertical slice ของ phase 1 ต้องใช้: Board 7x7, Basic Tamer + Monster 2 ตัวจาก 4 species (Fangrel, Tidewall, Wispling, Quillfox), skill ตาม loadout ของ Prototype kit, status 10 ตัว, Scenario 1 และ 2
- สิ่งที่อยู่นอกขอบเขตดู §22

### 1.2 ลำดับความสำคัญเมื่อแหล่งเดิมขัดกัน
decision log แถววันที่ 2026-10-14 > PRD > rules v4 > v3 > v2 > v1 > การตีความใน sim.py > บันทึก playtest

เมื่อแหล่งเดิมกำกวมหรือขัดกันและแก้จากแหล่งที่สำคัญกว่าไม่ได้ เอกสารนี้ระบุค่าที่ใช้ชั่วคราว (ส่วนใหญ่ตาม sim.py เพื่อให้เทียบผลกับ sim v4 ได้) และลงไว้ใน §23 "ต้องตัดสิน" ทุกข้อ

### 1.3 การแก้เอกสารนี้
- แก้ผ่าน git ไม่มีเลขเวอร์ชันในชื่อไฟล์ [DL]
- การเปลี่ยนกติกาทุกครั้งต้องเพิ่มแถวใน `docs/decisions/decision-log.md`
- `prototype/rules/` v1–v4 เป็นประวัติแบบอ่านอย่างเดียว ไม่ใช่แหล่งกติกาอีกต่อไป

---

## 2. Board, พิกัด และระยะ

### 2.1 Board
- Board เป็นสี่เหลี่ยมจัตุรัส 7x7 (คอลัมน์ a ถึง g แถว 1 ถึง 7) หรือ 9x9 (คอลัมน์ a ถึง i แถว 1 ถึง 9) แต่ละ Board มีขนาดของตัวเอง ขนาดอ่านจากจำนวนแถวของไฟล์ใน `data/boards/` [v1, phase 1.x ticket 13 และ 15]
- ในเอกสารนี้พิกัดเชิงตัวเลขใช้ `x` = ดัชนีคอลัมน์ (a = 0 ถึง g = 6) และ `y` = ดัชนีแถว (แถว 1 = 0 ถึง แถว 7 = 6)
- ทีม A วางใน 2 แถวแรก (แถว 1–2) ทีม B วางใน 2 แถวหลัง (7x7: แถว 6–7, 9x9: แถว 8–9) [v1, PRD]
- ทุกช่องมี terrain เป็นหนึ่งใน 6 ธาตุ หรือช่องปกติที่ไม่มีธาตุ terrain ไม่มีผลกับค่าใช้จ่ายการเดินและไม่บัง line of sight
- ไม่มี fog of war ทั้งสองฝั่งเห็น Board และ Unit ทั้งหมด (ยกเว้นช่วงวางแบบปิดใน deployment §17.1) [PRD]
- Board ต้องสมมาตรเมื่อหมุน 180 องศา [PRD]

### 2.2 Board "Crossroads"
สัญลักษณ์: `.` ปกติ, `F` ป่า (forest), `W` น้ำ (water), `M` ภูเขา (mountain), `D` ทะเลทราย (desert), `L` แสง (light), `K` มืด (dark)

```text
          a  b  c  d  e  f  g
แถว 1:    .  .  F  .  W  .  .
แถว 2:    .  M  .  .  .  D  .
แถว 3:    W  .  M  L  M  .  F
แถว 4:    .  F  .  K  .  F  .
แถว 5:    F  .  M  L  M  .  W
แถว 6:    .  D  .  .  .  M  .
แถว 7:    .  .  W  .  F  .  .
```

ภูเขา 4 ช่องบนแถว 3 และ 5 (c3, e3, c5, e5) เพิ่มใน phase 1.x ticket 09 (D-31) เพราะภูเขาบัง line of sight (§7.2) Shallows ก็ได้ภูเขาเพิ่ม 4 ช่องเป็นคู่ที่หมุน 180° แล้วเหมือนเดิม (d3, d5, b4, f4)

Board ที่ 2 ของ phase 1 คือ Shallows (`data/boards/shallows.json`)

### 2.2.1 Board 9x9 (phase 1.x ticket 15)
Board 9x9 สองอัน คู่กับ 7x7 (ไม่แทน) สมมาตรเมื่อหมุน 180° ทั้งคู่ ใช้สัญลักษณ์เดียวกับ §2.2 start zone ยังเป็น 2 แถวหลังของแต่ละฝั่ง (18 ช่อง) ภูเขา 6–8 ช่องต่อ Board เพราะภูเขาบัง line of sight (§7.2)

**Grand Crossroads** (`grand_crossroads`): ทางแยกใหญ่ แสงสองช่องและมืดกลาง Board (e4, e6, e5)

```text
          a  b  c  d  e  f  g  h  i
แถว 1:    .  .  F  .  W  .  D  .  .
แถว 2:    .  M  .  .  .  .  .  F  .
แถว 3:    W  .  .  M  .  .  .  F  .
แถว 4:    .  .  M  .  L  .  M  .  .
แถว 5:    F  .  D  .  K  .  D  .  F
แถว 6:    .  .  M  .  L  .  M  .  .
แถว 7:    .  F  .  .  .  M  .  .  W
แถว 8:    .  F  .  .  .  .  .  M  .
แถว 9:    .  .  D  .  W  .  F  .  .
```

**Wide Shallows** (`wide_shallows`): แม่น้ำพาดทแยงจากมุมถึงมุมเหมือน Shallows แต่กว้างขึ้น

```text
          a  b  c  d  e  f  g  h  i
แถว 1:    .  .  .  M  .  .  .  .  W
แถว 2:    .  F  .  .  D  .  W  .  .
แถว 3:    .  .  L  .  W  F  .  .  .
แถว 4:    .  M  .  W  .  M  .  .  .
แถว 5:    F  W  .  .  K  .  .  W  F
แถว 6:    .  .  .  M  .  W  .  M  .
แถว 7:    .  .  .  F  W  .  L  .  .
แถว 8:    .  .  W  .  D  .  .  F  .
แถว 9:    W  .  .  .  .  M  .  .  .
```

### 2.3 ระยะ
- ระยะระหว่างสองช่อง = Chebyshev distance: `max(|x1 − x0|, |y1 − y0|)` ช่องทแยงนับเป็น 1 ช่อง ใช้ทั้งการเดินและระยะของ skill [v1, PRD]
- "ติดกัน" (adjacent) = ระยะ 1
- skill ที่มีระยะ R เล็งเป้าที่อยู่ระยะ 1 ถึง R (ไม่รวมช่องตัวเอง) เว้นแต่ skill นั้นระบุว่าเป็น "ตัวเอง" หรือระบุอย่างอื่น
- หมวดระยะใน PRD (ข้อมูลอ้างอิง): Melee 1, Reach 2, Ranged 3–4, Long 5–6

---

## 3. Stat, modifier และค่าที่ได้จากสูตร

### 3.1 Stat และ modifier
- Unit ทุกตัวมี 6 stat: POW, AGI, VIT, INT, SEN, SPI ค่า 1 ถึง 30 [PRD F1]
- modifier (mod) = `floor((stat − 10) / 2)` ปัดลงแบบ floor จริง ค่าติดลบปัดไปทางลบ (stat 9 ได้ −1, stat 1 ได้ −5) ดูตารางใน §21.2 [v1, PRD]

| Stat | ใช้ใน Battle |
|---|---|
| POW | damage กายภาพที่ระยะ 1 |
| AGI | ระยะเดิน, Guard, initiative |
| VIT | HP ของ Monster, save ต้าน Bleed และ Pin |
| INT | damage ธาตุ |
| SEN | attack roll ทุกแบบ, damage กายภาพที่ระยะ 2 ขึ้นไป |
| SPI | Ward, save ต้าน Taunted, Weakened และ Off-balance, heal ของ First Aid |

### 3.2 ค่าที่ได้จากสูตร
engine คำนวณค่าเหล่านี้จาก stat, species, Star และ Level เสมอ ไม่เก็บค่าที่คำนวณแล้วใน data [DL]

| ค่า | สูตร | ที่มา |
|---|---|---|
| HP ของ Monster แบบหนัก | `floor((10 + VIT) × 12 / 10) + 3 × Star` | [PRD, DL, ADR 0002] |
| HP ของ Monster แบบเบา | `floor((10 + VIT) × 8 / 10) + 3 × Star` | [PRD, DL, ADR 0002] |
| HP ของ Tamer | `25 + 4 × (Level − 1)` | [v2, PRD, DL] |
| Guard (ต้านกายภาพ) | `10 + AGI mod + Guard bonus ของ species` (Guard bonus ของ Tidewall = +2, species อื่น = 0) | [v1, v2, PRD; ดู D-06] |
| Ward (ต้านธาตุ) | `10 + SPI mod` | [v1, PRD] |
| Proficiency ของ Monster | `ceil(Star / 2)` คือ Star 1–2 = +1, 3–4 = +2, 5–6 = +3, 7–8 = +4 | [v1, PRD] |
| Proficiency ของ Tamer | Level 1–4 = +2, Level 5–8 = +3, Level 9–10 = +4 | [PRD] |
| Attack bonus | `SEN mod + proficiency` | [v1, PRD] |
| ระยะเดิน (Move) | `3 + trunc(AGI mod / 4) + ปรับตามแบบ` แบบเบา +1, แบบหนัก −1, Tamer 0 แล้วต่ำสุด 2 | [v1, PRD, DL] |
| Save DC ของผู้ใช้ skill | `8 + proficiency ของผู้ใช้ + mod ของ DC stat ของ skill` | [v1, PRD; ดู D-07] |

หมายเหตุ:
- `trunc` = ปัดเข้าหาศูนย์ (ไม่ใช่ floor) เช่น AGI mod −1 ได้ 0 ไม่ใช่ −1 [PRD kit]
- ค่าต่ำสุด 2 ใช้กับระยะเดินพื้นฐานเท่านั้น โบนัสตามสถานการณ์ (Aquatic บนน้ำ §6.3, Command +1 §16) บวกทีหลัง และ Pin ทำให้เดินได้ 0 (§14)
- ระยะเดินมาจากสูตรล้วนไม่มีข้อยกเว้นราย species: **Tidewall เดิน 2 ช่อง** (ตัดข้อยกเว้น "Tidewall เดิน 3" ของ v2 และ Prototype kit ทิ้ง) [DL 2026-10-14]
- species ทุกตัวเป็นแบบเบาหรือแบบหนักอย่างใดอย่างหนึ่ง [PRD F7]
- DC stat ของ skill ใน phase 1 คือ stat หลักของบทบาทเจ้าของ skill: Striker POW, Guardian VIT, Caster INT, Ranger SEN, Tamer SPI (ระบุใน data ราย skill)
- Tamer ไม่มีธาตุ และไม่เป็นทั้งแบบเบาหรือหนัก [v1, PRD]

### 3.3 ประเภทการเคลื่อนที่ของ species
| Movement | กฎ | species ใน phase 1 |
|---|---|---|
| Ground | ปกติ | Fangrel, Quillfox, Tamer |
| Flying | เดินข้าม Unit อื่นได้ (หยุดบน Unit ไม่ได้), ไม่ได้รับ advantage หรือ disadvantage จาก terrain, ข้าม line of sight ได้เฉพาะตอนเป็นผู้โจมตี | Wispling |
| Aquatic | ช่องน้ำนับเป็นธาตุเดียวกับตัวเอง, ระยะเดิน +1 เมื่อเริ่ม Move บนช่องน้ำ | Tidewall |

---

## 4. ธาตุ, element wheel และ terrain

### 4.1 Element wheel [v1, PRD]
- ป่า > น้ำ > ภูเขา > ทะเลทราย > ป่า (forest > water > mountain > desert > forest)
- แสงกับมืดได้เปรียบกันและกัน และเป็นกลางกับ 4 ธาตุธรรมชาติ (การตีความดู D-08)
- ธาตุเดียวกันหรือคู่ที่ไม่อยู่ในความสัมพันธ์ข้างบน = เป็นกลาง

### 4.2 ธาตุของผู้โจมตีกับเป้า
- ใช้กับทุกการโจมตีของ Monster ทั้งกายภาพและธาตุ ตามธาตุของผู้โจมตี [PRD F7]
- ธาตุผู้โจมตีชนะธาตุเป้า: ผู้โจมตีได้ advantage
- ธาตุเป้าชนะธาตุผู้โจมตี: ผู้โจมตีได้ disadvantage
- ถ้าผู้โจมตีหรือเป้าเป็น Tamer ไม่มีผลจากธาตุ [v1]
- แสงโจมตีมืด (หรือกลับกัน): ได้ทั้ง advantage และ disadvantage จึงหักล้างเป็นทอยปกติ [sim; D-08] (phase 1 ไม่มี Monster ธาตุแสงหรือมืด)

### 4.3 Terrain [v1, PRD]
- Monster ที่ยืนบนช่องธาตุเดียวกับตัวเองได้ advantage ในการโจมตีของตัวเอง
- Monster ที่ยืนบนช่องที่ธาตุของช่องชนะธาตุของตัวเองได้ disadvantage ในการโจมตีของตัวเอง
- ช่องปกติไม่มีผล
- terrain มีผลเฉพาะ attack roll ของ Unit ที่ยืนอยู่ (รวม counterattack) ไม่มีผลกับ save หรือการป้องกัน
- ใช้ terrain ของช่องที่ผู้โจมตียืนอยู่ ณ ตอนทอย attack roll
- Tamer และ Flying ไม่ได้รับผลจาก terrain ทั้งสองทาง
- Aquatic: ช่องน้ำนับเป็นธาตุเดียวกับตัวเองเสมอ (Tidewall ธาตุทะเลทรายบนช่องน้ำได้ advantage)
- terrain ของช่องเปลี่ยนชั่วคราวได้ด้วย Attune (§15.4) เมื่อหมดเวลากลับเป็น terrain เดิมของ Board และการเปลี่ยนซ้ำทับกัน อันล่าสุดชนะ [PRD]

---

## 5. Advantage, disadvantage และการซ้อนผล

### 5.1 แหล่งของ advantage และ disadvantage ใน phase 1
| แหล่ง | ผลต่อ attack roll ของผู้โจมตี |
|---|---|
| ธาตุผู้โจมตีชนะธาตุเป้า (§4.2) | advantage |
| ธาตุเป้าชนะธาตุผู้โจมตี (§4.2) | disadvantage |
| terrain ใต้ผู้โจมตีตรงธาตุ (§4.3) | advantage |
| terrain ใต้ผู้โจมตีชนะธาตุของมัน (§4.3) | disadvantage |
| เป้าติด Marked | advantage |
| ผู้โจมตีติด Off-balance | disadvantage |
| Command แบบ advantage (§16) | advantage (ยกเว้นกรณี §5.3) |
| เป้าเป็น Tamer ที่ได้รับการป้องกัน (§9) | disadvantage |
| ระยะจากผู้โจมตีถึงเป้าตั้งแต่ 4 ช่อง (D-31) | disadvantage |

ระยะ 4 ขึ้นไปวัดจากผู้โจมตีถึงเป้าแต่ละตัว (Burst นับทีละเป้า เป้าที่อยู่ขอบพื้นที่ 3x3 อาจไกลถึง 4) ใช้กับ attack roll เท่านั้น skill แบบ save ไม่มี attack roll จึงไม่โดน

### 5.2 กฎการซ้อน [v1, PRD]
- advantage = ทอย d20 2 ลูกเอาค่าสูง, disadvantage = ทอย 2 ลูกเอาค่าต่ำ
- หลายแหล่งไม่ซ้อนกัน: มี advantage อย่างน้อย 1 แหล่งและไม่มี disadvantage = advantage; กลับกัน = disadvantage
- มีทั้ง advantage และ disadvantage อย่างน้อยอย่างละ 1 แหล่ง = ทอยปกติ (หักล้างกันแบบ D&D ไม่ว่าแต่ละฝั่งมีกี่แหล่ง)
- โบนัสตัวเลข (Rallied +1, Guarded +2) บวกซ้อนกันได้ตามปกติ
- คำนวณใหม่ทุกครั้งที่ทอย attack roll แต่ละครั้ง (skill หลายเป้าคิดแยกทุกเป้า)
- advantage และ disadvantage ใช้กับ attack roll เท่านั้น save ใน phase 1 ทอยปกติเสมอ

### 5.3 ข้อยกเว้น: Command กับการป้องกัน Tamer [PRD F3, F5, DL]
**advantage จาก Command หักล้าง disadvantage จากการป้องกัน Tamer ไม่ได้** เมื่อเป้าเป็น Tamer ที่ได้รับการป้องกัน ให้ตัด Command ออกจากรายการแหล่ง advantage ก่อนนำไปหักล้าง แหล่ง advantage อื่น (terrain, Marked) ยังหักล้าง disadvantage นี้ได้ตามปกติ

ข้อนี้แก้ rules v4 ข้อ 5 ซึ่งเขียนว่า Command หักล้างได้ ข้อนั้นถูกยกเลิกหลัง simulation รอบ 4 (variant U4) ตาม decision log 2026-10-14 และ PRD

ตัวอย่าง: Fangrel ที่ได้ Command โจมตี Tamer ที่มี Monster ฝ่ายเดียวกันยืนติด ทอยแบบ disadvantage แต่ถ้า Fangrel ยืนบนช่องป่าด้วย ได้ทอยปกติ (terrain หักล้าง disadvantage)

---

## 6. การเดิน, Flying, Aquatic และการผลัก

### 6.1 Move [v1, PRD]
- ใน activation ของตัวเอง (§17.4) Unit ทำ Move ได้ไม่เกิน 1 ครั้ง ก่อนหรือหลัง Action ก็ได้ แต่แบ่ง Move เป็นสองช่วงไม่ได้
- Move = เดินเป็นลำดับก้าวไปยังช่องที่ติดกัน (8 ทิศ) ไม่เกินระยะเดิน ทุกช่องใช้ 1 ก้าวเท่ากัน
- ช่องที่มี Unit อื่น (ฝั่งใดก็ได้) เข้าไม่ได้และหยุดไม่ได้ ยกเว้น Flying ผ่านได้แต่หยุดไม่ได้
- ช่องปลายทางต้องว่างและอยู่บน Board ไม่ขยับเลยก็ได้
- ไม่มี opportunity attack ออกจากระยะประชิดได้ฟรี [v2]
- ระยะเดินใน Move ครั้งนั้น = ระยะเดินจากสูตร (§3.2) + Aquatic +1 (ถ้าเข้าเงื่อนไข) + Command +1 (ถ้าได้รับ) แต่ถ้าติด Pin = 0

### 6.2 Flying [v1, v2, PRD]
- เดินผ่านช่องที่มี Unit ได้ แต่หยุดบนช่องนั้นไม่ได้
- ไม่ได้รับผลจาก terrain (§4.3)
- ข้าม line of sight ได้เฉพาะเมื่อเป็นผู้โจมตี เป้าที่เป็น Flying ยังถูกบังได้ตามปกติ (§7)

### 6.3 Aquatic [v1, PRD]
- ช่องน้ำนับเป็นธาตุเดียวกับตัวเอง (§4.3)
- ถ้าเริ่ม Move บนช่องน้ำ ระยะเดินของ Move นั้น +1 (ไม่ได้นับต่อช่องน้ำที่เดินผ่าน; ดู D-17)

### 6.4 การผลัก (Shield Bash) [v3, v4, ruling round 3]
- ทิศการผลัก = `(sign(x_เป้า − x_ผู้ใช้), sign(y_เป้า − y_ผู้ใช้))` คือ "ออกห่างจากผู้ใช้ตรงๆ" ถ้าเป้าอยู่ติดแนวทแยง ผลักแนวทแยง
- ช่องปลายทาง = ช่องของเป้า + ทิศการผลัก 1 ช่อง ถ้าอยู่นอก Board หรือมี Unit อยู่ ไม่ผลัก และไม่มีผลอื่นแทน
- การผลักไม่ใช่ Move ของเป้า: ไม่ใช้ Move ของเป้า, Unit ที่ติด Pin ยังถูกผลักได้, Flying และ Aquatic ไม่มีผล
- หลังผลักตรวจ Hidden ของเป้าทันที (§8.2)
- ใน phase 1 แบบหนักไม่มีกฎต้านการผลัก (ดู D-15)
- ลำดับเมื่อ Shield Bash โดน: damage → Counter ของเป้า (ถ้ามี) → ผลัก ถ้าหลัง Counter ผู้ใช้หรือเป้าล้มแล้ว ไม่ผลัก (§10.5)

---

## 7. Line of sight

### 7.1 เมื่อไรต้องตรวจ [v1, v2, v3, PRD]
- ใช้กับทุก attack และทุก skill ที่เล็งศัตรูจากระยะ 2 ขึ้นไป รวม skill แบบ save (Taunt, Hex, Distract) และ Mark
- Burst ตรวจ line of sight จากผู้ใช้ไปช่องกลางของพื้นที่ (เมื่อช่องกลางอยู่ระยะ 2 ขึ้นไป) ไม่ตรวจรายเป้า
- ที่ระยะ 1 ไม่ตรวจ
- skill ที่เล็งพวกเดียวกันหรือตัวเองไม่ตรวจ (ใน phase 1 skill เหล่านี้มีระยะไม่เกิน 1 อยู่แล้ว)
- ผู้โจมตีที่เป็น Flying ไม่ต้องตรวจ

### 7.2 สิ่งที่บัง
- Unit ทุกตัว (ทั้งพวกเดียวกันและศัตรู) ที่ยืนบนช่องที่เส้นผ่าน โดยไม่นับช่องของผู้ใช้และช่องของเป้า
- terrain ภูเขา (mountain) บัง: ช่องภูเขาที่เส้นผ่าน (ไม่นับช่องของผู้ใช้และช่องของเป้า) บังเหมือน Unit ผู้ใช้ที่ยืนบนภูเขาและเป้าที่ยืนบนภูเขาจึงไม่ถูกบังด้วยช่องของตัวเอง terrain อื่นไม่บัง [D-31] ผู้โจมตีที่ Flying มองข้ามทั้ง Unit และภูเขา (§7.1) ข้อความปฏิเสธเป็น `no-line-of-sight` โดยไม่มี Unit ที่บัง

### 7.3 อัลกอริทึมเส้น (ต้องตรงกับ sim.py และ docs/playtest/board.py)
ใช้ Bresenham แบบ integer ล้วน คำนวณ **จากช่องของผู้ใช้ (start) ไปช่องของเป้า (end)** เสมอ เส้นนี้ไม่สมมาตร ผลของ A → B อาจต่างจาก B → A (ดู D-01)

ให้ start = (x0, y0), end = (x1, y1) ตามพิกัดใน §2.1

1. `dx = |x1 − x0|`, `dy = −|y1 − y0|`
2. `sx = +1` ถ้า `x0 < x1` ไม่อย่างนั้น `−1`; `sy = +1` ถ้า `y0 < y1` ไม่อย่างนั้น `−1`
3. `err = dx + dy`, ตำแหน่งปัจจุบัน `(x, y) = (x0, y0)`, รายการช่องว่างเปล่า
4. ทำซ้ำตราบที่ `(x, y) ≠ (x1, y1)`:
   1. `e2 = 2 × err` (คำนวณครั้งเดียวก่อนเงื่อนไขทั้งสอง)
   2. ถ้า `e2 ≥ dy`: `err = err + dy` และ `x = x + sx`
   3. ถ้า `e2 ≤ dx`: `err = err + dx` และ `y = y + sy`
   4. เพิ่ม `(x, y)` ลงรายการ
5. ช่องที่เส้นผ่าน = รายการทั้งหมดยกเว้นตัวสุดท้าย (ซึ่งคือช่องของเป้า) ช่องเริ่มต้นไม่อยู่ในรายการตั้งแต่แรก
6. line of sight ถูกบังถ้ามี Unit อยู่บนช่องใดในข้อ 5

ค่าทดสอบ (ใช้ใน test ของ engine):

| จาก → ถึง | ช่องที่เส้นผ่าน |
|---|---|
| a1 → c2 | b2 |
| c2 → a1 | b1 |
| a1 → e2 | b1, c2, d2 |
| e2 → a1 | d2, c1, b1 |
| a1 → b4 | a2, b3 |
| a1 → c5 | b2, b3, c4 |
| c5 → a1 | b4, b3, a2 |
| d1 → d7 | d2, d3, d4, d5, d6 |
| a1 → g7 | b2, c3, d4, e5, f6 |
| c7 → g6 | d7, e6, f6 |
| g6 → c7 | f6, e7, d7 |
| b2 → f5 | c3, d4, e4 |
| f5 → b2 | e4, d3, c3 |

---

## 8. การเล็งเป้าและ Hidden

### 8.1 เงื่อนไขการเล็งศัตรู
skill ที่เล็งศัตรู 1 ตัวเล็งได้เมื่อครบทุกข้อ:
1. เป้าอยู่ระยะ 1 ถึงระยะของ skill (§2.3)
2. ถ้าระยะ 2 ขึ้นไป: เป้าไม่ติด Hidden (§8.2)
3. ถ้าระยะ 2 ขึ้นไป: line of sight ไม่ถูกบัง หรือผู้ใช้เป็น Flying (§7)
4. ผู้ใช้ติด Taunted ต้องเลือกตาม §14.3

Tamer ที่ได้รับการป้องกันยังถูกเล็งได้ทุกระยะ (กฎ v2 ที่ห้ามเล็งจากระยะ 2 ขึ้นไปถูกแทนที่แล้ว) [v3]

### 8.2 Hidden [v1, PRD]
- ศัตรูเล็ง Unit ที่ติด Hidden จากระยะ 2 ขึ้นไปไม่ได้ ทั้ง attack, skill แบบ save และ Mark
- Burst ไม่โดน Unit ที่ติด Hidden ถ้า Unit นั้นอยู่ห่างจากผู้ใช้ Burst 2 ช่องขึ้นไป (วัดจากผู้ใช้ ไม่ใช่จากช่องกลาง) [sim]
- ที่ระยะ 1 เล็ง Unit ที่ Hidden ได้ตามปกติ
- Hidden หลุดเมื่อ:
  - Unit นั้นทอย attack roll ใดๆ (รวม Mark และ counterattack) หลุดหลัง attack roll นั้น resolve [sim]
  - Unit นั้นอยู่บนช่องที่ไม่ใช่ป่า: ตรวจทันทีหลัง Move (ตรวจช่องปลายทาง), หลังถูกผลัก, หลัง Attune เปลี่ยนช่อง และตอนจบทุก Turn [sim; ดู D-18]
- การใช้ skill แบบ save ไม่ทำให้ Hidden หลุด (phase 1 Unit ที่ Hidden ได้คือ Quillfox ซึ่งไม่มี skill แบบ save)

---

## 9. การป้องกัน Tamer [v3, PRD F5, DL]

- Tamer "ได้รับการป้องกัน" เมื่อมี Monster ฝ่ายเดียวกันที่ยังไม่ล้มอย่างน้อย 1 ตัวยืนติดกับ Tamer (ระยะ 1)
- ทุก attack roll ของศัตรูที่เล็ง Tamer ที่ได้รับการป้องกันได้ disadvantage ทุกระยะ รวม Burst, Mark และ counterattack
- ตรวจ ณ ตอนทอย attack roll แต่ละครั้ง
- เป็นแหล่ง disadvantage ปกติ หักล้างกับแหล่ง advantage อื่นได้ **ยกเว้น advantage จาก Command ซึ่งหักล้างไม่ได้** (§5.3)
- skill แบบ save (Taunt, Hex, Distract) ไม่ใช่ attack roll จึงไม่ได้รับผล

---

## 10. การโจมตีและ damage

### 10.1 ประเภท
| ประเภท | attack roll เทียบกับ | damage |
|---|---|---|
| กายภาพ (physical) | Guard ของเป้า | dice + POW mod ถ้าระยะ ณ ตอนโจมตี = 1, dice + SEN mod ถ้าระยะ 2 ขึ้นไป |
| ธาตุ (elemental) | Ward ของเป้า | dice + INT mod |

[v1, v4, PRD, DL]

### 10.2 Attack roll [v1, PRD]
- ผลรวม = d20 (ตาม advantage/disadvantage §5) + attack bonus (§3.2) + โบนัสตัวเลข (Rallied +1)
- ค่าป้องกันของเป้า = Guard หรือ Ward + โบนัสจาก Guarded (§14)
- โดนเมื่อผลรวม ≥ ค่าป้องกัน
- d20 ที่ใช้ (ลูกที่เก็บไว้เมื่อมี advantage/disadvantage) ได้ 20 = **critical** และโดนเสมอ [v2]
- d20 ที่ใช้ได้ 1 = พลาดเสมอ

### 10.3 Damage [v1, v2, PRD]
1. ทอย dice ของ skill ถ้า critical ทอยจำนวนลูก 2 เท่า (เช่น 2d8 เป็น 4d8) modifier บวกครั้งเดียว
2. บวก damage mod ตาม §10.1
3. ถ้าผู้โจมตีติด Weakened ลบ 3 [ticket 19]
4. damage ขั้นต่ำ 1 เมื่อโจมตีโดน (สำหรับ skill ที่ทำ damage)
5. ลด HP ของเป้า (หรือของ Tamer ถ้าเป้าได้ Cover §15.4)

- Mark ไม่ทำ damage จึงไม่ทอย dice damage
- damage ที่เกิน HP ที่เหลือยังนับเต็มจำนวนใน damage รวมของฝั่ง (§19.2; ดู D-11)
- Tamer: Basic Attack ใช้ 1d6 [v2, PRD] Tamer ไม่มีธาตุและไม่ได้รับผล terrain

### 10.4 Unit ล้ม [v2]
- HP ≤ 0 = ล้ม ตั้ง HP เป็น 0 และเอา Unit ออกจาก Board ทันที ช่องนั้นว่าง status และผลทุกอย่างของ Unit นั้นหายไป
- ตรวจเงื่อนไขชนะทันที (§19.1) ถ้า Battle จบ ผลที่เหลือของ action นั้นไม่ทำต่อ

### 10.5 ลำดับ resolve ของการโจมตี 1 ครั้งต่อ 1 เป้า
1. ตรวจเงื่อนไขการเล็ง (§8.1) แล้วคำนวณ advantage/disadvantage (§5)
2. ทอย attack roll (§10.2) ถ้าพลาด ผู้โจมตีอาจใช้ Inspiration ทอยใหม่ (§18, D-29)
3. ถ้าโดนและ skill ทำ damage: ทอย damage (§10.3) และลด HP
4. ถ้าโดน เป้ายังไม่ล้ม และ skill ให้ status:
   - ไม่มี save (Mark): ติด status
   - มี save (Rend, Pin): เป้าทอย save (§11) ถ้า save ไม่ผ่าน ฝั่งเป้าอาจใช้ Inspiration (§18, D-29) ถ้ายังไม่ผ่านจึงติด status
5. ผู้โจมตีเสีย Off-balance (ถ้ามี), เสีย Hidden (ถ้ามี) และผล Command แบบ advantage ถูกใช้ไป (§16.3) ไม่ว่าโดนหรือพลาด
6. ถ้าเป้าติด Countering, การโจมตีนี้ไม่ใช่ counterattack, ผู้โจมตีอยู่ระยะ 1 จากเป้า และทั้งสองยังไม่ล้ม: เป้าทำ counterattack ทันที (§14 Countering) แล้ว Countering หลุด
7. Shield Bash: ถ้าโดน และผู้ใช้กับเป้ายังไม่ล้ม: ผลัก (§6.4)
8. Hit and Run: ทำขั้นถอยฟรีได้ (§15.1)

---

## 11. Save [v1, PRD]

- ผู้ถูกเล็งทอย d20 + mod ของ stat ที่ใช้ save เทียบกับ Save DC ของผู้ใช้ (§3.2)
- ผลรวม ≥ DC = ต้านได้ ไม่ติด status; ต่ำกว่า DC = ติด status
- save ไม่มี critical และไม่มีกฎ 1 ไม่ผ่านเสมอหรือ 20 ผ่านเสมอ ใช้ผลรวมเทียบ DC อย่างเดียว [sim; ดู D-27]
- ใน phase 1 save ทอยปกติเสมอ (แหล่ง advantage ของ save คือ Blessed ซึ่งอยู่นอกขอบเขต)
- ฝั่งผู้ถูกเล็งเป็นเจ้าของ d20 ของ save จึงเป็นฝั่งที่ใช้ Inspiration กับ save ที่ไม่ผ่านได้ [v2, D-29]

| Save stat | status |
|---|---|
| VIT | Bleed, Pin |
| SPI | Taunted, Weakened, Off-balance |

---

## 12. Action ป้องกัน (Defend) [v1, v3, PRD, DL]

- Unit ทุกตัวใช้ Defend เป็น Action ได้ ไม่มี cooldown
- ได้ Guarded: Guard และ Ward +2 จนถึงเริ่ม Turn ถัดไปของฝั่งตัวเอง (ลดจาก +4 ใน v1)
- Guarded จากหลายแหล่งไม่ซ้อน เก็บโบนัสที่สูงกว่า [v2] (phase 1 มีแหล่งเดียวคือ Defend)

---

## 13. Skill tier และ cooldown

### 13.1 Tier [v1, PRD, DL]
| Tier | Cooldown |
|---|---|
| Minor | ไม่มี ใช้ได้ทุก Turn |
| Major | 2 |
| Signature | 1 ครั้งต่อ Battle (phase 1 ไม่มีใน loadout) |
| Passive | ทำงานตลอด ไม่ใช้ Action นับเป็น 1 ช่อง skill |

- Unit ทุกตัวมี Basic Attack (Minor) และ Defend เพิ่มจาก skill ใน loadout [v1]
- basic skill ของ Tamer ใช้ tier แบบเดียวกัน [PRD]

### 13.2 การนับ cooldown ของ Major [v1; ดู D-16]
- นับตาม Turn ของฝั่งเจ้าของ skill (Turn ที่ 1, 2, 3 ... ของฝั่งนั้น §17.3)
- ใช้ใน Turn ที่ N ของฝั่งตัวเอง ใช้ได้อีกครั้งตั้งแต่ Turn ที่ N + 2 ของฝั่งตัวเอง (ใช้ Turn 1 ใช้อีกได้ Turn 3)
- ค่า cooldown ที่ UI แสดง = Turn ที่ใช้ได้อีก − Turn ปัจจุบันของฝั่ง (ต่ำสุด 0) หลังใช้ใน Turn N จึงแสดง 2 และเหลือ 1 ใน Turn N + 1

---

## 14. Status

### 14.1 กฎทั่วไป [v1, PRD]
- status เดียวกันไม่ซ้อน ติดซ้ำ = รีเซ็ตระยะเวลาเป็นค่าเต็ม (และค่าต้นทาง เช่นผู้ taunt เป็นผู้ใช้คนล่าสุด)
- status ที่มีระยะเวลาเป็นตัวเลข นับเมื่อ **จบ Turn ของฝั่งที่ติด status**: ทุกครั้งที่ฝั่งนั้นจบ Turn ลดระยะเวลา 1 เหลือ 0 = หลุด
- ถ้า status ถูกติดระหว่าง Turn ของฝั่งที่ติดเอง การจบ Turn นั้นไม่นับ (ข้ามการลดครั้งแรก 1 ครั้ง) ผลคือ "ระยะเวลา N" = ส่วนที่เหลือของ Turn ปัจจุบัน + N Turn ถัดไปของฝั่งที่ติด เสมอ [sim; ดู D-02]
- ข้อยกเว้น: **Marked นับตามฝั่งที่ Mark** (ฝั่งของ Unit ที่ทำให้ติด) ไม่ใช่ฝั่งที่ติด ทุกครั้งที่ฝั่งที่ Mark จบ Turn ลด 1 และการจบ Turn ที่ Mark นั้นเองไม่นับ (แบบ D-02) ผลคือ Marked 1 ที่ติดใน Turn ของฝั่ง X มีผลกับผู้โจมตีทุกตัว ตลอดส่วนที่เหลือของ Turn นั้น, Turn ของอีกฝั่ง และ Turn ถัดไปของฝั่ง X แล้วหลุดตอนจบ Turn นั้น ติดซ้ำ = รีเซ็ต ไม่ซ้อน [ticket 18; ดู D-03, DL 2026-10-16]
- status ที่อยู่ "จนถึง Turn ถัดไปของตัวเอง" (Guarded, Countering และผลของ Cover) หลุดตอน **เริ่ม** Turn ถัดไปของฝั่งเจ้าของ ก่อน Bleed tick [v1, sim]
- status ที่ไม่มีระยะเวลา (Off-balance, Hidden) หลุดตามเงื่อนไขของตัวเองเท่านั้น
- Unit ที่ล้มเสีย status ทั้งหมด
- status ที่ต้องโจมตีโดนก่อน (Marked) หรือมี save (Bleed, Pin) จะติดเฉพาะเมื่อเป้ายังไม่ล้มหลัง damage

### 14.2 ตาราง status ของ phase 1
| Status | ประเภท | ผล | ระยะเวลา | Save | มาจาก |
|---|---|---|---|---|---|
| Bleed | ลบ | เสีย HP 1d4 ตอนเริ่ม Turn ของฝั่งที่ติด (§17.4) | 3 | VIT | Rend |
| Pin | ลบ | ระยะเดิน = 0 (รวมขั้นถอยของ Hit and Run) แต่ยังใช้ Action ได้ และยังถูกผลักได้ | 1 | VIT | Pin |
| Taunted | ลบ | บังคับเป้าการโจมตีและการเดิน ดู §14.3 | 1 | SPI | Taunt |
| Weakened | ลบ | damage ทุกครั้งที่ Unit นี้ทำ −3 (รวม counterattack, ขั้นต่ำ 1; เดิม −2, ticket 19) | 2 | SPI | Hex |
| Marked | ลบ | ผู้โจมตีทุกตัวได้ advantage เมื่อโจมตี Unit นี้ | 1 (นับตามฝั่งที่ Mark, §14.1) | ไม่มี (ติดเมื่อ Mark โดน) | Mark |
| Off-balance | ลบ | attack roll ครั้งถัดไปของ Unit นี้ได้ disadvantage หลุดหลัง attack roll นั้น (ข้าม Turn ได้) | จนถึง attack roll ครั้งถัดไป | SPI | Distract |
| Hidden | บวก | ดู §8.2 | จนกว่าจะหลุด | ไม่มี | Camouflage |
| Guarded | บวก | Guard และ Ward + ตามแหล่ง (Defend +2) ไม่ซ้อน เก็บค่าสูงกว่า | จนถึงเริ่ม Turn ถัดไปของตัวเอง | ไม่มี | Defend |
| Countering | บวก | ดูด้านล่าง | จนถึงเริ่ม Turn ถัดไปของตัวเอง หรือจน counterattack 1 ครั้ง | ไม่มี | Counter |
| Rallied | บวก | attack roll +1 | 2 | ไม่มี | Pack Howl |

**Countering** [v1, v2, PRD, sim]:
- เมื่อถูกศัตรูโจมตี (ทอย attack roll ใส่ ไม่ว่าโดนหรือพลาด) จากระยะ 1 และทั้งคู่ยังไม่ล้มหลังการโจมตีนั้น ทำ counterattack 1 ครั้งใส่ผู้โจมตีทันที แล้ว Countering หลุด
- counterattack เป็น attack roll กายภาพปกติ: d20 + attack bonus เทียบ Guard ของผู้โจมตี ใช้ advantage/disadvantage ตามปกติ (รวม terrain, ธาตุ, การป้องกัน Tamer) critical และ 1 พลาดได้ตามปกติ damage 1d8 + POW mod (2d8 ถ้ามี Pincer Guard)
- Burst ที่ผู้ใช้อยู่ระยะ 1 จากเป้าทำให้เป้านั้น counter ได้ Mark ที่ระยะ 1 ก็เช่นกัน skill แบบ save ไม่ใช่การโจมตีจึงไม่ทำให้ counter
- counterattack ไม่ทำให้เกิด counter ต่อ [v2]
- counterattack ไม่ใช้ Action และไม่มีผลของ Command

**ผลจริงของระยะเวลาใน phase 1** (ตาม §14.1):
| Status | ติดเมื่อไร | มีผลถึง |
|---|---|---|
| Bleed 3 | Turn ของศัตรู | tick ตอนเริ่ม 3 Turn ถัดไปของฝั่งที่ติด หลุดตอนจบ Turn ที่ 3 นั้น |
| Pin 1 | Turn ของศัตรู | เดินไม่ได้ทั้ง Turn ถัดไปของฝั่งที่ติด หลุดตอนจบ Turn นั้น |
| Taunted 1 | Turn ของศัตรู | Turn ถัดไปของฝั่งที่ติด |
| Weakened 2 | Turn ของศัตรู | ส่วนที่เหลือของ Turn นั้น (มีผลกับ counterattack) + 2 Turn ถัดไปของฝั่งที่ติด |
| Marked 1 | Turn ของศัตรู (ฝั่งที่ Mark) | ส่วนที่เหลือของ Turn ที่ถูก Mark + Turn ของฝั่งที่ติด + Turn ถัดไปของฝั่งที่ Mark หลุดตอนจบ Turn นั้น (ดู D-03) |
| Rallied 2 | Turn ของตัวเอง | ส่วนที่เหลือของ Turn นั้น + 2 Turn ถัดไปของฝั่งตัวเอง |

### 14.3 Taunted [v1, v2, sim; ดู D-05]
ใน activation ของ Unit ที่ติด Taunted (ผู้ taunt = Unit ที่ใช้ Taunt ครั้งล่าสุด):
1. ถ้ามีทางโจมตีผู้ taunt ได้ใน activation นี้ (โจมตีจากช่องเดิม หรือ Move/Blink แล้วโจมตี ด้วย skill โจมตีใดก็ได้ที่พร้อมใช้ โดยผ่านเงื่อนไข §8.1) Action ของ Unit นี้ต้องเป็นการโจมตีผู้ taunt (Burst นับเมื่อผู้ taunt อยู่ในเป้าที่เลือก)
2. ถ้าไม่มีทาง Unit นี้ต้อง Move ไปยังช่องที่ระยะถึงผู้ taunt น้อยที่สุดในบรรดาช่องที่ไปได้ (รวมการอยู่กับที่ถ้าเป็นระยะที่น้อยที่สุด) และใช้ได้เฉพาะ Action ที่ไม่ใช่การโจมตี
3. ถ้าผู้ taunt ล้มแล้ว Taunted ไม่มีผล (ข้อบังคับมีผลกับ Move และ Action เท่านั้น Camouflage ซึ่งไม่ใช้ทั้งสองอย่างจึงใช้ได้ตามปกติ ดู D-28)
4. ข้อบังคับมีผลกับ Unit ที่ติด Taunted ตัวนั้นเท่านั้น: ถ้า Unit นั้นใช้ Action Action ต้องเป็นไปตามข้อ 1 หรือ 2 และข้ามการโจมตีผู้ taunt ไปทำ Action อื่นไม่ได้ ส่วนฝั่งนั้นยังจบ Turn ได้ตามปกติ และ Unit อื่นไม่ถูกบังคับ (D-05 ตัดสิน 2026-10-15)

---

## 15. Skill ใน loadout ของ phase 1

### 15.1 Skill ของ Monster
"ระยะ" ตาม §2.3 "ทอย" กายภาพหรือธาตุตาม §10 ทุก skill ที่เล็งศัตรูใช้ §8.1

| Skill | ของ | Tier | ระยะ | ทอย | ผล |
|---|---|---|---|---|---|
| Basic Attack | ทุก Unit | Minor | 1 | กายภาพ | 1d8 (Tamer 1d6) |
| Defend | ทุก Unit | Minor | ตัวเอง | ไม่ทอย | Guarded +2 (§12) |
| Heavy Blow | Fangrel (Striker) | Major | 1 | กายภาพ | 2d8 |
| Rend | Fangrel (Striker) | Major | 1 | กายภาพ | 1d6 + Bleed (save VIT) |
| Hit and Run | Fangrel | Minor | 1 | กายภาพ | 1d8 แล้วถอยฟรี 1 ช่อง |
| Pack Howl | Fangrel | Major | ตัวเองและพวกในระยะ 1 | ไม่ทอย | Rallied 2 |
| Taunt | Tidewall (Guardian) | Major | 3 | save SPI | Taunted 1 |
| Shield Bash | Tidewall (Guardian) | Minor | 1 | กายภาพ | 2d6 และผลักเป้า 1 ช่องเมื่อโดน |
| Counter | Tidewall (Guardian) | Minor | ตัวเอง | ไม่ทอย | Countering |
| Pincer Guard | Tidewall | Passive | - | - | counterattack ใช้ 2d8 แทน 1d8 |
| Element Bolt | Wispling (Caster) | Minor | 3 | ธาตุ | 1d8 |
| Burst | Wispling (Caster) | Major | 3 (ช่องกลางของพื้นที่ 3x3) | ธาตุ ทอยแยกทุกเป้า | 1d6 ศัตรูสูงสุด 2 ตัวที่ผู้ใช้เลือก ไม่โดนพวกเดียวกัน |
| Hex | Wispling (Caster) | Major | 3 | save SPI | Weakened 2 |
| Blink | Wispling | Minor | 2 | ไม่ทอย | ใช้แทน Move: เทเลพอร์ต ไม่ใช้ Action |
| Long Shot | Quillfox (Ranger) | Minor | 3 | กายภาพ | 1d8 |
| Pin | Quillfox (Ranger) | Major | 3 | กายภาพ | 1d6 + Pin (save VIT) |
| Mark | Quillfox (Ranger) | Minor | 4 | กายภาพ (ไม่มี damage) | Marked 1 เมื่อโดน |
| Camouflage | Quillfox | Minor | ตัวเอง | ไม่ทอย | Hidden ขณะยืนในช่องป่า ไม่ใช้ Action และ Move (1 ครั้งต่อ activation) |

รายละเอียดและ ruling ราย skill:
- **Basic Attack**: Monster 1d8, Tamer 1d6 [v2] damage mod ตาม §10.1
- **Heavy Blow**: ไม่มีผลเพิ่ม
- **Rend**: Bleed ติดตาม §10.5 ข้อ 4 ติดซ้ำรีเซ็ตเป็น 3
- **Hit and Run** [v1, PRD, sim; ดู D-12]: หลังการโจมตี resolve ครบ (รวม counterattack) ถ้า Battle ยังไม่จบ ผู้ใช้ยังไม่ล้มและไม่ติด Pin ผู้ใช้เลือกขยับไปช่องว่างที่ติดกัน 1 ช่องได้ (ไม่บังคับ) ทั้งตอนโจมตีโดนและพลาด ขั้นนี้ไม่ใช่ Move จึงไม่นับเป็นการใช้ Move และไม่แบ่ง Move ถ้ายังไม่ได้ใช้ Move ใช้ต่อได้ หลังขยับตรวจ Hidden
- **Pack Howl**: ผู้ใช้และ Unit ฝ่ายเดียวกันทุกตัวที่อยู่ระยะ 1 (รวม Tamer) ได้ Rallied 2 [v1, sim; ดู D-19]
- **Taunt**: ใช้ §8.1 (line of sight และ Hidden) ผู้ taunt = ผู้ใช้ ดู §14.3
- **Shield Bash**: 2d6 + POW mod, Minor [v3, v4, PRD, DL] ผลักตาม §6.4 ruling round 3: ผลักแนวทแยงเมื่อเป้าอยู่ติดแนวทแยง, Counter ที่เกิดจาก Shield Bash resolve ก่อนผลัก, Unit ที่ติด Pin ยังถูกผลักได้ [v4]
- **Counter**: Minor [v2, DL] ได้ Countering (§14.2)
- **Pincer Guard**: Passive เปลี่ยน dice ของ counterattack เป็น 2d8
- **Element Bolt**: 1d8 + INT mod ใช้ธาตุของผู้ใช้ตาม §4.2
- **Burst** [v1, v2, v4, PRD, DL, sim; ดู D-14]:
  - เลือกช่องกลางที่อยู่ระยะ 0 ถึง 3 จากผู้ใช้ ถ้าช่องกลางอยู่ระยะ 2 ขึ้นไปและผู้ใช้ไม่ใช่ Flying ต้องมี line of sight ไปช่องกลาง (§7.3 ใช้ช่องกลางเป็น end)
  - พื้นที่ = ช่องกลางและ 8 ช่องรอบ (ช่องที่อยู่ระยะ ≤ 1 จากช่องกลาง)
  - เป้าที่เลือกได้ = ศัตรูในพื้นที่ ยกเว้นที่ติด Hidden และอยู่ห่างผู้ใช้ 2 ช่องขึ้นไป ไม่โดนพวกเดียวกัน
  - ผู้ใช้เลือกเป้า 1 หรือ 2 ตัวตามลำดับ แต่ละเป้าทำการโจมตีแยกตาม §10.5 ตามลำดับที่เลือก (advantage, การป้องกัน Tamer และ Counter คิดแยกรายเป้า)
  - ถ้าผู้ใช้ล้มระหว่างทาง (จาก counterattack) เป้าที่เหลือไม่ถูกโจมตี
  - ต้องมีเป้าอย่างน้อย 1 ตัวจึงใช้ได้
- **Hex**: Weakened 2 ใช้ §8.1
- **Blink** [v1, PRD, sim; ดู D-13]: ใช้แทน Move ของ activation นั้น (ใช้แล้ว Move ไม่ได้ และถ้าใช้ Move แล้ว Blink ไม่ได้) ไม่ใช้ Action เทเลพอร์ตไปช่องว่างใดก็ได้ที่ระยะ 1 ถึง 2 จากช่องเดิม ไม่สนใจ Unit ที่ขวาง ระยะ Blink คงที่ 2 ไม่ได้รับ +1 จาก Command หรือ Aquatic ใช้ได้แม้ติด Pin
- **Long Shot**: 1d8 + SEN mod ที่ระยะ 2 ขึ้นไป (POW mod ถ้าใช้ที่ระยะ 1) ระยะ 3 [v2, v4, DL; เดิม 4, D-31]
- **Pin**: 1d6 + damage mod ตามระยะ แล้ว Pin ตาม §10.5 ข้อ 4
- **Mark** [v1, sim; ดู D-22]: เป็น attack roll กายภาพเทียบ Guard ไม่ทำ damage โดนแล้วเป้าติด Marked 1 เพราะเป็น attack roll จึงทำให้ Hidden ของผู้ใช้หลุด, ใช้ Off-balance และผล Command, ทำให้เป้าที่ Countering ในระยะ 1 counter ได้ และได้ disadvantage จากการป้องกัน Tamer
- **Camouflage** [v1, PRD; เปลี่ยน 2026-10-16 ticket 27, ดู D-18 และ D-28]: skill ฟรี ไม่ใช้ Action และไม่ใช้ Move Unit ใช้ได้ไม่เกิน 1 ครั้งต่อ activation ณ จุดใดก็ได้ใน activation (ก่อนหรือหลัง Move, ก่อนหรือหลัง Action, หลังขั้นถอยของ Hit and Run) ขณะยืนบนช่องป่า ได้ Hidden (§8.2) กติกาอื่นของ Camouflage และ Hidden คงเดิม: ใช้ได้เฉพาะบนช่องป่า, Hidden หลุดเมื่อ Unit ทอย attack roll ใดๆ หรืออยู่บนช่องที่ไม่ใช่ป่า และตรวจตอนจบทุก Turn เพราะ attack roll ทำให้ Hidden หลุด ลำดับที่คุ้มคือทำ Action (Long Shot, Pin หรือ Mark) ก่อนแล้วจึง Camouflage

### 15.2 Basic skill ของ Tamer [v1, v2, PRD]
| Skill | Tier | ระยะ | ทอย | ผล |
|---|---|---|---|---|
| Cover | Major | Monster ฝ่ายเดียวกันที่ติดกัน 1 ตัว | ไม่ทอย | damage ที่ Monster ตัวนั้นได้รับโอนมาที่ Tamer จนถึงเริ่ม Turn ถัดไปของฝั่ง Tamer |
| Attune | Major | ช่องที่ติดกับ Tamer 1 ช่อง | ไม่ทอย | ช่องเปลี่ยนเป็นธาตุที่เลือก 3 Turn |
| First Aid | Major | 1 (รวมตัวเอง) | ไม่ทอย | heal 1d8 + SPI mod ไม่เกิน HP สูงสุด |
| Distract | Minor | 3 | save SPI | Off-balance |

### 15.3 Command
ดู §16 (Command ไม่ใช่ skill และไม่ใช้ Action)

### 15.4 รายละเอียด basic skill ของ Tamer
- **Cover** [v1, PRD, sim; ดู D-21]:
  - เป้า = Monster ฝ่ายเดียวกันที่ยังไม่ล้มและอยู่ระยะ 1 จาก Tamer ตอนใช้
  - จนถึงเริ่ม Turn ถัดไปของฝั่ง Tamer damage ทุกแหล่งที่ Monster ตัวนั้นจะได้รับ (คำนวณตาม §10.3 ครบแล้ว) ลด HP ของ Tamer แทน ไม่ต้องติดกันตลอดเวลา
  - attack roll ยังเทียบ Guard/Ward ของ Monster ตัวนั้น ผลที่ไม่ใช่ damage (status, การผลัก, Counter) ยังเกิดกับ Monster ตัวนั้น
  - damage ที่โอนนับเป็น damage รวมของฝั่งผู้โจมตีตามปกติ ถ้าทำให้ Tamer ล้ม = แพ้ (§19.1)
  - ใช้ซ้ำกับเป้าเดิมรีเซ็ตเวลา
- **Attune** [v1, PRD, sim; ดู D-20]:
  - เป้า = ช่องใดก็ได้ที่อยู่ระยะ 1 จาก Tamer (ว่างหรือมี Unit ก็ได้)
  - เลือกธาตุ 1 ใน 6 (ป่า, น้ำ, ภูเขา, ทะเลทราย, แสง, มืด)
  - ระยะเวลา 3 นับแบบ status (§14.1) ตามการจบ Turn ของฝั่ง Tamer ผู้ใช้ และข้ามการจบ Turn ที่ใช้ ผลคือมีผลถึงจบ Turn ที่ 3 ถัดไปของฝั่งนั้น แล้วกลับเป็น terrain เดิมของ Board
  - ถ้าช่องถูก Attune ซ้ำ (ฝั่งใดก็ได้) อันล่าสุดแทนที่ทั้งธาตุ ระยะเวลา และฝั่งที่นับ
  - หลังเปลี่ยนช่องตรวจ Hidden ทันที (§8.2)
- **First Aid** [v1, v2, PT]: เป้า = Unit ฝ่ายเดียวกันที่ยังไม่ล้มในระยะ 1 หรือตัว Tamer เอง heal = max(0, 1d8 + SPI mod) ไม่เกิน HP สูงสุด heal ไม่หักลบ damage รวม (§19.2)
- **Distract**: Off-balance ใช้ §8.1 (line of sight และ Hidden) ruling จาก playtest เกม 1 ที่ไม่ตรวจ line of sight กับ Distract ถูกแทนที่ด้วย ruling v2 แล้ว

---

## 16. Command [v1, v2, PRD F3 และ F5, DL]

### 16.1 การใช้
- Tamer ใช้ได้ 1 ครั้งต่อ Turn ฟรี: **ไม่ใช้ Action และไม่ใช้ Move ของ Tamer**
- สั่งได้ทุกจังหวะระหว่าง activation ของ Tamer: ก่อน Move, ระหว่าง Move กับ Action หรือหลัง Action (แต่ไม่ทำให้ Move ถูกแบ่ง) เช่น Command → Move → Action ได้ [v2, PT]
- **ใช้ไม่ได้ใน Turn แรกของฝั่ง** ทั้งฝั่งที่เริ่มก่อนและฝั่งที่เริ่มทีหลัง (กัน alpha strike) [v2, DL]
- เป้า = Monster ฝ่ายเดียวกันที่ยังไม่ล้ม อยู่ระยะไม่เกิน 3 จาก Tamer ณ ตอนสั่ง และยังไม่เริ่ม activation ใน Turn นี้ ไม่ต้องมี line of sight [v2, PRD, sim; ดู D-24]
- ผลจึงเกิดกับ Monster ที่เล่นหลัง Tamer ใน Turn เดียวกันเท่านั้น [PRD]

### 16.2 ตัวเลือก
| ตัวเลือก | ผล |
|---|---|
| advantage | attack roll ครั้งถัดไปของ Monster ตัวนั้นใน Turn นี้ได้ advantage จาก Command |
| ขยับ +1 | ระยะเดินของ Monster ตัวนั้นใน Turn นี้ +1 |
| ผ่าน loyalty check | นอกขอบเขต phase 1 (ถือว่า loyalty เต็ม) |

### 16.3 กฎของ Command แบบ advantage
- **advantage จาก Command หักล้าง disadvantage จากการป้องกัน Tamer ไม่ได้** (§5.3) แก้จาก rules v4 ข้อ 5
- หักล้าง disadvantage แหล่งอื่น (ธาตุ, terrain, Off-balance) ได้ตามปกติ
- ผลถูกใช้ไปกับ attack roll ครั้งแรกของ Monster ตัวนั้นหลังได้รับ แม้ advantage นั้นถูกตัดออกเพราะเป้าเป็น Tamer ที่ได้รับการป้องกัน และกับ Burst มีผลแค่ attack roll ของเป้าแรก [sim; ดู D-04]
- ผลที่ไม่ได้ใช้หายเมื่อจบ Turn

---

## 17. โครงสร้าง Battle: deployment, initiative, Turn และ Round

### 17.1 Deployment [v1, PRD]
- ก่อน Turn แรก ทั้งสองฝั่งเห็น terrain ทั้ง Board
- แต่ละฝั่งวาง Tamer และ Monster 2 ตัวบนช่องว่างในโซนเริ่มของตัวเอง = 2 แถวหลัง (7x7: 14 ช่อง, 9x9: 18 ช่อง): ทีม A แถว 1–2, ทีม B 2 แถวสุดท้าย (7x7: แถว 6–7, 9x9: แถว 8–9) วางบนช่อง terrain ใดก็ได้
- วางแบบปิด แล้วเปิดเผยพร้อมกัน ตอนเล่นกับ AI ให้ AI วางก่อนแบบซ่อน Hotseat ซ่อนการวางของฝั่งแรกก่อนส่งเครื่อง
- deployment ไม่ใช้ลูกเต๋า ไม่มีตัวจับเวลาใน phase 1

### 17.2 Initiative [v1, PRD, sim; ดู D-09]
- ทอยครั้งเดียวหลัง deployment: แต่ละฝั่งทอย d20 + AGI mod สูงสุดในทีม (รวม Tamer) ทีม A ทอยก่อน ทีม B ทอยทีหลัง
- ผลรวมสูงกว่าเริ่มก่อน แล้วสลับฝั่งกันตลอด Battle
- เสมอ: ทั้งสองฝั่งทอยใหม่ (A แล้ว B) จนกว่าจะไม่เสมอ การทอยใหม่นี้ไม่ใช่ Inspiration [sim]
- Inspiration กับ initiative (ชั่วคราว D-09): เมื่อผลไม่เสมอ ฝั่งที่แพ้ใช้ Inspiration ทอย d20 ของตัวเองใหม่ได้ ถ้าผลใหม่ทำให้ลำดับกลับ ฝั่งที่กลายเป็นฝ่ายแพ้ใช้ Inspiration ของตัวเองได้ ถ้าเกิดเสมอหลังทอยใหม่ ทั้งสองฝั่งทอยใหม่ตามกฎเสมอ

### 17.3 Turn และ Round [PRD, CONTEXT.md]
- **Turn** = ช่วงที่ฝั่งหนึ่งเล่น ทุก Unit ของฝั่งนั้นได้ Move + Action
- **Round** = ทั้งสองฝั่งเล่นครบฝั่งละ 1 Turn (Turn ของฝั่งที่เริ่มก่อน แล้ว Turn ของฝั่งที่เริ่มทีหลัง)
- แต่ละฝั่งนับ Turn ของตัวเอง (Turn ที่ 1, 2, ...) Round ที่ r = Turn ที่ r ของทั้งสองฝั่ง
- **Turn แรกของฝั่งที่เริ่มก่อน: เล่นได้แค่ 2 จาก 3 Unit** (ผู้เล่นเลือกเองว่าตัวไหน) [v1, PRD, DL] Turn แรกของฝั่งที่เริ่มทีหลังเล่นได้ครบทุก Unit แต่ยังใช้ Command ไม่ได้ (§16.1)

### 17.4 ลำดับภายใน Turn
**เริ่ม Turn ของฝั่ง S**
1. นับ Turn ของ S เพิ่ม 1 (ถ้า S เป็นฝั่งที่เริ่มก่อน Round เพิ่ม 1)
2. Guarded, Countering และผลของ Cover บน Unit ฝั่ง S หลุด
3. Bleed tick: Unit ฝั่ง S ที่ติด Bleed เสีย HP 1d4 ทีละตัวตามลำดับ Unit (§21.4) Bleed ไม่ใช่การโจมตี ไม่ทอย attack roll และไม่ได้รับผลจาก Guard, Weakened หรือ Cover damage นับเป็น damage รวมของฝั่งตรงข้าม ถ้า Battle จบ (§19.1) หยุดทันที

**ระหว่าง Turn: activation**
- ผู้เล่นเลือก Unit ที่ยังไม่ได้เล่นทีละตัว ตัวที่เลือกเล่นจนจบก่อนเริ่มตัวถัดไป และเล่นซ้ำใน Turn เดียวกันไม่ได้ [v1]
- ใน activation Unit ทำ Move (หรือ Blink) ได้ไม่เกิน 1 ครั้ง และ Action ได้ไม่เกิน 1 ครั้ง ลำดับใดก็ได้ ข้ามอย่างใดอย่างหนึ่งหรือทั้งคู่ได้
- Action = Basic Attack, Defend หรือ skill ที่ไม่ใช่ Passive, ไม่ใช่ Blink และไม่ใช่ Camouflage
- สิ่งที่ไม่ใช้ Move หรือ Action: Command (Tamer), ขั้นถอยของ Hit and Run, Passive, Inspiration, counterattack, Camouflage (1 ครั้งต่อ activation, §15.1, D-28)
- activation เริ่มเมื่อ Unit ทำ Move, Blink, Action, Camouflage หรือ Command ครั้งแรก ข้อจำกัด 2 จาก 3 Unit นับ Unit ที่เริ่ม activation
- ผู้เล่นจบ Turn ได้ทุกเมื่อ แม้มี Unit ที่ยังไม่ได้เล่น (ยกเว้นข้อ 4 ของ §14.3)

**จบ Turn ของฝั่ง S**
1. status ที่มีระยะเวลาบน Unit ฝั่ง S ลดตาม §14.1
2. ช่องที่ Attune โดยฝั่ง S ลดระยะเวลา หมดแล้วกลับเป็น terrain เดิม (§15.4)
3. ตรวจ Hidden ของทุก Unit (§8.2)
4. ผล Command ที่ไม่ได้ใช้หาย
5. ถ้านี่คือ Turn ที่ 10 ของฝั่งที่เริ่มทีหลัง (จบ Round 10) ตัดสินตาม §19.2
6. ไม่อย่างนั้นเริ่ม Turn ของอีกฝั่ง

### 17.5 Undo [playtest v0.1.5, D-30]
- ผู้เล่นย้อน action ของ Turn ตัวเองกลับถึง **จุดปลอดภัย** ได้ จุดปลอดภัยคืออันที่มาทีหลังกว่าระหว่าง (ก) ต้น Turn (หลัง End Turn ของอีกฝั่ง หรือก่อน action แรกของ Battle) และ (ข) หลัง action ล่าสุดที่ทอยลูกเต๋าอะไรก็ได้ (attack roll, save, damage, heal, Bleed tick, initiative, Inspiration ที่ทอยใหม่) หรือที่ตอบการทอยนั้น (ใช้หรือไม่ใช้ Inspiration)
- ย้อนได้เฉพาะฝั่งที่กำลังเล่นภายใน Turn ของตัวเอง และเมื่อมีอย่างน้อย 1 action หลังจุดปลอดภัย ไม่มีในช่วงที่อีกฝั่งต้องตัดสินใจ (เช่น save) ไม่มีใน Turn ของ AI และ Battle ที่จบแล้วหรือยังไม่เริ่มเล่น (deployment) ย้อนไม่ได้
- ผลคือ state เหมือนตอนอยู่ที่จุดปลอดภัยทุกอย่าง: ตำแหน่ง, Command, Defend (Guarded), Camouflage, Attune, activation ที่เริ่มแล้วและ Unit ที่กำลังเล่น ลูกเต๋าไม่ถูกทอยซ้ำ เพราะ action ที่ถูกย้อนไม่ได้ใช้ลูกเต๋าเลย (ลำดับลูกเต๋า §21.4 ไม่ขยับ) การเล่นต่อจึงเหมือนไม่เคยมี action เหล่านั้น
- Undo ไม่ใช่ action ของเกมใน ticket นี้ (session ทำ ไม่บันทึกลง Replay) การบันทึกลง Replay เป็นของ Replay format 2 (ticket 06)

---

## 18. Inspiration [v1, v2, PRD, PT; ดู D-10, D-29]

- แต่ละฝั่งมี Inspiration 1 ครั้งต่อ Battle
- ใช้ทอยใหม่ได้ 1 ครั้งกับ **d20 ของฝั่งตัวเอง** เท่านั้น ได้แก่:

| การทอย | Inspiration ใช้ได้ | ฝั่งที่ใช้ |
|---|---|---|
| d20 ของ initiative | ได้ | ฝั่งที่ทอย (§17.2) |
| attack roll (รวม Mark, ทุกเป้าของ Burst แยกกัน และ counterattack) | ได้ เฉพาะที่พลาด | ฝั่งผู้โจมตี |
| save | ได้ เฉพาะที่ไม่ผ่าน | ฝั่งผู้ถูกเล็ง (ใช้ได้ระหว่าง Turn ของอีกฝั่ง) |
| dice damage (รวม critical) | ไม่ได้ | - |
| Bleed tick 1d4 | ไม่ได้ (ไม่ใช่ d20) [PT เกม 1] | - |
| heal ของ First Aid | ไม่ได้ | - |

- ทอยใหม่ทั้งการทอย: ถ้ามี advantage หรือ disadvantage ทอย d20 ใหม่ทั้ง 2 ลูกภายใต้สถานะเดิม [v2]
- ต้องใช้ผลใหม่ ใช้ Inspiration ซ้ำกับการทอยเดียวกันไม่ได้
- ตัดสินใจทันทีหลังเห็นผล d20 และก่อนทอยลูกเต๋าลูกถัดไปใดๆ
- เสนอเฉพาะเมื่อผลนั้นไม่เป็นคุณกับฝั่งเจ้าของ [กติกาใหม่ playtest v0.1.5, D-29]: attack roll ที่พลาด (critical คือโดน) หรือ save ที่ไม่ผ่าน ไม่เสนอหลังโดนหรือ save ผ่าน เพราะไม่มีเหตุให้ทอยใหม่ (เกมไม่ถามฝั่งที่ทอยดีอยู่แล้ว) initiative ตาม §17.2 (ฝั่งที่แพ้) ผลที่ทอยใหม่แล้วใช้เลย ไม่ถามซ้ำ
- การใช้หรือไม่ใช้ Inspiration เป็น action ที่ถูกบันทึกใน Replay

---

## 19. เงื่อนไขชนะและ turn limit

### 19.1 ชนะทันที [v1, PRD]
- HP ของ Tamer ฝั่งตรงข้ามเป็น 0 หรือ
- Monster ทุกตัวของฝั่งตรงข้ามมี HP 0
- ตรวจทุกครั้งที่ Unit ล้ม (§10.4) รวมกลาง skill, ระหว่าง Burst, จาก counterattack, จาก damage ที่โอนด้วย Cover และจาก Bleed tick ตอนเริ่ม Turn Battle จบทันทีที่ damage ครั้งแรกทำให้เงื่อนไขเป็นจริง ผลที่เหลือไม่ทำต่อ เพราะ damage ลงทีละ Unit จึงไม่มีกรณีชนะพร้อมกันสองฝั่ง

### 19.2 Turn limit [v4, PRD, DL]
- Battle มีไม่เกิน 10 Round (ฝั่งละ 10 Turn)
- ถ้าจบ Round 10 แล้วยังไม่มีผู้ชนะ ฝั่งที่ทำ damage รวมตลอด Battle มากกว่าชนะ heal ไม่หักลบ เท่ากัน = เสมอ
- damage รวมของฝั่ง X = ผลรวม damage ทุกครั้งที่ลง Unit ของฝั่งตรงข้าม นับเต็มจำนวนแม้เกิน HP ที่เหลือ รวม counterattack, Bleed (นับให้ฝั่งตรงข้ามของ Unit ที่ติด Bleed) และ damage ที่โอนด้วย Cover [sim; ดู D-11]
- เกณฑ์ HP% ของ v1 ถูกแทนที่แล้ว

---

## 20. Scenario และ loadout ของ phase 1 [PRD Prototype kit, DL]

ต้นฉบับตัวเลขของ Scenario อยู่ใน `data/` (เมื่อมีแล้ว) Unit ใน Scenario เก็บเป็น species, ธาตุ, Star (หรือ Level ของ Tamer), 6 stat และ skill loadout ไม่เก็บค่าที่คำนวณแล้ว [DL]

### 20.1 ทีม ธาตุ และ loadout
| ทีม | Unit | ธาตุ | บทบาท / แบบ / Movement | Loadout (เพิ่มจาก Basic Attack และ Defend) |
|---|---|---|---|---|
| A | Tamer | ไม่มี | - / - / Ground | Cover, Attune, First Aid, Distract + Command |
| A | Fangrel | ป่า | Striker / เบา / Ground | Heavy Blow, Rend, Hit and Run, Pack Howl |
| A | Wispling | ภูเขา | Caster / เบา / Flying | Element Bolt, Burst, Hex, Blink |
| B | Tamer | ไม่มี | - / - / Ground | Cover, Attune, First Aid, Distract + Command |
| B | Tidewall | ทะเลทราย | Guardian / หนัก / Aquatic | Taunt, Shield Bash, Counter, Pincer Guard |
| B | Quillfox | น้ำ | Ranger / เบา / Ground | Long Shot, Pin, Mark, Camouflage |

วงธาตุข้ามทีม: Fangrel > Quillfox > Wispling > Tidewall > Fangrel ลำดับ Unit ในทีม (ใช้ใน §21.4) = ตามตารางนี้

| Scenario | Tamer | Monster |
|---|---|---|
| 1. ต้นเกม | Level 1 | 1 Star ทั้งสองตัว |
| 2. กลางเกม | Level 6 | 4 Star ทั้งสองตัว |

Tamer ทั้งสอง Scenario ใช้แค่ basic skill [PRD kit]

### 20.2 ค่าคาดหวังจากสูตร (ใช้ใน test)
| Unit | POW | AGI | VIT | INT | SEN | SPI | HP | Move | Guard / Ward | Attack | Save DC | Damage หลัก |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fangrel 1 Star | 14 | 12 | 10 | 8 | 12 | 8 | 19 | 4 | 11 / 9 | +2 | 11 | 1d8+2 |
| Fangrel 4 Star | 22 | 18 | 14 | 10 | 16 | 12 | 31 | 5 | 14 / 11 | +5 | 16 | 1d8+6 |
| Tidewall 1 Star | **16** | 8 | 14 | 8 | 10 | 12 | 31 | **2** | 11 / 11 | +1 | 11 | Shield Bash 2d6+3 |
| Tidewall 4 Star | **28** | 10 | 22 | 10 | 14 | 18 | 50 | **2** | 12 / 14 | +4 | 16 | Shield Bash 2d6+9 |
| Wispling 1 Star | 8 | 12 | 8 | 14 | 12 | 12 | 17 | 4 | 11 / 11 | +2 | 11 | Bolt 1d8+2 |
| Wispling 4 Star | 10 | 16 | 12 | 22 | 18 | 18 | 29 | 4 | 13 / 14 | +6 | 16 | Bolt 1d8+6 |
| Quillfox 1 Star | 12 | 12 | **14** | 8 | **16** | 8 | 22 | 4 | 11 / 9 | +4 | 12 | Long Shot 1d8+3 |
| Quillfox 4 Star | 16 | 18 | **20** | 10 | **24** | 16 | 36 | 5 | 14 / 13 | +9 | 17 | Long Shot 1d8+7 |
| Tamer Level 1 | 10 | 12 | 12 | 10 | 12 | **8** | 25 | 3 | 11 / 9 | +3 | 9 | 1d6 |
| Tamer Level 6 | 10 | 14 | 14 | 10 | 14 | **12** | 45 | 3 | 12 / 11 | +5 | 12 | 1d6 |

- ทุกค่าตรงกับตาราง stat block ใน Prototype kit ยกเว้น Move ของ Tidewall ที่เปลี่ยนจาก 3 เป็น 2 ตามสูตรล้วน [DL 2026-10-14] และ stat ตัวหนาที่ปรับใน ticket 19 (balance, DL 2026-10-16): Tidewall POW +4 (Scenario 2 +6 และอีก +2 ใน ticket 27 รวม +8), Quillfox VIT +4 / SEN +2 (Scenario 2 VIT +8 / SEN +2), Tamer SPI −4 ทั้งสองทีม test กติกาใน packages/engine ยังใช้ stat ของ kit เดิมของ Scenario 1 (fixture `scenario1`) ส่วน derived.test.ts ตรวจตารางนี้กับ data จริง
- Guard ของ Tidewall รวม Guard bonus +2 ของ species (D-06)
- Quillfox 4 Star SPI 16 (และ Tidewall 4 Star POW 20 ของ kit ก่อน ticket 19) เป็นค่าทดสอบของ kit ไม่ใช่ค่าของ sim v4 (ดู D-25)
- initiative mod: Scenario 1 ทั้งสองทีม +1, Scenario 2 ทั้งสองทีม +4

---

## 21. Determinism [ADR 0002]

### 21.1 หลักการ
- กติกาใช้จำนวนเต็มล้วน ห้ามมีทศนิยมในขั้นใดของการคำนวณ state
- แหล่งความสุ่มเดียวของ Battle คือ dice stream จาก Dice Seed ลูกเต๋าทุกลูกดึงจาก stream นี้ตามลำดับใน §21.4
- ใน test ใส่ลำดับผลทอยที่กำหนดเองผ่านช่องทางเดียวกับ Dice Seed ได้
- preview (% โอกาสโดน, % ไม่ผ่าน save, ช่วง damage, โอกาส critical) ต้องไม่เปลี่ยน state และไม่ดึงลูกเต๋า คำนวณเป็นเศษส่วนจริง (ฐาน 20 สำหรับ d20 ปกติ, 400 สำหรับ advantage/disadvantage, s^n สำหรับ dice damage) การปัดเพื่อแสดงผลเป็นเรื่องของ UI ไม่กระทบ state
- AI ห้ามดึงลูกเต๋าจาก dice stream ของ Battle (ถ้าต้องสุ่มใช้ stream แยกหรือ tie-break ตายตัว) deployment ไม่ใช้ลูกเต๋า
- ตัดสิน action จาก state + action log เท่านั้น ไม่ใช้เวลาจริงหรือ input อื่น

### 21.2 จุดปัดเศษทุกจุด
| จุด | กฎ | ตัวอย่าง |
|---|---|---|
| stat mod | `floor((stat − 10) / 2)` floor จริง (ปัดไปทางลบ) | 9 → −1, 8 → −1, 7 → −2, 1 → −5, 11 → 0, 30 → 10 |
| HP แบบหนัก | `floor((10 + VIT) × 12 / 10)` คูณก่อนแล้วหาร | VIT 14: 24 × 12 = 288, ÷ 10 = 28 |
| HP แบบเบา | `floor((10 + VIT) × 8 / 10)` | VIT 12: 22 × 8 = 176, ÷ 10 = 17 |
| ส่วนของ AGI ในระยะเดิน | `trunc(AGI mod / 4)` ปัดเข้าหาศูนย์ | mod −5 หรือ −4 → −1, −3 ถึง 3 → 0, 4 ถึง 7 → 1, 8 ถึง 10 → 2 |
| ระยะเดินพื้นฐาน | ต่ำสุด 2 หลังรวมแบบเบา/หนัก | Tidewall AGI 8: 3 + 0 − 1 = 2 |
| proficiency ของ Monster | `ceil(Star / 2)` = `floor((Star + 1) / 2)` | Star 1 → 1, 4 → 2 |
| damage | ขั้นต่ำ 1 เมื่อโดน หลังรวม mod และ Weakened | 1 + (−3) → 1 |
| heal ของ First Aid | ขั้นต่ำ 0 แล้วไม่เกิน HP สูงสุด | |
| HP หลังล้ม | ตั้งเป็น 0 | |

ตาราง stat → mod: 1 = −5, 2–3 = −4, 4–5 = −3, 6–7 = −2, 8–9 = −1, 10–11 = 0, 12–13 = +1, 14–15 = +2, 16–17 = +3, 18–19 = +4, 20–21 = +5, 22–23 = +6, 24–25 = +7, 26–27 = +8, 28–29 = +9, 30 = +10

### 21.3 Line of sight
ใช้อัลกอริทึมใน §7.3 เท่านั้น ทิศจากผู้ใช้ไปเป้า ตรงกับ `LINE` / `_bres` ใน sim.py และ `bres` ใน docs/playtest/board.py

### 21.4 ลำดับการดึงลูกเต๋า
- ลูกเต๋า 1 ลูก = ดึงค่า 1 ค่าจาก stream แล้วแปลงเป็น 1..s (วิธีแปลงกำหนดพร้อม PRNG ใน §21.5)
- ลูกเต๋าหลายลูกในการทอยเดียว (เช่น 2d8, advantage) ดึงทีละลูกตามลำดับ
- ดึงลูกเต๋าเฉพาะเมื่อจำเป็น (พลาด = ไม่ทอย damage; เป้าล้มหรือพลาด = ไม่ทอย save)
- **ลำดับ Unit** (ใช้เมื่อหลาย Unit ต้องทอยในจังหวะเดียว): ในฝั่งเดียวกันเรียง Tamer, Monster ช่อง 1, Monster ช่อง 2 ตามที่ Scenario ระบุ (§20.1) ระหว่างสองฝั่ง ทีม A ก่อนทีม B

| จังหวะ | ลูกเต๋าตามลำดับ |
|---|---|
| Deployment | ไม่มี |
| Initiative | d20 ของทีม A, d20 ของทีม B; เสมอ = ทอยคู่ใหม่ A แล้ว B; Inspiration ตาม §17.2 ดึง d20 ใหม่ 1 ลูกทันทีที่ใช้ |
| เริ่ม Turn | Bleed 1d4 ของแต่ละ Unit ที่ติด Bleed ตามลำดับ Unit ของฝั่งนั้น |
| การโจมตี 1 ครั้ง (§10.5) | 1. attack roll: d20 1 ลูก หรือ 2 ลูกถ้ามี advantage/disadvantage (ลูกแรก แล้วลูกที่สอง) 2. ถ้าใช้ Inspiration: ทอยใหม่จำนวนลูกเท่าเดิม 3. ถ้าโดนและทำ damage: dice damage n ลูก (2n ถ้า critical) 4. ถ้าโดน เป้ายังไม่ล้ม และมี save: d20 ของ save 5. ถ้าฝั่งเป้าใช้ Inspiration: d20 ใหม่ 6. ถ้ามี counterattack: ทำข้อ 1–3 ของ counterattack (ไม่มี save และไม่มี counter ซ้อน) 7. การผลักและขั้นถอยของ Hit and Run ไม่ใช้ลูกเต๋า |
| skill แบบ save (Taunt, Hex, Distract) | d20 ของ save ของเป้า แล้ว d20 ใหม่ถ้าฝั่งเป้าใช้ Inspiration |
| Burst | ทำ "การโจมตี 1 ครั้ง" ครบทุกขั้นกับเป้าแรกตามลำดับที่ผู้เล่นเลือก แล้วจึงเป้าที่สอง |
| First Aid | 1d8 |
| Skill ที่ไม่ทอย, Move, Blink, Command, จบ Turn, turn limit | ไม่มี |

### 21.5 PRNG
ห้ามใช้ตัวสุ่มของภาษาหรือเบราว์เซอร์ ที่มาและแหล่งอ้างอิงอยู่ใน docs/research/phase-1-stack.md §6 [ticket 01, DL 2026-10-15]

1. **อัลกอริทึม**: xoshiro128\*\* เวอร์ชัน 1.1 (Blackman & Vigna) state เป็น uint32 4 ตัว ต้องไม่เป็นศูนย์ทั้งหมด ทุกการคำนวณเป็นจำนวนเต็ม 32 บิต (การคูณใช้การคูณจำนวนเต็ม 32 บิต แล้ว normalize เป็น 0..2^32−1)
2. **Dice Seed**: ค่า 64 บิต แสดงเป็น hex 16 ตัว สร้าง state เริ่มต้นด้วย SplitMix64 เรียก 2 ครั้ง แล้วแตกผลแต่ละครั้งเป็น uint32 สองตัว (hi แล้ว lo) ได้ s[0..3] ตามลำดับ การคูณ 64 บิตของ SplitMix64 ใช้เฉพาะตอนสร้าง state
3. **ลูกเต๋า dN**: ดึงค่าดิบ x จาก PRNG ถ้า x < (2^32 mod N) ให้ดึงใหม่ (rejection) แล้วคืน (x mod N) + 1 จำนวนครั้งที่ดึงต่อการทอยจึงไม่คงที่ แต่ deterministic เมื่อลำดับการทอยตาม §21.4
4. **ลูกเต๋าของ AI**: AI ใช้ PRNG แยกที่ได้จากสำเนา state เริ่มต้นของ Battle แล้วเรียก jump() 1 ครั้ง (เท่ากับดึง 2^64 ครั้ง) การคิดของ AI จึงไม่กินลูกเต๋าของ Battle
5. **test vector**: state [1, 2, 3, 4] ต้องให้ 6 ค่าแรก 11520, 0, 5927040, 70819200, 2031721883, 1637235492 (ticket 03 ต้องเทียบกับ C reference อีกครั้งก่อนใช้เป็น test)

### 21.6 d20 ที่ Inspiration ทอยใหม่ได้
initiative, attack roll ทุกแบบ (รวม Mark, ทุกเป้าของ Burst และ counterattack) และ save เท่านั้น และเสนอเฉพาะที่พลาดหรือไม่ผ่าน (initiative: ฝั่งที่แพ้) ดู §18

### 21.7 ความต่างจาก sim.py ที่รู้อยู่แล้ว
sim.py ใช้ `random.Random` ดึงลูกเต๋าให้ AI ตอน deployment และเรียงเป้าของ Burst ตามลำดับ Unit ไม่ใช่ลำดับที่เลือก engine ทำตาม §21.1 และ §21.4 จึงเทียบกับ sim ได้เชิงสถิติเท่านั้น ไม่ใช่เทียบลูกต่อลูก (D-25)

---

## 22. นอกขอบเขต phase 1

ไม่ระบุรายละเอียดในเอกสารนี้ [DL, spec phase 1]:
- Tactician mode (2d10 และ damage เฉลี่ย)
- loyalty check (ถือว่า loyalty เต็ม) และตัวเลือก Command "ผ่าน loyalty check"
- ไอเทม และ Action ใช้ไอเทมของ Tamer
- Team cost cap (ใช้ทีมตายตัวตาม Scenario)
- skill ที่ไม่อยู่ใน loadout ของ kit: Rally Roar, Finisher, Shield Wall, Mana Shield, Scout, Tide Surge, Echo, Quill Volley
- status ที่ไม่ใช้ใน phase 1: Blessed, Empowered, Bound, Stun, Linked
- species อื่น, skill อาชีพของ Tamer (Class, Specialization), gear, Veteran bonus
- ตัวจับเวลา deployment และโซนวางพิเศษของ campaign
- signature skill (Signature tier มีในกติกาแต่ไม่มี skill ใน loadout)

---

## 23. ต้องตัดสิน

จุดที่แหล่งเดิมกำกวมหรือขัดกันและแก้จากแหล่งที่สำคัญกว่าไม่ได้

**ตัดสินแล้วทั้งหมดเมื่อ 2026-10-15** (decision log): ค่าในคอลัมน์ "ที่ตัดสิน" เป็นกติกาจริงทุกข้อ ยกเว้นข้อที่ระบุไว้ด้านล่าง ตารางเก็บไว้เป็นบันทึกเหตุผล ถ้าจะเปลี่ยนข้อใดภายหลัง ให้แก้หมวดที่เกี่ยวข้องและเพิ่มแถวใหม่ใน decision log

- **D-03**: ใช้ตามตารางไปก่อนเพื่อให้เทียบกับ sim ได้ แล้วเปิด ticket tuning "Marked อยู่ถึงจบ Turn ถัดไปของฝั่งที่ Mark" หลังจาก simulator ผ่านการเทียบผล **เปลี่ยนแล้ว 2026-10-16 (ticket 18)**: Marked นับตามฝั่งที่ Mark อยู่จนจบ Turn ถัดไปของฝั่งนั้น (§14.1) เพราะแบบเดิม Mark แทบไม่ถูกใช้ (≤ 0.01 ครั้งต่อ Battle) ผลต่อ simulator: docs/balance/ticket-18-marked.md
- **D-05**: ไม่ใช้ค่าชั่วคราว บังคับเฉพาะ Unit ที่ติด Taunted ฝั่งนั้นจบ Turn ได้ตามปกติ (§14.3 ข้อ 4)
- **D-06**: Guard bonus ของ species ต้องเป็นค่าที่เห็นได้ใน data ของ species ห้ามฝังในโค้ด
- **D-25**: การเทียบผล ±5 pp กับ sim v4 ใช้ stat ที่ sim v4 ใช้จริง (Tidewall 4 Star POW 16, Quillfox 4 Star SPI 12) ส่วน Scenario ในเกมใช้ค่าตาม kit (§20)
- **D-28**: ตัดสิน 2026-10-16 (ticket 27, ผู้ใช้เลือกทางเลือก A ของ ticket 19): Camouflage ไม่ใช้ Action และ Move (§15.1) ผลต่อ simulator: docs/balance/ticket-27-camouflage.md
- **D-29**: ตัดสิน 2026-10-17 (playtest v0.1.5, ticket 01 ของ phase 1.x): Inspiration เสนอเฉพาะเมื่อ attack roll ของฝั่งตัวเองพลาด (รวม Mark, ทุกเป้าของ Burst, counterattack) หรือ save ของฝั่งตัวเองไม่ผ่าน; initiative ตามเดิม (§18) ผลต่อ simulator: ไม่มี (ผู้เล่นเท่านั้นที่ถูกถาม AI ตัดสินจากผลที่เห็น) ENGINE_VERSION 0.9.0 → 0.10.0
- **D-30**: ตัดสิน 2026-10-17 (playtest v0.1.5, ticket 05 ของ phase 1.x): Undo ถึงจุดปลอดภัยของ Turn ตัวเอง (§17.5) ผลต่อ simulator: ไม่มี (AI ไม่ใช้ Undo) ไม่ขยับ ENGINE_VERSION (session ล้วน)
- **D-31**: ตัดสิน 2026-10-18 (phase 1.x ticket 08/09, ผู้ใช้เลือกชุด a+b+c หลังรายงาน docs/balance/ticket-08-range-experiments.md): (a) ระยะ Long Shot, Element Bolt, Pin 4 → 3 และ Mark 5 → 4 (data); (b) attack roll จากระยะ 4 ขึ้นไปได้ disadvantage (§5.1); (c) ภูเขาบัง line of sight (§7.2) และ Board เพิ่มภูเขาอย่างละ 4 ช่อง (§2.2) ผลต่อ simulator: อยู่นอก sim-equivalent layer (sim v4 ไม่มี) ENGINE_VERSION 0.10.0 → 0.11.0 รายงาน: docs/balance/ticket-09-range-rules.md

| รหัส | ประเด็น | แหล่งที่กำกวมหรือขัด | ที่ตัดสิน | ผลกระทบ |
|---|---|---|---|---|
| D-01 | line of sight ไม่สมมาตร | v1 บอกแค่ "Bresenham ไม่นับช่องปลาย" ไม่ระบุทิศ; บน Board 7x7 มี 696 คู่ (แบบมีทิศ) ที่ชุดช่องของ A→B ต่างจาก B→A | คำนวณจากผู้ใช้ไปเป้าตาม sim.py (§7.3) | A ยิง B ได้แต่ B ยิง A ไม่ได้ในบางตำแหน่ง ถ้าเปลี่ยนเป็นแบบสมมาตรจะเทียบกับ sim ไม่ได้ตรง |
| D-02 | status ที่ติดระหว่าง Turn ของฝั่งตัวเอง | v1 "duration 1 = expires at end of that side's NEXT turn" ไม่บอกกรณีติดใน Turn ตัวเอง | ข้ามการลดครั้งแรก [sim] | Rallied (Pack Howl) และ Attune อยู่นานขึ้น 1 Turn เมื่อเทียบกับการนับทันที |
| D-03 | ช่วงที่ Marked มีผล | v1, PRD: Marked 1 นับเมื่อจบ Turn ของฝั่งที่ติด | ตามตัวอักษร: มีผลแค่ส่วนที่เหลือของ Turn ที่ Mark และ Turn ของฝั่งที่ติด (ช่วงหลังมีแค่ counterattack ที่โจมตีได้) | Mark ช่วยได้แค่ Unit ที่เล่นหลัง Quillfox ใน Turn เดียวกัน ต้องยืนยันว่าตั้งใจแบบนี้ → เปลี่ยนแล้ว 2026-10-16: นับตามฝั่งที่ Mark จนจบ Turn ถัดไปของฝั่งนั้น (ticket 18) |
| D-04 | ผล Command แบบ advantage ถูกใช้ไปเมื่อไร | v1 "next attack this turn" ไม่บอกกรณีถูกตัดเพราะการป้องกัน Tamer หรือกรณี Burst | ใช้ไปกับ attack roll ครั้งแรกแม้ถูกตัด, Burst ได้แค่เป้าแรก [sim] | ผลของ Command กับ Burst และการโจมตี Tamer |
| D-05 | Taunted กับการจบ Turn หรือไม่เล่น Unit | v2 "must use an attack against the taunter" ขัดกับ user story 31 ใน spec (จบ Turn ได้แม้ Unit ยังไม่ทำ Action) | บังคับเฉพาะ Unit ที่ติด Taunted: ถ้าใช้ Action ต้องโจมตีผู้ taunt, ฝั่งนั้นจบ Turn ได้ตามปกติ (§14.3 ข้อ 4) [sim เล่นทุก Unit เสมอ] | Taunt + Counter ของ Tidewall แรงขึ้นถ้าบังคับ |
| D-06 | Guard +2 ของ Tidewall | v2 C ให้ Tidewall Guard +2 และ kit ใช้ค่า 11/12; decision log 2026-10-14 ตัดแค่ข้อยกเว้นระยะเดิน; สูตร Guard ใน PRD ไม่มีโบนัสนี้ | คงไว้เป็น "Guard bonus ของ species" ใน data (Tidewall +2) | ถ้าตัดทิ้ง Guard ของ Tidewall เป็น 9/10 ไม่ตรง kit และ sim |
| D-07 | stat ของ Save DC | PRD "mod ของ stat ที่ skill ใช้" กับ v1 "mod ของ stat หลักของบทบาทผู้ใช้" | ใส่ DC stat ราย skill ใน data ค่า = stat หลักของบทบาท (phase 1 ให้ผลเท่ากันทั้งสองแบบ) | species หรือ skill ในอนาคตที่ใช้ stat อื่น |
| D-08 | แสงกับมืด | PRD "ต่างได้เปรียบกันและกัน" ตีได้สองแบบ | ได้ทั้ง advantage และ disadvantage จึงหักล้างเป็นปกติ [sim] (อีกแบบคือได้ advantage ทั้งคู่) | ไม่มี Monster แสง/มืดใน phase 1 แต่ engine ต้องมีกฎ |
| D-09 | initiative เสมอ และ Inspiration กับ initiative | v1 ไม่ระบุการเสมอ และไม่ระบุลำดับการใช้ Inspiration ของสองฝั่ง | เสมอทอยใหม่ทั้งคู่ [sim]; ฝั่งที่แพ้ใช้ก่อน (§17.2) [ใหม่] | ลำดับลูกเต๋าตอนเริ่ม Battle |
| D-10 | จังหวะเสนอ Inspiration | v1, v2 ไม่ระบุว่าถามเมื่อไร; sim ใช้แค่ตอนโจมตี Tamer พลาดและตอน save ไม่ผ่าน | ใช้ได้กับ d20 ของฝั่งตัวเองทันทีหลังเห็นผล ก่อนลูกถัดไป (เดิมทุกครั้งแม้โดน แก้ด้วย D-29: เฉพาะที่พลาดหรือไม่ผ่าน); save ให้ฝั่งเป้าตัดสินระหว่าง Turn ของอีกฝั่ง (§18) | UX ของ Hotseat (ต้องส่งเครื่องกลางคัน) และจำนวนจุดหยุดรอใน Replay |
| D-11 | นับ damage รวมเพื่อตัดสิน turn limit | v4 "total damage" ไม่บอกเรื่อง overkill, Bleed, Cover | นับเต็มรวม overkill, Bleed นับให้ฝั่งตรงข้าม, Cover นับ [sim] | ผลเกมที่ไปจบที่ Round 10 (16% ใน S1) |
| D-12 | Hit and Run | v1, PRD ไม่บอกว่าถอยได้เมื่อพลาดหรือไม่ และใช้ Move ต่อได้หรือไม่ | ถอยได้ทั้งโดนและพลาด [sim]; ขั้นถอยแยกจาก Move จึงใช้ Move ต่อได้ [ใหม่ sim AI ไม่เคยทำ] | ความคล่องตัวของ Fangrel |
| D-13 | Blink | v1 "replaces Move" ไม่พูดถึง Pin, Command +1, Aquatic | ใช้ได้แม้ติด Pin, ระยะคงที่ 2 [sim] | Pin กับ Wispling ไม่มีผล |
| D-14 | Burst | v1 "center within range" ไม่บอกระยะ 0, ช่องกลางต้องมีอะไรหรือไม่, ลำดับเป้า | ช่องกลางระยะ 0–3 (รวมช่องตัวเอง), ต้องมีเป้าอย่างน้อย 1, ไม่ตรวจ line of sight รายเป้า [sim]; ลำดับตามที่ผู้เล่นเลือก [spec] ขณะที่ sim ใช้ลำดับ Unit | การเล็ง Burst และลำดับลูกเต๋า |
| D-15 | แบบหนักถูกผลักยากกว่า | PRD F7 "หนัก ... ถูกผลักได้ยากกว่า" กับ v3 "ยังไม่มีกฎนี้" | ไม่มีการต้านการผลัก | phase 1 ไม่มี Unit แบบหนักที่ถูกผลัก (มีแค่ Tidewall ที่เป็นผู้ผลัก) |
| D-16 | cooldown ของ Major | v1 [INTERP] "ใช้ Turn 1 ใช้อีกได้ Turn 3" และขอให้รายงานเทียบกับ Turn 4 ไม่เคยมีข้อสรุป | Turn N → N + 2 [v1, sim] | ความถี่ของ skill Major ทั้งหมด |
| D-17 | Aquatic +1 | PRD "เดินบนช่องน้ำได้ +1 ช่อง" กับ v1 [INTERP] "เริ่ม Move บนน้ำ" | เริ่ม Move บนน้ำ [v1, sim] | ระยะเดินของ Tidewall |
| D-18 | Hidden กับการเดินและ Camouflage | v1 "ends when it leaves forest" ไม่บอกกรณีเดินผ่านช่องอื่นแล้วจบที่ป่า หรือใช้ Camouflage นอกป่า | ตรวจแค่ช่องปลายทาง [sim]; Camouflage ใช้ได้เฉพาะบนช่องป่า [ใหม่ sim ปล่อยให้ใช้แต่ไม่มีผล] | ความแรงของ Camouflage |
| D-19 | Pack Howl รวมตัวเองไหม | v1 "self + allies within 1" กับ PRD "พวกในระยะ 1" | รวมตัวเองและ Tamer [v1, sim] | Rallied ของ Fangrel |
| D-20 | Attune | v1, PRD ไม่บอกว่าช่องว่างได้ไหม, เลือก "ปกติ" ได้ไหม, นับเวลาตาม Turn ของใคร | ช่องติดกันใดก็ได้, 6 ธาตุเท่านั้น, นับตาม Turn ของฝั่งผู้ใช้แบบ D-02, ทับแล้วรีเซ็ต [sim] | ระยะเวลาจริงของ terrain ที่เปลี่ยน |
| D-21 | Cover | v1 ไม่บอกว่าต้องติดกันตลอดไหม และผลอื่นนอกจาก damage ไปที่ใคร | ไม่ต้องติดกันหลังใช้, โอนเฉพาะ damage, เป้าเป็น Monster เท่านั้น [sim] | Tamer รับ damage แทนได้ไกล |
| D-22 | Mark เป็นการโจมตีไหม | v1 "physical, no damage" ไม่ได้บอกผลข้างเคียง | เป็น attack roll เต็มรูปแบบ [sim] | Mark ทำให้ Hidden หลุดและโดน Counter ได้ |
| D-23 | Counter เมื่อพลาดและจาก Burst | v1 "when attacked by an enemy at distance 1" | นับทั้งโดนและพลาด, Burst จากระยะ 1 นับ [sim] | ความแรงของ Counter |
| D-24 | ระยะและ line of sight ของ Command | PRD "ในระยะ 3 ช่อง" ไม่บอก line of sight | วัดตอนสั่ง ไม่ต้องมี line of sight [sim] | ตำแหน่งของ Tamer |
| D-25 | การเทียบผลกับ sim v4 (U4) | sim v4 ใช้ Tidewall 4 Star POW 16 และ Quillfox 4 Star SPI 12 แต่ kit (และ data) ใช้ POW 20 และ SPI 16 (S2 ทีม A ชนะ ~68% แทน 80%); sim ดึงลูกเต๋าตอน AI deploy และเรียงเป้า Burst ต่างกัน | rules ไม่เปลี่ยน แต่ ticket simulator ต้องเลือกว่าจะเทียบ ±5 pp กับชุดตัวเลขไหน | gate "ผลต่างจาก sim v4 ไม่เกิน ±5 pp" |
| D-26 | heal ขั้นต่ำ | ไม่มีแหล่งไหนระบุ | heal ขั้นต่ำ 0 [sim] | ไม่มีผลใน phase 1 (SPI mod ของ Tamer เป็นบวก) |
| D-27 | ทอย 1 และ 20 ใน save | กฎ "20 = critical, 1 พลาดเสมอ" ใน v1 และ PRD เขียนไว้สำหรับ attack roll ไม่ได้พูดถึง save | save ใช้ผลรวมเทียบ DC อย่างเดียว [sim, docs/playtest/atk.py] | % ไม่ผ่าน save ที่ preview แสดง |
| D-28 | Camouflage ใช้ Action ไหม | v1, PRD ให้ Camouflage เป็น skill Minor ที่ใช้เป็น Action (sim v4 ก็เช่นกัน); ticket 19 พบว่า Camouflage แทบไม่ถูกใช้ (≤ 0.015 ครั้งต่อ Battle) เพราะต้องเสีย Long Shot ของ Quillfox | skill ฟรี: ไม่ใช้ Action และ Move, ไม่เกิน 1 ครั้งต่อ activation ณ จุดใดก็ได้ใน activation, ยังเป็น Minor (ไม่มี cooldown จึงใช้ได้ทุก activation), ใช้แล้วนับเป็นการเริ่ม activation (นับในข้อจำกัด 2 จาก 3 Unit) และใช้ไม่ได้อีกเมื่อ activation จบ, Taunted (§14.3) บังคับแค่ Move และ Action จึงไม่ห้าม Camouflage [ใหม่ ticket 27; การเทียบผลกับ sim v4 (sim-equivalent) ยังใช้ Camouflage เป็น Action แบบ sim] | ความถี่ของ Camouflage, "ยิงแล้วซ่อน" ของ Quillfox |
| D-29 | Inspiration หลังทอยโดน | v1, v2, D-10: เสนอทุกครั้งที่ฝั่งตัวเองทอย d20 แม้ผลดี; playtest v0.1.5: 6 จาก 7 คำถามมาหลังทอยโดนเอง ผู้เล่นต้องตอบคำถามที่ไม่มีเหตุให้ใช้ | เสนอเฉพาะ attack roll ที่พลาดและ save ที่ไม่ผ่าน; initiative ฝั่งที่แพ้เหมือนเดิม; ไม่ถามซ้ำกับผลที่ทอยใหม่ | จำนวนจุดหยุดรอใน Replay ลดลง; ผู้เล่นทอยใหม่หา critical หลังโดนไม่ได้ |
| D-30 | ผู้เล่นเปลี่ยนใจกลาง Turn | playtest v0.1.5: Move แล้วเปลี่ยนใจไม่ได้ ต้องเริ่ม Battle ใหม่; ทอยลูกเต๋าแล้วย้อนไม่ได้ (กันเลือกผล) | Undo ถึงจุดปลอดภัย = ต้น Turn หรือหลัง action ล่าสุดที่ทอยลูกเต๋าหรือตอบการทอย แล้วแต่อันไหนมาทีหลัง เฉพาะฝั่งที่เล่นอยู่ใน Turn ตัวเอง | ผู้เล่นลองเดินได้ แต่ลูกเต๋าที่ทอยแล้วถาวร; Replay เก็บ Undo (ticket 06) |
| D-31 | ระยะ skill ไม่เข้ากับขนาด Board 7x7 | playtest v0.1.5: ระยะ 4 ถึงเกือบทุกช่อง ตำแหน่งไม่มีผล; ticket 08 วัด 3 ทางแยกกันและผสม (สุดท้ายผู้ใช้เลือกใช้ทั้งสาม) | ระยะสั้นลง (Long Shot, Element Bolt, Pin 3; Mark 4); disadvantage ที่ระยะ 4 ขึ้นไป; ภูเขาบัง line of sight พร้อมภูเขาเพิ่ม 4 ช่องต่อ Board | Turn ก่อนโจมตีครั้งแรกสูงขึ้นเล็กน้อยเฉพาะ Crossroads; Burst ที่ขอบพื้นที่อาจโดน disadvantage |

---

## 24. สิ่งที่เปลี่ยนจากแหล่งเดิม (สรุป)

| เรื่อง | แหล่งเดิม | ในเอกสารนี้ | เหตุผล |
|---|---|---|---|
| Command กับการป้องกัน Tamer | v4 ข้อ 5: หักล้างได้ | หักล้างไม่ได้ (§5.3, §16.3) | PRD F3/F5, DL (sim รอบ 4 variant U4) |
| ระยะเดินของ Tidewall | v2 C, kit: 3 | 2 ตามสูตรล้วน | DL 2026-10-14 |
| การป้องกัน Tamer | v2: ห้ามเล็งจากระยะ 2 ขึ้นไป + กัน Burst | disadvantage ทุกระยะ | v3, DL |
| ตัดสิน turn limit | v1: HP% | damage รวม | v4, DL |
| HP | v1: ไม่บวกตาม Star, Tamer 12 + VIT + Level | +3 × Star, Tamer 25 + 4 × (Level − 1) | v2, DL |
| Defend | v1: +4 | +2 | v3, DL |
| Shield Bash | v3: 1d8 | 2d6 | v4, DL |
| damage กายภาพระยะไกล | v1: POW | SEN ที่ระยะ 2 ขึ้นไป | v4, DL |
| Burst | v1: ทุกศัตรูในพื้นที่ | สูงสุด 2 ตัวที่เลือก | v4, DL |
| Command ขยับ | v1: +2 ใช้ได้ทุก Turn | +1, ไม่ใช้ใน Turn แรกของฝั่ง | v2, DL |
| Proficiency ของ Tamer | v1: ถึง Level 8 | เพิ่ม +4 ที่ Level 9–10 | PRD |
| Distract กับ line of sight | playtest เกม 1: ไม่ตรวจ | ตรวจ | ruling v2 |
| Tidewall loadout | v1: Shield Wall | Shield Bash | v3 |

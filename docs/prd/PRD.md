# PRD: Monster Tactics RPG (Web)

Oct 13, 2026 · @Jeje

## Overview

เกม web-based ที่ผู้เล่นเลี้ยงมอนสเตอร์ใน ranch ส่งออกผจญภัยแบบ campaign ที่ตัดสินด้วยลูกเต๋า แล้วสู้กันบนกระดาน grid แบบ tactics ชื่อ "Monster Tactics RPG" เป็น working title เท่านั้น

**Elevator pitch:** ผู้เล่นเป็น Tamer ที่ลงสนามพร้อมมอนของตัวเอง มอนสเตอร์ทุกตัวไม่ซ้ำกัน เกิดจาก seed ที่ผู้เล่นเลือก โตขึ้นตามวิธีที่ผู้เล่นเลี้ยง แก่และเกษียณจริง และส่งต่อมรดกให้รุ่นลูก ทุกการตัดสินใจบนกระดานมีความเสี่ยงจากลูกเต๋าที่ผู้เล่นเห็นโอกาสชัดเจน

| Pillar | ได้แรงบันดาลใจจาก | ความหมายในเกมนี้ |
| --- | --- | --- |
| Tactical board | Capsule Monster Coliseum | กระดาน grid, terrain ที่เพิ่มหรือลดพลังตามธาตุ, การวางตำแหน่งสำคัญกว่าพลังดิบ |
| Dice and narrative | D&D | stat 6 ค่า, d20 check, advantage/disadvantage, campaign ที่มีทางเลือกและผลลัพธ์ |
| Raising and legacy | Monster Rancher | สร้างมอนจาก seed, ตารางฝึกรายสัปดาห์, ความเหนื่อย/ความเครียด, อายุขัย, การผสมพันธุ์ |
| Tamer progression | RPG class system (D&D) | ตัวละครผู้เล่นลงสนามพร้อมมอน 2 ตัว มีอาชีพ skill และ level ที่ไม่หายข้ามรุ่นมอน |

หลักการออกแบบ: ทุก pillar ต้องป้อนกันและกัน การเลี้ยงกำหนด stat บนกระดาน ผลบนกระดานกำหนดเรื่องราวใน campaign และ campaign ให้ทรัพยากรกลับมาที่ ranch

ข้อควรระวังด้าน IP: ใช้ได้แค่ mechanic เป็นแรงบันดาลใจ ห้ามใช้ชื่อ ตัวละคร มอนสเตอร์ หรือ art ของทั้งสามแบรนด์

## Goals, non-goals, success metrics

เป้าหมายหลักคือ ผู้เล่นผูกพันกับมอนตัวเองพอที่จะกลับมาเลี้ยงต่อทุกสัปดาห์ ตัวเลข metric ด้านล่างเป็นค่าตั้งต้นที่ต้องปรับหลัง playtest

**Goals**

- เล่นได้ในเบราว์เซอร์ทั้ง desktop และมือถือ ไม่ต้องติดตั้ง
- หนึ่ง session จบได้ใน 10 ถึง 20 นาที (วางแผน 1 สัปดาห์ + สู้ 1 กระดาน)
- ทุกผลลัพธ์จากลูกเต๋าแสดงโอกาสสำเร็จก่อนผู้เล่นตัดสินใจ
- มอนสเตอร์สองตัวที่ seed ต่างกันต้องดูและเล่นต่างกันอย่างรู้สึกได้

**Non-goals (สำหรับ MVP)**

- PvP แบบ real-time
- ระบบซื้อขายมอนระหว่างผู้เล่น
- gacha หรือ loot box ที่ใช้เงินจริง
- Game Master มนุษย์ (ระบบ campaign ขับด้วย script)

| Metric | ค่าเป้าหมายตั้งต้น | วัดอะไร |
| --- | --- | --- |
| D7 retention | 25% | ความผูกพันกับมอน |
| Median session length | 15 นาที | ขนาด loop เหมาะสมไหม |
| มอนที่ถูกเลี้ยงจนเกษียณต่อผู้เล่น (30 วัน) | อย่างน้อย 1 ตัว | ระบบ lifespan/legacy ทำงาน |
| อัตราจบกระดาน (ไม่ quit กลางทาง) | 80% | ความยาวและความยากของ battle |

## Target users and personas

กลุ่มหลักคือผู้ใหญ่อายุ 25 ถึง 45 ที่โตมากับเกมเลี้ยงมอนยุค PS1/PS2 และยังชอบ tactics แต่มีเวลาเล่นวันละไม่มาก

| Persona | ต้องการอะไร | ความเสี่ยงถ้าออกแบบพลาด |
| --- | --- | --- |
| The Rancher | เลี้ยง ผสม เก็บสะสมมอนหายาก ชอบดูตัวเลข stat โต | ถ้า battle บังคับยากเกินไป จะเลิกเล่น |
| The Tactician | กระดานที่คิดลึก ใช้ terrain และ positioning | ถ้าลูกเต๋าสุ่มเกินไป จะรู้สึกว่าแพ้เพราะดวง |
| The Storyteller | campaign ที่มีทางเลือก ผลลัพธ์จำได้ | ถ้า narrative เป็นแค่ข้อความคั่น จะไม่ผูกพัน |
| The Casual Returner | เปิดมาเลี้ยง 5 นาทีแล้วปิด | ถ้าทุก action ต้องลง battle ยาว จะไม่กลับมา |

ข้อสรุปด้านการออกแบบ: ranch ต้องเล่นได้โดยไม่ต้องสู้ และ battle ต้องมีระดับความสุ่มที่ปรับได้ (Inspiration และ Tactician mode ดู F3)

## Core game loop

Loop สั้น (ranch, campaign, battle) วนทุก session ส่วน loop ยาว (เกษียณแล้วผสมเป็นรุ่นใหม่) วนตามจำนวนสัปดาห์ในเกม ไม่ผูกกับเวลาจริง

&#91;embedded content: core loop · 6 steps, 2 loops\]

Ranch คือศูนย์กลาง: ทุกผลจาก campaign และ battle กลับมาเป็นทรัพยากรสำหรับการเลี้ยง ส่วน Casual Returner เล่นแค่ในกล่อง Ranch ได้โดยไม่ต้องออกไปสู้

## Feature systems

มี 7 ระบบหลัก ทุกระบบใช้ stat ชุดเดียวกัน เพื่อให้การเลี้ยงส่งผลตรงกับการสู้และการผจญภัย

### F1. Shared stat model

ใช้ 6 stat แบบ D&D แต่ตีความใหม่ให้เข้ากับมอนสเตอร์ stat ละ 1 ถึง 30, modifier = (stat - 10) / 2 ปัดลง

| Stat | ใช้ใน battle | ใช้ใน campaign |
| --- | --- | --- |
| POW (Power) | ความแรงโจมตีกายภาพ | check ทำลาย ยก ดัน |
| AGI (Agility) | ระยะเดิน, หลบ, ลำดับ initiative | check ปีน หลบกับดัก |
| VIT (Vitality) | HP, save ต้านสถานะทางกาย (Bleed, Pin, Bound) | check อดทน อากาศเลวร้าย |
| INT (Intellect) | ความแรงสกิลธาตุ | check ไขปริศนา อ่านอักษรโบราณ |
| SEN (Sense) | ความแม่นยำ | check สังเกต ตามรอย |
| SPI (Spirit) | ต้านสกิลธาตุ (Ward), save ต้านสถานะทางจิต (Stun, Taunted, Weakened), ฟื้น stress | check ข่ม เจรจา ผูกมิตรมอนป่า |

ทุก check ใช้สูตร d20 + modifier + bonus อื่น เทียบกับ DC (Difficulty Class) Advantage = ทอย 2 ลูกเอาค่าสูง, Disadvantage = เอาค่าต่ำ

### F2. Ranch (raising and breeding)

Ranch เป็นหน้าหลักของเกม เวลาเดินเป็น "สัปดาห์" เมื่อผู้เล่นกดจบสัปดาห์เท่านั้น (ดู Time model) ไม่เดินตามเวลาจริง มอนไม่แก่ ไม่เหนื่อย และไม่ป่วยระหว่างที่ผู้เล่นไม่ได้เล่น

**Time model: วางแผนรายสัปดาห์ (ตัดสินแล้ว)** แต่ละสัปดาห์ ผู้เล่นสั่งงานมอนได้ตัวละ 1 อย่าง (ฝึก, พัก, promotion trial, ออก campaign) มอนที่ไม่ได้สั่งพักอัตโนมัติ แล้วกดจบสัปดาห์ มอนทุกตัวแก่พร้อมกัน 1 สัปดาห์ หนึ่ง session ปกติคือวางแผน 1 สัปดาห์ บวก battle ถ้ามี

**Roster (ตัดสินแล้ว)** เริ่มที่ 2 ช่อง ขยายด้วย facility ของ ranch ได้สูงสุด 4 ช่องใน MVP ปลดล็อก combine เมื่อมี 3 ช่องขึ้นไป เพื่อไม่ให้ combine แล้วเหลือมอนไม่พอจัดทีม ถ้า roster เต็ม การสร้างมอนจาก seed, การรับ share code และการรับมอนป่า ต้องปล่อยมอนตัวใดตัวหนึ่งก่อน มอนที่ปล่อยเข้า Hall of Fame ได้ Species mastery แต่ไม่ได้ Essence และ seed ที่ยังไม่ได้ใช้ยังไม่ถูกนับเป็นใช้แล้ว (ตัดสินแล้ว)

- **Monster generation from seed:** ผู้เล่นป้อน seed (ข้อความ, ชื่อเพลง, วันเกิด, หรือภาพที่อัปโหลด) ระบบ hash seed แล้ว map เป็น species, ธาตุ, stat cap, growth type, trait (จำนวนตาม rarity) และชิ้นส่วน sprite seed เดียวกันให้ species ธาตุ และหน้าตาเดียวกันเสมอ (rarity ดู F6) ไม่เก็บไฟล์ต้นฉบับ เก็บแค่ hash
- **Training:** เลือกกิจกรรมรายสัปดาห์ แต่ละอย่างเพิ่ม stat 1 ถึง 2 ค่า และเพิ่ม fatigue ผลการฝึกใช้ check: สำเร็จมาก (Great), สำเร็จ, ล้มเหลว
- **Fatigue และ Stress:** fatigue หายด้วยการพัก, stress สะสมยาวและลดอายุขัย ผู้เล่นต้องบาลานซ์ระหว่างฝึกหนักกับดูแล
- **Loyalty:** เพิ่มเมื่อชม ให้อาหารที่ชอบ ชนะการสู้ ลดเมื่อดุหรือบังคับฝึกตอนเหนื่อย Loyalty สูงทำให้มอนเชื่อฟังคำสั่งบนกระดาน
- **Lifespan:** มอนมีอายุขัยเป็นสัปดาห์ แบ่งเป็นช่วง Young, Prime, Veteran (ดู F7) stat ไม่ลดเมื่อแก่ เมื่อหมดอายุเกษียณเป็น "Hall of Fame" ให้ Essence และ Species mastery (ดู F7)
- **Combining (breeding):** ใช้มอน 2 ตัวสร้างตัวใหม่ พ่อแม่เกษียณทันที ลูกได้ stat cap บางส่วนและ trait สืบทอด (ดู F7) เป็นทางหลักในการทำมอนรุ่นถัดไปให้แกร่งกว่าเดิม

### F3. Tactical grid battle

กระดาน 7x7 (MVP) แบบ turn-based ทีมประกอบด้วย Tamer 1 คน + มอน 2 ตัว (ดู F5) รวมฝั่งละ 3 unit ถ้ามีมอนไม่พอ ลงสนามด้วยมอน 1 ตัวได้ เพื่อกันทางตัน

- **Team cost:** มอนแต่ละตัวมี cost เท่ากับ level ดาว (1 ถึง 8) ผลรวม cost ของมอน 2 ตัวในทีมต้องไม่เกิน Team cost cap ของ Tamer ซึ่งเพิ่มตาม level (ตัดสินแล้ว: cap = 2 + level ของ Tamer เช่น Lv 1 = 3 ใส่ได้แค่มอน 1 ดาวกับ 2 ดาว, Lv 10 ซึ่งเป็น cap ของ MVP = 12 ใส่มอน 8 ดาวได้คู่กับมอน 4 ดาว, มอน 8 ดาว 2 ตัวต้องใช้ Lv 14 ที่มากับ expansion มอนจาก seed เริ่มที่ 1 ถึง 2 ดาว ถ้าได้ 2 ดาวทั้งสองตัวตอนเริ่มเกม จะลงสนามได้ทีละตัวจนกว่า Tamer ถึง Lv 2 (cap 4) ซึ่งยอมรับได้โดยตั้งใจ) tournament แต่ละ rank และ campaign กำหนด cap ของตัวเองได้ ระบบนี้ผูกพลังของมอนกับความก้าวหน้าของ Tamer และกันไม่ให้มอนดาวสูงจาก combine ถูกใช้ก่อนที่ Tamer จะพร้อม
- **Terrain:** แต่ละช่องเป็นหนึ่งใน 6 ธาตุ (ป่า ภูเขา น้ำ ทะเลทราย มืด แสง) หรือช่องปกติที่ไม่มีธาตุ มอนที่ยืนบนธาตุที่ตรงกันได้ advantage ในการโจมตี ธาตุที่แพ้ทางได้ disadvantage
- **Element wheel:** ป่า > น้ำ > ภูเขา > ทะเลทราย > ป่า ส่วนแสงกับมืดต่างได้เปรียบกันและกัน และเป็นกลางกับธาตุอื่น (ตัดสินแล้ว) ผู้โจมตีที่ธาตุได้เปรียบได้ advantage ธาตุที่แพ้ทางได้ disadvantage Tamer ไม่มีธาตุ
- **Action economy:** แต่ละเทิร์นทุก unit มี Move + Action แบบ D&D มอนเลือกได้ระหว่างโจมตี สกิล หรือป้องกัน ส่วนการใช้ไอเทมเป็น Action ที่ Tamer ทำได้คนเดียว (ดู F5)
- **Attack resolution:** ใช้สูตรในหัวข้อ "สูตร HP, Guard และ damage" ด้านล่าง
- **Loyalty check:** มอนที่ loyalty ต่ำอาจไม่ทำตามคำสั่ง (ทอย SPI check)
- **Win condition:** ลด HP ของ Tamer ฝั่งตรงข้ามเป็น 0 หรือกำจัดมอนทั้งหมด ถ้าครบ 10 เทิร์นต่อฝั่งแล้วยังไม่จบ ฝั่งที่ทำ damage รวมได้มากกว่าชนะ (healing ไม่หักลบ, เท่ากันเสมอ) (ตัดสินแล้วหลัง simulation)
- **Transparency:** UI แสดง % โอกาสโดนและช่วง damage ก่อนยืนยันทุก action

**Turn structure: ฝั่งละเทิร์น (ตัดสินแล้ว)**

- ทอย initiative ครั้งเดียวตอนเริ่ม battle: d20 + AGI modifier สูงสุดในทีม ฝั่งที่ชนะเริ่มก่อน แล้วสลับฝั่งกันไปตลอด
- ในเทิร์นของฝั่งตัวเอง ทุก unit ได้ Move + Action ตามลำดับที่ผู้เล่นเลือก
- Command ของ Tamer มีผลกับมอนที่เล่นหลัง Tamer ในเทิร์นเดียวกัน
- กัน alpha strike: ฝั่งที่เริ่มก่อน ในเทิร์นแรกเล่นได้แค่ 2 จาก 3 unit (ตัดสินแล้ว)

**กฎการซ้อนผล**

- Advantage หลายแหล่ง (terrain, ธาตุ, skill) ไม่ซ้อนกัน และถ้ามีทั้ง advantage กับ disadvantage จะหักล้างกันแบบ D&D ยกเว้น disadvantage จากการป้องกัน Tamer ที่ advantage จาก Command หักล้างไม่ได้ (ดู F5)
- โบนัสตัวเลข เช่น Veteran bonus +1 หรือ Pack Howl +1 บวกซ้อนกันได้ตามปกติ จึงต้องคุมให้เล็ก

**สูตร HP, Guard และ damage (ตัดสินแล้ว)**

เป้า: มอนรับการโจมตีที่โดนได้ประมาณ 3 ถึง 4 ครั้ง กระดานจบในประมาณ 5 ถึง 6 เทิร์นต่อฝั่ง

| ค่า | สูตร |
| --- | --- |
| HP มอน | (10 + VIT) x ตัวคูณ (หนัก 1.2, เบา 0.8) ปัดลง + 3 x ดาว |
| HP Tamer | 25 + 4 x (Lv - 1) |
| Guard (หลบกายภาพ) | 10 + AGI mod |
| Ward (ต้านธาตุ) | 10 + SPI mod |
| Proficiency | มอน = ดาว / 2 ปัดขึ้น, Tamer = +2 (Lv 1 ถึง 4), +3 (Lv 5 ถึง 8), +4 (Lv 9 ถึง 10) |
| Attack roll | d20 + SEN mod + proficiency เทียบกับ Guard หรือ Ward |
| Damage กายภาพ | dice ของ skill + POW mod ที่ระยะ 1, SEN mod ที่ระยะ 2 ขึ้นไป |
| Damage ธาตุ | dice ของ skill + INT mod |

- โจมตีปกติ 1d8 ส่วน skill ใช้ 1d6 ถึง 2d8
- ทอยได้ 20 เป็น critical ทอย dice ของ damage 2 เท่า ทอยได้ 1 พลาดเสมอ
- Action ป้องกัน: Guard และ Ward +2 จนถึงเทิร์นถัดไป (ลดจาก +4 เพื่อลดเกมยื้อเวลา)
- ผล simulation 4 รอบ (2,000 เกมต่อ config): มอนรับการโจมตีที่โดนได้ประมาณ 3 ครั้ง Tidewall และ Tamer ประมาณ 4 ถึง 5 ครั้ง เทิร์นต่อฝั่ง 6 ถึง 7 (รายละเอียดใน Prototype kit)
- Tamer HP สูตรเดิม (12 + VIT + level) ล้มเร็วเกินไปใน simulation จึงเปลี่ยนเป็น 25 + 4 x (Lv - 1)

**ระยะ การเดิน และการมองเห็น (ตัดสินแล้ว)**

- วัดระยะแบบ 8 ทิศ ช่องทแยงนับเป็น 1 ช่อง ใช้ทั้งการเดินและระยะโจมตี
- ระยะเดิน = 3 + AGI mod / 4 ปัดเข้าหาศูนย์ แบบเบา +1 แบบหนัก -1 ต่ำสุด 2 ช่อง
- ระยะโจมตี: Melee 1 ช่อง, Reach 2, Ranged 3 ถึง 4, Long 5 ถึง 6
- เดินผ่าน unit อื่นไม่ได้ ยกเว้น Flying
- ไม่มี fog of war ทุกฝั่งเห็นกระดานทั้งหมด
- สถานะ "ซ่อน": unit ที่ซ่อนอยู่ถูกเล็งจากระยะ 2 ช่องขึ้นไปไม่ได้
- Line of sight: unit ที่อยู่บนเส้นตรงระหว่างผู้โจมตีกับเป้าหมายบังการโจมตีระยะไกล ยกเว้นเมื่อผู้โจมตีเป็น Flying (เป้าที่เป็น Flying ยังถูกบังได้) ใช้กับทุก skill ที่เล็งศัตรูจากระยะ 2 ขึ้นไป รวม skill แบบ save และ Burst ตรวจไปที่ช่องกลาง
- หมายเหตุ tuning: เมื่อใช้ 8 ทิศ ระยะทแยงของกระดาน 7x7 สูงสุดแค่ 6 ช่อง ระยะ Long และระยะเดินสูงสุดจึงครอบคลุมเกือบทั้งกระดาน ถ้า paper prototype พบว่าตำแหน่งไม่มีผล ให้ลดระยะทุกหมวดลง 1

**Status effects (ตัดสินแล้ว)**

| สถานะ | ประเภท | ผล | ระยะเวลา | Save | มาจาก |
| --- | --- | --- | --- | --- | --- |
| Bleed | ลบ | เสีย HP 1d4 ต้นเทิร์น | 3 เทิร์น | VIT | Rend |
| Pin | ลบ | เดินไม่ได้ แต่ยังโจมตีได้ | 1 | VIT | Pin |
| Bound | ลบ | ทั้งเป้าและผู้ล็อกเดินไม่ได้ เป้าโจมตีได้เฉพาะผู้ล็อก | จนผู้ล็อกขยับหรือติด Stun | VIT ทุกเทิร์น | Constrict |
| Stun | ลบ | เสียทั้ง Move และ Action | 1 | SPI | Overload (ติดตัวเองโดยไม่มี save) |
| Taunted | ลบ | ต้องโจมตีผู้ taunt ถ้าอยู่ในระยะ | 1 | SPI | Taunt |
| Weakened | ลบ | damage -2 | 2 | SPI | Hex |
| Marked | ลบ | ผู้โจมตีทุกตัวได้ advantage | 1 | ไม่มี (ต้องโจมตีโดนก่อน) | Mark |
| Off-balance | ลบ | การโจมตีครั้งถัดไปได้ disadvantage | ถึงการโจมตีครั้งถัดไป | ไม่มี | Feint, Distract (Basic Tamer) |
| Hidden | บวก | ถูกเล็งจากระยะ 2 ช่องขึ้นไปไม่ได้ หลุดเมื่อโจมตี หรือเมื่อเงื่อนไขของ skill ที่ให้สถานะสิ้นสุด (Camouflage: ออกจากช่องป่า, Silent Swoop: ถึงเทิร์นถัดไป) | จนกว่าจะหลุด |  | Camouflage, Silent Swoop |
| Blessed | บวก | advantage ในการโจมตีหรือ save ครั้งถัดไป | 1 |  | Bless, Scout |
| Empowered | บวก | damage กายภาพ +2 | 2 |  | Rally Roar |
| Guarded | บวก | Guard หรือ Ward เพิ่มขึ้น | ถึงเทิร์นถัดไปของตัวเอง |  | Defend, Evade Stance, Mana Shield, Shield Wall |
| Linked | บวก | damage ที่ได้รับแบ่งครึ่งกับคู่ที่ link | 2 |  | Spirit Link |
| Countering | บวก | ถ้าโดนโจมตีจากระยะ 1 โจมตีกลับ 1 ครั้ง (กายภาพ 1d8, 2d8 ถ้ามี Pincer Guard) | ถึงเทิร์นถัดไปของตัวเอง |  | Counter |
| Rallied | บวก | +1 attack roll | 2 |  | Pack Howl |

- Save DC = 8 + proficiency ของผู้ใช้ + mod ของ stat ที่ skill ใช้ ผู้ถูกเล็งทอย d20 + mod ของ stat ที่ใช้ save ได้ไม่ต่ำกว่า DC ไม่ติดสถานะ
- สถานะเดียวกันไม่ซ้อน ติดซ้ำรีเซ็ตระยะเวลา
- ระยะเวลานับเมื่อจบเทิร์นของฝั่งที่ติดสถานะ
- Cleanse ล้างสถานะลบทั้งหมดให้เป้า Shed Skin ล้างให้ตัวเอง
- ผลทันที (ผลักเป้าจาก Gust และ Charge, ใช้ skill ซ้ำจาก Echo) ไม่นับเป็นสถานะ
- UI แสดงสถานะเป็นไอคอนบน unit แตะเพื่อดูรายละเอียด

**ความสุ่ม: Inspiration + Tactician mode (ตัดสินแล้ว)**

- Inspiration (ค่าเริ่มต้น): ทุกฝั่งได้ 1 Inspiration ต่อ battle ใช้ทอยใหม่ได้ 1 ครั้งกับการทอยของฝั่งตัวเอง
- Tactician mode (ตัวเลือกใน settings): เปลี่ยน d20 เป็น 2d10 และใช้ damage เป็นค่าเฉลี่ยของ dice ใช้กับทั้งฝั่งผู้เล่นและ AI
- ใน Tactician mode ผลรวม 20 ยังเป็น critical และผลรวม 2 ยังพลาดเสมอ ซึ่งเกิดแค่อย่างละ 1% โดยตั้งใจ
- ถ้ามี async PvP ในอนาคต ทั้งสองฝั่งต้องใช้โหมดเดียวกัน

**Skill tier และ cooldown (ตัดสินแล้ว)**

| Tier | Cooldown | ใช้กับ |
| --- | --- | --- |
| Minor | ไม่มี ใช้ได้ทุกเทิร์น | โจมตีปกติ และ skill พื้นฐาน |
| Major | 2 เทิร์น | skill หลักของบทบาท |
| Signature | 1 ครั้งต่อ battle | signature skill ของ Legendary และ skill ที่แรงมากอย่าง Overload |

- basic skill ของ Tamer ใช้ tier เดียวกัน
- Passive ไม่มี cooldown และไม่ใช้ Action แต่นับเป็น 1 ช่อง skill
- UI แสดง cooldown เป็นตัวเลขบนไอคอน skill

**Deployment phase (ตัดสินแล้ว)**

- ทุกกระดานเริ่มด้วย deployment phase ก่อนเทิร์นแรก ผู้เล่นเห็น terrain ทั้งกระดานแล้ว
- แต่ละฝั่งวาง Tamer และมอน 2 ตัวในโซนเริ่มของตัวเอง คือ 2 แถวหลัง (14 ช่อง)
- วางพร้อมกันแบบปิด แล้วเปิดเผยพร้อมกัน เพื่อไม่ให้ฝั่งที่วางทีหลังได้เปรียบ (ตอนสู้กับ AI ให้ AI วางก่อนแบบซ่อนไว้)
- เวลาวางแนะนำ 30 วินาที หรือไม่จำกัดในโหมด campaign
- campaign หรือ event บางอันบังคับโซนวางได้ เช่น ถูกซุ่มโจมตี โซนเริ่มเหลือแถวเดียว

ลำดับการเตรียมก่อนสู้: เลือกทีมภายใต้ Team cost cap, deployment phase แล้วจึงเริ่มเทิร์นแรก

### F4. Campaign layer (D&D adventure)

Campaign เป็นแผนที่แบบ node Tamer พามอน 2 ตัวออกเดินทาง ใช้เวลา ranch หลายสัปดาห์ ระหว่างนั้นมอนที่อยู่ ranch พักอัตโนมัติ

- **Node types:** Encounter (เข้า battle), Event (ทางเลือก + skill check), Rest (ฟื้น HP แลก stress), Shop, Boss
- **Skill checks นอก combat:** เลือก Tamer หรือมอนตัวไหนทำ check ใช้ stat ของตัวนั้น (Tamer ได้ proficiency ใน check ที่อาชีพถนัด) ทำให้ทีมหลากหลายมีค่ากว่าทีมแรงด้านเดียว
- **Branching and consequences:** ทางเลือกตั้ง flag ที่ส่งผลกับ node ถัดไปหรือ campaign ถัดไป
- **Wild monster recruit:** บาง event ให้ทอย SPI check เพื่อผูกมิตรมอนป่า มอนที่ได้ใช้ seed ที่ระบบสร้างจาก event ไม่กินโควตา seed ของ account, rarity คิดแบบ Hybrid ตามคู่ account กับ seed และแชร์ไม่ได้ (ตัดสินแล้ว)
- **Narrator:** ข้อความเล่าเรื่องเขียนด้วยมือ (MVP) Option สำหรับเฟสหลังคือใช้ LLM ช่วยสร้าง flavor text ภายใต้ template ที่ล็อกผลลัพธ์ไว้

**แพ้ใน campaign (ตัดสินแล้ว)** ถ้า Tamer HP เป็น 0 ใน battle ของ campaign run จะจบทันที กลับ ranch พร้อม Gold ที่เก็บมาครึ่งหนึ่ง มอนที่ไปด้วยได้ stress และ fatigue ไม่มีการตายถาวร และสัปดาห์ที่ใช้ไปนับตามจริง

### F5. Tamer (player character)

ผู้เล่นมีตัวละครของตัวเองเรียกว่า Tamer ลงสนามพร้อมมอน 2 ตัว มีอาชีพและ skill แบบ RPG และไม่แก่ จึงเป็นเส้นความก้าวหน้าที่ต่อเนื่องข้ามรุ่นมอน

**บทบาทบนกระดาน**

- Tamer คือ unit หลักของทีม: Tamer HP เป็น 0 = แพ้กระดาน (ไม่มี permadeath) การป้องกัน: ถ้ามีมอนฝ่ายเดียวกันยืนติดกับ Tamer การโจมตีของศัตรูที่ใส่ Tamer ได้ disadvantage ทุกระยะ และ advantage จาก Command หักล้าง disadvantage นี้ไม่ได้ (ตัดสินแล้วหลัง simulation)
- Tamer เดินและใช้ action ได้เหมือนมอน บวกกับเป็น unit เดียวที่ใช้ไอเทมได้ (ใช้ Action ของเทิร์น เป้าหมายต้องอยู่ในระยะของไอเทม) และมี **Command action** พิเศษ 1 ครั้งต่อเทิร์น: สั่งมอนในระยะ 3 ช่อง (ตัดสินแล้ว)ให้ได้ advantage, ขยับเพิ่ม +1 ช่อง, หรือผ่าน loyalty check อัตโนมัติ ไม่ใช้ Action ของ Tamer สั่งได้ทุกจังหวะของ Tamer แต่ใช้ไม่ได้ในเทิร์นแรกของฝั่ง (กัน alpha strike)
- ความเสี่ยงเชิงกลยุทธ์: Tamer ต้องอยู่ใกล้มอนเพื่อ Command แต่ยิ่งใกล้แนวหน้ายิ่งเสี่ยงแพ้
- Power budget: Tamer แรงน้อยกว่ามอนในทีมเดียวกัน บทบาทหลักคือ support และ command ไม่ใช่ตัวทำ damage โจมตีปกติของ Tamer ใช้ 1d6

**Stat และ level**

- ใช้ 6 stat ชุดเดียวกับมอน (F1) เพื่อให้ check ทุกแบบใช้สูตรเดียวกัน
- Level 1 ถึง 20 แบบ D&D (MVP เปิดถึง 10) ได้ XP จาก battle, campaign, และการเลี้ยงมอนจนเกษียณ
- Proficiency bonus ตาม level (+2 ที่ Lv 1 ถึง 4, +3 ที่ Lv 5 ถึง 8, +4 ที่ Lv 9 ถึง 10) ใช้กับ attack roll, save DC และ check ที่อาชีพถนัด
- Gear 3 ช่อง: weapon, armor, charm และ Team cost cap เพิ่มตาม level (ดู F3)

**อาชีพ (class)**

| Class | แรงบันดาลใจ D&D | บนกระดาน | นอกกระดาน |
| --- | --- | --- | --- |
| Beastwarden | Fighter / Ranger | แนวหน้า, รับ damage แทนมอน, taunt | เพิ่มผลการฝึก POW/VIT |
| Rune Caller | Wizard | เปลี่ยนธาตุของช่อง terrain, เวทธาตุ | check INT ใน campaign ได้ proficiency |
| Mender | Cleric | heal, ล้างสถานะผิดปกติ | ลด stress มอนที่ ranch, เพิ่มอายุขัยเล็กน้อย |
| Trickster | Rogue / Bard | debuff, มอบ advantage, ระยะ Command +1 ช่อง | เพิ่มโอกาสผูกมิตรมอนป่า, ส่วนลดร้านค้า |

**Skill progression**

Tamer เติบโตเป็น 3 tier ทุกคนเริ่มเป็น Basic Tamer ที่เหมือนกัน เพื่อให้ลองทุกสายก่อนเลือก และให้ช่วงต้นเกมบาลานซ์จากค่า power เดียว

&#91;embedded content: Tamer hierarchy · 3 tiers, 4 classes\]

- **Basic Tamer (Lv 1 ถึง 4):** basic skill 1 อย่างต่อสาย ได้แก่ Cover (รับ damage แทนมอนข้างตัว ชื่อเดิม Guard เปลี่ยนเพื่อไม่ให้ซ้ำกับค่า Guard), Attune (เปลี่ยนธาตุช่องข้างตัว 1 ช่อง), First Aid (heal เล็กน้อย), Distract (ศัตรู 1 ตัวโจมตีแบบ disadvantage)
- **Class (Lv 5 ถึง 10):** เลือก 1 ใน 4 อาชีพ basic skill ของสายที่เลือกอัปเกรด ส่วนสายอื่นยังใช้ได้แต่ไม่อัปเกรด ทุก 2 level เลือก skill 1 จาก 2 ถึง 3 ตัวเลือก
- **Specialization (Lv 11 ถึง 20):** 2 ทางต่ออาชีพ พร้อม feat แบบ D&D มากับ expansion แรก (MVP level cap 10)
- เปลี่ยนอาชีพ (respec) ได้ที่ ranch โดยเสีย Gold

**Specialization: มากับ expansion**

| Option | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| MVP level cap 10, Specialization มากับ expansion แรก | scope MVP เล็ก, expansion มีเหตุผลให้ซื้อ, สอดคล้องกับ Free + expansion | ผู้เล่นสายหนักตัน level เร็ว |
| Specialization ครบใน MVP | progression ยาวตั้งแต่วันแรก | 8 สายต้องบาลานซ์และวาด sprite เพิ่ม |

ตัดสินแล้ว: MVP level cap 10, Specialization มากับ expansion แรก

### F6. Social (multiplayer ระดับ 1)

MVP มี multiplayer เฉพาะระดับ social คือดูของกันและแชร์มอนผ่าน share code ไม่มีการสู้หรือแลกเปลี่ยนระหว่างผู้เล่น

**ฟีเจอร์**

- **Public profile:** Tamer, roster ปัจจุบัน, Hall of Fame เป็น snapshot ที่อัปโหลดจาก save local
- **Friend list:** เพิ่มเพื่อนด้วย friend code
- **Share code:** แชร์ "สูตร" ของมอน ผู้รับได้มอนตัวเดียวกันในสถานะเริ่มต้น ไม่ได้ stat ที่ฝึกแล้วหรือ trait จากการผสม

**Rarity และ share limit** (ค่าตั้งต้น ปรับหลัง playtest)

| Rarity | โอกาสเกิดจาก seed | แชร์ได้ต่อมอนต้นฉบับ |
| --- | --- | --- |
| Common | 60% | ไม่จำกัด |
| Uncommon | 25% | 10 ครั้ง |
| Rare | 10% | 5 ครั้ง |
| Epic | 4% | 2 ครั้ง |
| Legendary | 1% | 1 ครั้ง |

- โควตานับต่อมอนต้นฉบับ มอนที่ได้มาจาก share code แชร์ต่อไม่ได้ เพื่อกันการแชร์ต่อเป็นทอดๆ
- Share code ที่ไม่มีคนใช้ภายใน 7 วันจะหมดอายุและคืนโควตา
- Server เป็นตัวนับโควตาและออก code ส่วน client ไม่ได้นับเอง ก่อนออก code server คำนวณ rarity ใหม่จาก seed\_hash กับ account id เพื่อกันการแก้ save local ให้มอนแรร์ขึ้น

**Seed ที่เป็นข้อความเปิด**

ถ้า seed เดียวกันให้มอนเหมือนกันทุกคน ผู้เล่นจะบอกข้อความ seed กันตรงๆ ได้โดยไม่ผ่าน share code แล้ว limit ก็ไม่มีผล

| Option | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| Universal seed (แบบเดิม) | ได้ความรู้สึกแบบ Monster Rancher ที่ชุมชนแชร์ seed กันได้ | บังคับ limit ไม่ได้ |
| Seed ผูก account (hash seed ร่วมกับ account id) | บังคับ limit ได้ 100% | seed เดียวกันได้มอนต่างกันในแต่ละคน ความสนุกแบบชุมชนหายไป |
| Hybrid: seed กำหนด species ธาตุ และหน้าตาร่วมกันทุกคน แต่ผลทอย rarity ผูกกับ account | ชุมชนยังแชร์ seed ได้ และ rare variant หายากจริง แชร์ได้ทางเดียวคือ share code | ต้องอธิบายให้ผู้เล่นเข้าใจว่าทำไม seed เดียวกันได้ rarity ต่างกัน |

ตัดสินแล้ว: Hybrid โดยผลทอย rarity คงที่ต่อคู่ account กับ seed เพื่อกันการกดสร้างซ้ำหาของแรร์

**กฎ seed ต่อ account: ใช้ได้ครั้งเดียว (ตัดสินแล้ว)**

- seed แต่ละอันสร้างมอนได้ครั้งเดียวต่อ account ทุก rarity
- Server เก็บ seed\_hash ที่ใช้แล้วของแต่ละ account โดยไม่เก็บข้อความ seed ดังนั้นการสร้างมอนจาก seed ต้องออนไลน์ ส่วนการเลี้ยงและการสู้เล่น offline ได้
- ถ้าป้อน seed ที่เคยใช้แล้ว ระบบจะแจ้งว่าใช้ไปแล้ว และพาไปดูมอนตัวนั้นใน roster หรือ Hall of Fame
- มอนที่ได้รับจาก share code ไม่นับเป็นการใช้ seed ของผู้รับ
- มอนที่เกิดจาก combine (Inherit และ Hybrid) และจาก wild recruit แชร์ไม่ได้ เพราะไม่มี seed ให้ server ตรวจ rarity และเพื่อให้ Hybrid เป็นของที่ต้องได้มาด้วยการเลี้ยงเท่านั้น (ตัดสินแล้ว)
- มอนที่เกษียณแล้วสร้างใหม่ไม่ได้ ลักษณะของมันส่งต่อได้ทางเดียวคือ combine ก่อนหมดอายุขัย
- ผลที่ได้: seed กลายเป็นทรัพยากรจำกัด ผู้เล่นจะคิดก่อนใช้ seed ที่มีความหมายกับตัวเอง
- ความเสี่ยง: ผู้เล่นอาจเสียใจเมื่อมอนจาก seed สำคัญเกษียณ ลดผลกระทบด้วย Hall of Fame, lineage และการเตือนล่วงหน้าก่อนเกษียณ

### F7. Monster design

รวมกฎทั้งหมดของมอนไว้ในที่เดียว ส่วน F2 (การเลี้ยง), F3 (การสู้) และ F6 (การแชร์) อ้างอิงจากส่วนนี้

**Rarity: ความหลากหลาย ไม่ใช่พลังดิบ (ตัดสินแล้ว)**

มอนทุก rarity โตไปถึง 8 ดาวได้ และ rarity ไม่มีผลกับ stat cap ซึ่งมาจาก seed rarity กำหนดแค่จำนวน trait และช่อง skill ทำให้ Common ยังใช้ได้ถึงปลายเกม และ seed ที่ใช้ได้ครั้งเดียวไม่สูญเปล่า

| Rarity | Trait ติดตัว | ช่อง skill | พิเศษ |
| --- | --- | --- | --- |
| Common | 1 | 3 | ไม่มี |
| Uncommon | 2 | 3 | ไม่มี |
| Rare | 2 | 4 | ไม่มี |
| Epic | 3 | 4 | ไม่มี |
| Legendary | 3 | 4 | signature skill เฉพาะ species |

ตัวเลขในตารางเป็นค่าตั้งต้น ต้องปรับหลัง playtest

**Star progression: ตัวเดียวทำได้ แต่ทางปกติคือข้ามรุ่น (ตัดสินแล้ว)**

- มอนที่สร้างจาก seed เริ่มที่ 1 ถึง 2 ดาว ตรงกับ Team cost cap ของ Tamer Lv 1
- มอนตัวเดียวไปถึง 8 ดาวได้ภายในอายุขัย ถ้าเลี้ยงได้ดีมาก (ฝึกตรงจุดแข็ง และคุม stress ต่ำตลอด)
- ทางปกติคือข้ามรุ่น ลูกที่ได้จาก combine เริ่มด้วยโบนัสดาว ค่าตั้งต้นคือ ดาวเริ่มของลูก = (ดาวพ่อ + ดาวแม่) / 4 ปัดลง ต่ำสุด 1 สูงสุด 4
- เป้าการบาลานซ์: มอนรุ่นแรกที่เลี้ยงตามปกติไปถึงประมาณ 4 ถึง 5 ดาว และรุ่นที่ 2 ถึง 3 ไปถึง 8 ดาว

**วิธีเลื่อนดาว: stat threshold + promotion trial (ตัดสินแล้ว)**

- ผลรวม stat ถึงเกณฑ์ของดาวถัดไปจึงปลดล็อก trial (ค่าเกณฑ์รอ tuning)
- ผู้เล่นเลือกแบบของ trial ได้ แบบ Battle คือสู้กับคู่แข่งภายใต้ Team cost ปกติ แบบ Skill check คือ check 3 ครั้งด้วย stat ของมอนเอง DC ตามดาว ผ่าน 2 ใน 3
- ทั้งสองแบบให้ผลเลื่อนดาวเท่ากัน แบบ Battle ได้ Gold และ XP ของ Tamer เพิ่มเป็นแรงจูงใจ แต่ไม่บังคับ
- Trial ใช้ 1 สัปดาห์ในเกม ถ้าไม่ผ่านจะเสียสัปดาห์นั้นและได้ fatigue แต่ไม่ลดดาว และลองใหม่ได้
- Tournament rank ไม่ใช่ด่านบังคับ เป็นแหล่ง Gold, ไอเทม, XP ของ Tamer และ legacy rank

**Skill: เรียนจากการฝึก + สืบทอดจาก combine (ตัดสินแล้ว)**

- skill pool ของแต่ละ species = skill กลางของบทบาท 4 skill (ใช้ร่วมกับอีก species ในบทบาทเดียวกัน) + skill เฉพาะ species 2 skill รวม MVP ประมาณ 48 skill บวก signature skill ของ Legendary อีก 1 ต่อ species และ 1 ต่อ hybrid (รวมประมาณ 16 ถึง 18) Hybrid ใช้ skill กลางของบทบาทใดบทบาทหนึ่งของพ่อแม่ บวก skill เฉพาะของตัวเอง 2 skill
- กิจกรรมฝึกแต่ละอย่างผูกกับ skill บางตัวใน pool ถ้าผลการฝึกเป็น Great และ stat ถึงเงื่อนไข มอนจะเรียน skill นั้นได้
- UI ของการฝึกบอกชัดว่ากิจกรรมไหนสอน skill อะไร และต้องมี stat เท่าไร
- ช่อง skill มีจำกัด (3 หรือ 4 ตาม rarity) ถ้าเต็มต้องเลือกแทนที่ skill เดิม และ skill ที่ลืมไปแล้วเรียนใหม่ได้
- ลูกจาก combine เลือกรับ skill ของพ่อหรือแม่ได้ 1 skill แม้อยู่นอก pool ของ species ตัวเอง และนับรวมในช่องปกติ
- Skill ที่สืบทอดมาส่งต่อรุ่นถัดไปได้ ทำให้ lineage สร้าง combo เฉพาะสายได้
- Signature skill ของ Legendary สืบทอดไม่ได้
- Skill ที่สืบทอดใช้ stat ของลูก ถ้าธาตุของ skill ไม่ตรงกับธาตุของลูก จะไม่ได้โบนัสธาตุเดียวกัน

**Growth และ aging (ตัดสินแล้ว)**

อายุขัยแบ่งเป็น 3 ช่วง คือ Young, Prime และ Veteran seed กำหนด growth type ซึ่งเป็นตัวบอกว่าแต่ละช่วงยาวแค่ไหน

| Growth type | Young | Prime | Veteran | สไตล์ |
| --- | --- | --- | --- | --- |
| Early | สั้น | เริ่มเร็ว สั้นกว่า | ยาว | ใช้งานได้เร็ว เหมาะช่วงต้นเกม |
| Normal | กลาง | กลาง | กลาง | สมดุล |
| Late | ยาว | เริ่มช้า ยาวกว่า และผลฝึกสูงกว่า | สั้น | ลงทุนนาน แต่ผลตอบแทนสูง |

ช่วง Veteran:

- Stat ไม่ลดลง
- ผลการฝึกลดลง และ fatigue สะสมเร็วขึ้น จึงโตต่อได้ยาก
- ได้ Veteran bonus บนกระดาน: unit ฝ่ายเดียวกันในระยะ 1 ช่องได้ +1 ใน attack roll (ค่าตั้งต้น)
- แลกกับ HP สูงสุดที่ลดลง 15% (ค่าตั้งต้น)
- ยังทำ promotion trial ได้ ถ้า stat ถึงเกณฑ์

**Combine: พ่อแม่ถูกใช้ไป (ตัดสินแล้ว)**

- ใช้มอนที่ยังมีชีวิต 2 ตัวสร้างลูก 1 ตัว พ่อแม่เกษียณเข้า Hall of Fame ทันที ปลดล็อกเมื่อ roster มี 3 ช่องขึ้นไป
- มอนที่หมดอายุขัยไปเองเป็นพ่อแม่ไม่ได้ ช่วง Veteran จึงเป็นจุดตัดสินใจว่าจะใช้สู้ต่อ หรือ combine เพื่อส่งต่อสายเลือด
- ระบบเตือนล่วงหน้าก่อนหมดอายุขัย เพื่อไม่ให้ผู้เล่นพลาดโอกาส combine
- ต้นทุน: ใช้ Gold พ่อแม่ที่เกษียณผ่าน combine ไม่ให้ Essence เพราะคุณค่าของมันส่งต่อไปที่ลูกแล้ว (ตัดสินแล้ว)
- มอนที่หมดอายุขัยไปเองให้ Essence ส่วน Species mastery ได้จากมอนทุกตัวที่เข้า Hall of Fame
- ลูกไม่ใช้ seed ใหม่ จึงไม่กินโควตา seed ของ account
- ลูกได้: ดาวเริ่มต้นตามสูตร star progression, skill สืบทอด 1 skill, stat cap และ trait ตามสูตรการสืบทอดด้านล่าง

**Hall of Fame และ legacy bonus (ตัดสินแล้ว)**

- มอนทุกตัวที่เข้า Hall of Fame ทั้งที่หมดอายุขัยเองและที่ผ่าน combine เพิ่ม Species mastery ให้ species ของมัน
- Species mastery ทำให้มอน species นั้นตัวต่อๆ ไปได้ผลการฝึกดีขึ้นเล็กน้อย มีเพดาน (อัตรารอ tuning)
- Tamer ได้ XP ทุกครั้งที่มีมอนเข้า Hall of Fame
- Essence ให้เฉพาะมอนที่หมดอายุขัยเอง

**ผลของ combine: สุ่มระหว่าง Inherit กับ Hybrid (ตัดสินแล้ว)**

| ผล | Species ของลูก | Rarity ของลูก | เกิดเมื่อ |
| --- | --- | --- | --- |
| Inherit | species หลักจากพ่อหรือแม่ฝ่ายใดฝ่ายหนึ่ง บวกลักษณะรองจากอีกฝ่าย (ชิ้นส่วน sprite, palette, ธาตุรอง) | สุ่มจาก Common ถึง Epic | ทุกคู่ |
| Hybrid | species พิเศษที่หาจาก seed ไม่ได้ | Epic หรือ Legendary เท่านั้น | เฉพาะคู่ species ที่อยู่ในตารางผสม |

- คู่ที่ไม่อยู่ในตารางผสมได้ผลแบบ Inherit เสมอ
- คู่ที่อยู่ในตารางมีโอกาสได้ Hybrid เฉพาะเมื่อพ่อแม่ทั้งคู่มี 6 ดาวขึ้นไป โอกาสคิดจากดาวของฝ่ายที่ต่ำกว่า: 6 ดาว = 10%, 7 ดาว = 12.5%, 8 ดาวทั้งคู่ = 15% (สูงสุด) ต่ำกว่า 6 ดาวได้ Inherit เสมอ
- Hybrid ที่ได้ Legendary ต้องมี signature skill ของตัวเอง
- ผล combine กำหนดจากคู่พ่อแม่และ account แบบ deterministic จึงโหลด save ใหม่เพื่อสุ่มซ้ำไม่ได้
- ตารางผสมเป็นความลับ ช่องที่ยังไม่ค้นพบแสดงเป็น ??? ใน recipe book
- MVP มีตารางผสมขนาดเล็ก ค่าตั้งต้น 4 ถึง 6 hybrid species ส่วน expansion เพิ่ม hybrid ใหม่
- แหล่งของมอนแรร์: Epic มาได้จาก seed (4%), Inherit และ Hybrid ส่วน Legendary มาได้จาก seed (1%) และ Hybrid เท่านั้น Hybrid ต้องใช้พ่อแม่ 6 ดาวขึ้นไป ซึ่งตามเป้าบาลานซ์คือรุ่นที่ 2 ขึ้นไป จึงเป็น content ช่วงปลายของ MVP

**สูตรการสืบทอด (ตัดสินแล้ว)**

Stat cap ใช้ stat ที่ฝึกได้จริงของพ่อแม่ เพื่อให้การเลี้ยงรุ่นนี้กำหนดรุ่นถัดไปโดยตรง ทำทีละ stat:

```latex
\text{cap}_{\text{ลูก}} = \min\left(30,\ \max\left(\text{base}_{\text{species ลูก}},\ \frac{\text{cap}_{\text{พ่อ}} + \text{cap}_{\text{แม่}}}{2}\right) + \min\left(5,\ \left\lfloor 0.15 \times \frac{\text{stat}_{\text{พ่อ}} + \text{stat}_{\text{แม่}}}{2} \right\rfloor\right)\right)
```

- ใช้ค่าเฉลี่ย cap ของพ่อแม่เป็นฐาน เพื่อให้โบนัสสะสมข้ามรุ่น แต่ไม่ต่ำกว่า cap พื้นฐานของ species ลูก เพื่อไม่ให้พ่อแม่ต่างบทบาทดึง stat หลักของลูกลง
- โบนัสคิดจาก stat จริง ณ ตอน combine ไม่เกิน +5 ต่อ stat ต่อรุ่น และ cap ไม่เกิน 30
- ตัวอย่าง POW: รุ่นแรก cap 22 ฝึกได้ 20, คู่ cap 18 ฝึกได้ 16 ลูกได้ max(22, 20) + 2 = 24 รุ่นถัดไปทำแบบเดียวกันจะได้ประมาณ 27 และรุ่นที่ 3 แตะ 30 ตรงกับเป้าที่ว่ารุ่นที่ 2 ถึง 3 ไปถึง 8 ดาว
- Hybrid ใช้ cap พื้นฐานของ hybrid species ในสูตรเดียวกัน
- ค่า 15% และ +5 เป็นค่าตั้งต้น ต้องปรับหลัง playtest

Trait (จำนวนช่องตาม rarity ของลูก):

- ช่องแรก: ผู้เล่นเลือก 1 trait จากพ่อหรือแม่
- ช่องถัดไป: จ่าย Essence เพื่อล็อก trait ของพ่อแม่เพิ่มได้ทีละ 1 ช่อง ช่องที่ 2 ใช้ Essence มากกว่าช่องแรกที่ล็อก (อัตรารอ tuning)
- ช่องที่ไม่ได้ล็อกสุ่มจาก trait pool ของ species ลูก
- Trait ที่ขัดกันอยู่ในตัวเดียวกันไม่ได้ ตาราง trait กำหนดคู่ที่ขัดกันไว้ ถ้าสุ่มได้ trait ที่ขัดกับที่ล็อกไว้ ระบบสุ่มใหม่
- รายการ trait และ trait pool ของแต่ละ species ยังต้องออกแบบ

**Species roster MVP: 6 บทบาท × แบบเบา/หนัก (ตัดสินแล้ว)**

Species กำหนดบทบาท รูปร่าง การเคลื่อนที่ และ skill pool ส่วนธาตุมาจาก seed ชื่อทั้งหมดเป็นชื่อชั่วคราว

แบบเบา: เดิน +1 ช่อง แต่ HP ต่ำกว่า แบบหนัก: เดิน -1 ช่อง แต่ HP สูงกว่า และถูกผลักได้ยากกว่า

| Movement | กฎบนกระดาน |
| --- | --- |
| Ground | ปกติ |
| Flying | เดินข้าม unit อื่นได้ แต่ไม่ได้รับทั้ง advantage และ disadvantage จาก terrain ที่ยืน ข้าม line of sight ได้เฉพาะตอนเป็นผู้โจมตี |
| Aquatic | ช่องน้ำนับเป็นธาตุที่ตรงกับตัวเองเสมอ และเดินบนช่องน้ำได้ +1 ช่อง |

**Skill กลางของบทบาท** (4 skill ต่อบทบาท)

| บทบาท | Stat หลัก | Skill กลาง |
| --- | --- | --- |
| Striker | POW | Heavy Blow (damage สูง), Rend (เลือดไหล), Rally Roar (Empowered 2 เทิร์น), Finisher (แรงขึ้นถ้าเป้า HP ต่ำกว่า 30%) |
| Skirmisher | AGI | Dash Strike (เดินแล้วตี), Feint (เป้าได้ disadvantage), Evade Stance (หลบเพิ่ม), Flank (advantage ถ้าเป้าติดกับพวกเรา) |
| Guardian | VIT | Taunt, Shield Wall (Guard และ Ward +2 ให้ตัวเองและพวกที่ติดกัน), Shield Bash (ตีประชิด 2d6 แล้วผลัก 1 ช่อง แทน Fortify), Counter |
| Caster | INT | Element Bolt (ระยะไกล ธาตุตัวเอง), Burst (พื้นที่ 3x3 ศัตรูสูงสุด 2 ตัว), Hex (Weakened), Mana Shield |
| Ranger | SEN | Long Shot, Mark (ทุกตัวได้ advantage กับเป้า), Pin (เป้าเดินไม่ได้ 1 เทิร์น), Scout (ระยะโจมตี +1) |
| Mystic | SPI | Mend (heal), Cleanse, Bless (advantage ให้พวก), Calm (ผ่าน loyalty check และลด stress หลังสู้) |

**Roster**

| Species | บทบาท | แบบ | Movement | Skill เฉพาะ |
| --- | --- | --- | --- | --- |
| Fangrel | Striker | เบา | Ground | Pack Howl (+1 attack ให้พวกข้างตัว), Hit and Run (ตีแล้วถอย 1 ช่อง) |
| Ironhorn | Striker | หนัก | Ground | Charge (พุ่ง 3 ช่องแล้วผลักเป้า), Unstoppable (ไม่โดนผลักหรือ Pin) |
| Zephlit | Skirmisher | เบา | Flying | Dive (ตีจากด้านหลังได้ advantage), Gust (ผลักเป้า 1 ช่อง) |
| Coilvex | Skirmisher | หนัก | Ground | Constrict (ล็อกเป้าไว้ข้างตัว), Shed Skin (ล้างสถานะผิดปกติของตัวเอง) |
| Mossback | Guardian | เบา | Ground | Rooted (ไม่ขยับเทิร์นนี้ damage ที่รับลดครึ่ง), Overgrow (เปลี่ยนช่องข้างตัวเป็นป่า) |
| Tidewall | Guardian | หนัก | Aquatic | Tide Surge (เปลี่ยน 3 ช่องเป็นน้ำ), Pincer Guard (Counter แรงขึ้น) |
| Wispling | Caster | เบา | Flying | Blink (เทเลพอร์ต 2 ช่อง), Echo (ใช้ Element Bolt 2 ครั้งในเทิร์นเดียว) |
| Runegolem | Caster | หนัก | Ground | Rune Field (ช่องรอบตัวเป็นธาตุตัวเอง), Overload (damage พื้นที่ใหญ่ แลกกับ stun ตัวเอง 1 เทิร์น) |
| Quillfox | Ranger | เบา | Ground | Quill Volley (ยิง 2 เป้า), Camouflage (ไม่โดนเล็งจากระยะไกลเมื่อยืนในป่า) |
| Gloomowl | Ranger | หนัก | Flying | Night Sight (ระยะโจมตี +1 และโจมตีเป้าที่ยืนในช่องมืดได้ advantage), Silent Swoop (โจมตีแล้วได้สถานะ Hidden จนถึงเทิร์นถัดไปของตัวเอง) |
| Lumifin | Mystic | เบา | Aquatic | Healing Tide (heal พวกทุกตัวที่ยืนบนน้ำ), Glow (ลบสถานะซ่อนของศัตรูในระยะ) |
| Totembark | Mystic | หนัก | Ground | Ancestral Aura (เมื่อเข้าช่วง Veteran ระยะของ Veteran bonus เพิ่มเป็น 2 ช่อง), Spirit Link (แบ่ง damage กับพวก) |

ข้อสังเกต: Overgrow, Tide Surge และ Rune Field เปลี่ยน terrain ได้เหมือนอาชีพ Rune Caller ของ Tamer ต้องจำกัดขนาดและระยะเวลา เพื่อไม่ให้ทับบทบาทของอาชีพนั้น

**Skill spec: vertical slice (ร่างสำหรับ paper prototype)**

ครอบคลุม 4 species ของเฟส 1 (Fangrel, Tidewall, Wispling, Quillfox) และ basic skill ของ Tamer ตัวเลขทั้งหมดเป็นค่าตั้งต้นสำหรับทดสอบ

- กายภาพ: d20 + SEN mod + proficiency เทียบ Guard, damage + POW mod ที่ระยะ 1 หรือ SEN mod ที่ระยะ 2 ขึ้นไป
- ธาตุ: d20 + SEN mod + proficiency เทียบ Ward, damage + INT mod
- Save: เป้าทอยต้าน DC = 8 + proficiency + mod ของ stat ที่ skill ใช้
- ทุกการโจมตีของมอนใช้ element wheel ตามธาตุของผู้โจมตี

**Skill กลางของบทบาท (16)**

| Skill | บทบาท | Tier | ระยะ | ทอย | ผล |
| --- | --- | --- | --- | --- | --- |
| Heavy Blow | Striker | Major | 1 | กายภาพ | 2d8 |
| Rend | Striker | Major | 1 | กายภาพ | 1d6 + Bleed (save VIT) |
| Rally Roar | Striker | Major | ตัวเอง | ไม่ทอย | Empowered 2 เทิร์น |
| Finisher | Striker | Minor | 1 | กายภาพ | 1d6 หรือ 2d8 ถ้าเป้า HP ต่ำกว่า 30% |
| Taunt | Guardian | Major | 3 | save SPI | Taunted 1 เทิร์น |
| Shield Wall | Guardian | Major | ตัวเองและพวกที่ติดกัน | ไม่ทอย | Guarded: Guard และ Ward +2 |
| Shield Bash | Guardian | Minor | 1 | กายภาพ | 2d6 และผลักเป้า 1 ช่อง (แทน Fortify) |
| Counter | Guardian | Minor | ตัวเอง | ไม่ทอย | Countering: ถ้าโดนโจมตีระยะ 1 จะโจมตีกลับ 1 ครั้ง (กายภาพ 1d8) |
| Element Bolt | Caster | Minor | 4 | ธาตุ | 1d8 |
| Burst | Caster | Major | 3 (พื้นที่ 3x3) | ธาตุ ทอยแยกทุกเป้า | 1d6 ศัตรูสูงสุด 2 ตัวที่ผู้ใช้เลือก ไม่โดนพวกเดียวกัน |
| Hex | Caster | Major | 3 | save SPI | Weakened 2 เทิร์น |
| Mana Shield | Caster | Minor | ตัวเองหรือพวกในระยะ 2 | ไม่ทอย | Guarded: Ward +4 |
| Long Shot | Ranger | Minor | 4 | กายภาพ | 1d8 |
| Mark | Ranger | Minor | 5 | กายภาพ (ไม่มี damage) | Marked 1 เทิร์น |
| Pin | Ranger | Major | 4 | กายภาพ | 1d6 + Pin (save VIT) |
| Scout | Ranger | Minor | ตัวเอง | ไม่ทอย | ได้ Blessed และการโจมตีครั้งถัดไประยะ +1 |

**Skill เฉพาะ species และ basic skill ของ Tamer (12)**

| Skill | ของ | Tier | ระยะ | ทอย | ผล |
| --- | --- | --- | --- | --- | --- |
| Pack Howl | Fangrel | Major | พวกในระยะ 1 | ไม่ทอย | Rallied 2 เทิร์น |
| Hit and Run | Fangrel | Minor | 1 | กายภาพ | 1d8 แล้วถอยฟรี 1 ช่อง |
| Tide Surge | Tidewall | Major | 3 ช่องเป็นแนวติดตัว | ไม่ทอย | เปลี่ยนเป็นช่องน้ำ 3 เทิร์น |
| Pincer Guard | Tidewall | Passive |  |  | Counter โจมตีกลับด้วย 2d8 แทน 1d8 |
| Blink | Wispling | Minor | 2 | ไม่ทอย | ใช้แทน Move: เทเลพอร์ตข้ามทุกอย่าง |
| Echo | Wispling | Major | 4 | ธาตุ | ใช้ Element Bolt 2 ครั้งในเทิร์นนี้ เป้าเดิมหรือต่างกันได้ |
| Quill Volley | Quillfox | Major | 4 | กายภาพ ทอยแยกทุกเป้า | 1d6 กับเป้า 2 ตัว |
| Camouflage | Quillfox | Minor | ตัวเอง | ไม่ทอย | Hidden ขณะยืนในช่องป่า |
| Cover | Tamer | Major | พวกที่ติดกัน 1 ตัว | ไม่ทอย | damage ที่พวกตัวนั้นได้รับ โอนมาที่ Tamer จนถึงเทิร์นถัดไป |
| Attune | Tamer | Major | ช่องติดตัว 1 ช่อง | ไม่ทอย | เปลี่ยนเป็นธาตุที่เลือก 3 เทิร์น |
| First Aid | Tamer | Major | 1 | ไม่ทอย | heal 1d8 + SPI mod |
| Distract | Tamer | Minor | 3 | save SPI | Off-balance |

- ช่องที่ถูกเปลี่ยน terrain กลับเป็นเหมือนเดิมเมื่อหมดเวลา และเปลี่ยนซ้ำทับกันได้ (อันล่าสุดชนะ)
- Counter และ Pack Howl ใช้สถานะ Countering และ Rallied ในตาราง status ของ F3
- เมื่อคำนวณรวม mod +5 (กลางเกม) skill Major ทำ damage ประมาณ 1.5 เท่าของโจมตีปกติ ซึ่งเข้ากับ cooldown 2 เทิร์น ต้องยืนยันใน paper prototype

**บทเรียนจาก simulation สำหรับการออกแบบ stat จริง**

- stat ที่ใช้คิด damage ของทุกบทบาทต้องโตในอัตราใกล้กัน ในการทดสอบ Striker และ Caster ได้บวก damage จาก stat หลักของบทบาท แต่ Ranger และ Guardian ไม่ได้ ทำให้ตีเบากว่าเสมอ ตอนนี้แก้ด้วยการให้ Ranger คิด damage ระยะไกลจาก SEN และให้ Guardian มี Shield Bash
- ทุกบทบาทต้องมี skill ทำ damage อย่างน้อย 1 ตัวใน skill กลาง ไม่อย่างนั้นทีมที่มีบทบาทนั้นจะมีตัวทำ damage น้อยกว่า
- skill ที่ซ้ำกับ Action พื้นฐาน (เช่น Fortify ที่ซ้ำกับ Action ป้องกัน) จะไม่ถูกใช้

**Sprite composition: body ตายตัวต่อ species, สลับชิ้นเสริม (ตัดสินแล้ว)**

Silhouette บอก species เพื่อให้อ่านบทบาทบนกระดานได้ทันที ความหลากหลายมาจากชิ้นเสริมที่ seed เลือก

| Layer | กำหนดโดย | จำนวนแบบ |
| --- | --- | --- |
| 1. Body (มี animation) | species | 1 ต่อ species |
| 2. Accessory (เขา หงอน หาง) | seed | 4 ต่อ species |
| 3. Pattern (ลายทาง จุด รูน) | seed | 6 ใช้ร่วมทุก species |
| 4. Palette | ธาตุกำหนดสีหลัก, seed กำหนดเฉด | 6 ธาตุ x 4 เฉด |
| 5. Rarity effect | rarity | Rare ขึ้นไปมีขอบเรือง, Legendary มี aura เคลื่อนไหว |
| 6. Age marker | ช่วงอายุ | Young เล็กลง 1 ถึง 2 px, Veteran มีจุดสีเทาหรือรอยแผล |

- ได้ 576 แบบต่อ species จากการเลือกของ seed
- Body animation 5 ท่า (idle, move, attack, hit, skill) x 4 frame = 240 frame สำหรับ 12 species
- Accessory วาดครั้งเดียว แล้วยึดกับ body ด้วย anchor point ต่อ frame
- Inherit: ลูกได้ body และ accessory จากฝ่ายหลัก ได้ pattern จากอีกฝ่าย และใช้ palette สีหลักของตัวเองผสมสีรองจากธาตุของอีกฝ่าย
- Hybrid มี body ของตัวเอง เพิ่มงาน 80 ถึง 120 frame สำหรับ 4 ถึง 6 hybrid ใน MVP

## Content and progression, economy

ความก้าวหน้ามี 4 ชั้น: ตัวมอน (สั้น), ranch (กลาง), Tamer และ legacy ข้ามรุ่น (ยาว) เพื่อไม่ให้การที่มอนเกษียณรู้สึกเหมือนเสียของ

| ชั้น | อะไรโต | หายเมื่อไร |
| --- | --- | --- |
| Monster | stat, skill, loyalty, level ดาว | เมื่อเกษียณ (เหลือเป็น Hall of Fame) |
| Ranch | สิ่งอำนวยความสะดวก, ประเภทการฝึก, ช่องเก็บมอน | ไม่หาย |
| Tamer | level, อาชีพ, skill, gear, Team cost cap | ไม่หาย |
| Legacy | trait สืบทอด, bonus stat cap รุ่นลูก, Species mastery, tournament rank | ไม่หาย |

Tamer (F5) ไม่แก่และไม่หาย: level, skill, gear ติดตัวผู้เล่นตลอด ทำให้การเสียมอนตัวเก่งไม่ทำให้ผู้เล่นรู้สึกเริ่มจากศูนย์

**Currency**

- **Gold:** ได้จาก battle และ campaign ใช้ซื้ออาหาร ไอเทม อัปเกรด ranch, จ่ายค่า combine และ respec อาชีพ Tamer
- **Essence:** ได้จากมอนที่หมดอายุขัยไปเอง ใช้ล็อก trait ของพ่อแม่ตอน combine (ดู F7)
- ไม่มี premium currency ใน MVP

**Content MVP**

- 12 species พื้นฐาน x 6 ธาตุ (ผ่าน seed variation) และ 4 ถึง 6 hybrid species จากตารางผสม
- 1 campaign ประมาณ 15 node พร้อม 1 boss
- 3 tournament rank (แหล่ง reward ระยะกลาง ไม่ใช่ด่านเลื่อนดาว) และ promotion trial ทั้งแบบ battle และ skill check สำหรับดาว 2 ถึง 8
- 6 กิจกรรมฝึก, 3 กระดาน terrain layout

**Monetization: เลือก Free + expansion campaign**

| Option | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| Premium ซื้อขาด | ไม่มีแรงกดดันให้ออกแบบ grind | ฐานผู้เล่นโตช้าบน web |
| Free + cosmetic | เข้าถึงง่าย, ไม่กระทบบาลานซ์ | ต้องมี art pipeline ต่อเนื่อง |
| Free + expansion campaign | สอดคล้องกับ D&D module | ต้องผลิต content ต่อเนื่อง |

เหตุผลที่เลือก: ตรงกับรูปแบบ D&D module และ expansion แต่ละชุดเพิ่ม campaign, species, และอาชีพ Tamer ใหม่ได้พร้อมกัน ต้องวางแผน content pipeline ตั้งแต่เฟส 4

## Technical requirements

แนะนำให้แยก game rules ออกเป็น engine กลางที่ไม่ผูกกับ UI (pure functions + seeded RNG) เพื่อให้ทดสอบ บาลานซ์ และย้ายไป server ได้ภายหลัง

**Non-functional requirements**

- โหลดหน้าแรกเล่นได้ภายใน 3 วินาทีบน 4G
- รองรับ touch และหน้าจอกว้าง 360 px ขึ้นไป
- Seed hashing ต้อง deterministic ข้ามเบราว์เซอร์
- RNG ของ battle ต้อง seed ได้ เพื่อทำ replay และตรวจโกง
- Save อัตโนมัติหลังทุก action ใน ranch
- Pixel art: render แบบ nearest-neighbor และ scale เป็นจำนวนเต็มเท่านั้น เพื่อไม่ให้ภาพเบลอ ใช้ tile 32x32 เพราะฝั่งละ 3 unit ทำให้ sprite บนกระดานมีน้อย ลงรายละเอียดได้ และสื่อ trait จาก seed กับ gear ของ Tamer ได้ชัดกว่า 16x16 (กระดาน 7x7 = 224x224 px ก่อน integer scale)
- Monster sprite ประกอบจาก 6 layer ตาม F7 ต้องรองรับ anchor point ต่อ frame, palette swap ตอน runtime และ cache sprite ที่ประกอบแล้ว เพื่อไม่ต้องประกอบใหม่ทุก frame

**Option A: Rendering**

| Option | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| Game framework 2D (เช่น Phaser) | มี scene, input, animation ในตัว เหมาะกับกระดาน | UI แบบฟอร์ม/เมนูเขียนยากกว่า |
| React + Canvas/SVG สำหรับกระดาน | UI ranch และเมนูทำง่าย, ecosystem ใหญ่ | animation ซับซ้อนต้องทำเอง |
| Hybrid: React สำหรับ ranch, framework 2D สำหรับ battle | ใช้จุดแข็งของทั้งคู่ | สอง stack ต้องแชร์ state |

**Option B: Backend and save**

| Option | ข้อดี | ข้อเสีย |
| --- | --- | --- |
| Local-first (IndexedDB) + cloud sync ภายหลัง | สร้างเร็ว, ทำงาน offline, ค่า server ต่ำ | โกงง่าย, leaderboard เชื่อไม่ได้ |
| Server-authoritative (API + Postgres) | ป้องกันโกง, รองรับ PvP/tournament จริง | ต้นทุนและเวลาพัฒนาสูงกว่า |
| Local engine + server ตรวจ replay | balance ระหว่างสองแบบ: เล่นลื่น, ตรวจผลได้ด้วย seed | ต้องออกแบบ engine ให้ deterministic 100% |

ทางที่เสนอสำหรับ MVP: Hybrid rendering + local-first save บวก server ขนาดเล็กสำหรับ account, profile snapshot และ share code (F6) โดยออกแบบ engine ให้ deterministic ตั้งแต่ต้น เพื่อเปิดทาง option ที่ 3 ในอนาคต ต้องยืนยันชื่อ library และเวอร์ชันจาก docs จริงก่อนเริ่ม implement

**Core data entities**

- Monster: id, seed\_hash (ว่างถ้ามาจาก combine), origin (seed, share, inherit, hybrid, recruit), growth\_type, appearance (accessory, pattern, palette), species, element, rarity, stars, stats, stat\_caps, traits, skills, age\_weeks, lifespan, fatigue, stress, loyalty, lineage, shared\_from
- Tamer: id, class, subclass, level, xp, stats, skills, gear
- Ranch: owner, week, gold, essence, facilities, roster, roster\_slots, weekly\_plan, species\_mastery, hall\_of\_fame
- Campaign run: map, current\_node, flags, party, rng\_seed
- Battle: board, units, turn, log, rng\_seed, mode (ปกติหรือ Tactician), inspiration\_used
- Account (server): id, friend\_code, friends, profile\_snapshot, used\_seed\_hashes
- Share code (server): code, source\_monster\_id, owner, rarity, expires\_at, redeemed\_by

## MVP scope and roadmap

MVP ต้องพิสูจน์สมมติฐานเดียว: การเลี้ยงที่ ranch ทำให้การสู้บนกระดานสนุกขึ้น ทุกอย่างที่ไม่ช่วยพิสูจน์ข้อนี้เลื่อนไปเฟสหลัง ยังไม่ระบุวันที่จนกว่าจะรู้ขนาดทีม

| Phase | Scope | Gate ก่อนไปเฟสถัดไป |
| --- | --- | --- |
| 0. Paper prototype | กฎ battle + stat บนกระดาษ/spreadsheet | กระดาน 1 เกมจบในประมาณ 10 นาที (ให้ทั้ง session อยู่ใน 10 ถึง 20 นาที) และมีทางเลือกที่มีความหมาย |
| 1. Battle vertical slice | engine deterministic, กระดาน 7x7, Basic Tamer + Command action, 4 species (Fangrel, Tidewall, Wispling, Quillfox), AI ศัตรูพื้นฐาน | playtester 5 คนเล่นซ้ำโดยไม่ต้องบอก |
| 2. Ranch loop | seed generation (ต้องมี account และ server ตรวจ seed แล้ว), ฝึก, fatigue/stress, lifespan, star promotion trial, save | ผู้เล่นเห็นความต่างของมอนที่เลี้ยงต่างกันบนกระดาน |
| 3. Campaign MVP | node map 15 node, skill check, 1 boss | อัตราจบ campaign มากกว่า 50% |
| 4. Legacy and polish | combine, Hall of Fame, tournament 3 rank, 4 อาชีพ Tamer (tier Class), social + share code, onboarding | ผ่าน metric D7 ตั้งต้น |
| 5. Post-MVP | cloud sync, async PvP ผ่าน replay, LLM flavor text, expansion แรก (campaign ใหม่ + Tamer Specialization, level cap 20) | ตัดสินใจหลังวัดผลเฟส 4 |

**Acceptance criteria หลักของ MVP**

- [ ] seed เดียวกันให้ species ธาตุ และหน้าตาเหมือนกัน 100% บนทุกเบราว์เซอร์ และ rarity คงที่ต่อคู่ account กับ seed
- [ ] ทุก action บนกระดานแสดง % โอกาสโดนก่อนยืนยัน
- [ ] battle replay จาก seed ได้ผลตรงกับเกมจริงทุกครั้ง
- [ ] มอนหนึ่งตัวใช้จำนวนสัปดาห์ในเกมจนเกษียณในช่วงที่ playtest ยืนยันว่าผูกพันพอแต่ไม่ยืดเยื้อ (ค่าตั้งต้นรอกำหนด)

## Prototype kit (เฟส 0)

ชุดข้อมูลสำหรับเล่น paper prototype บนกระดาษหรือ spreadsheet ใช้คนเล่นทั้งสองฝั่ง ไม่ใช้ไอเทม และถือว่า loyalty เต็ม ตัวเลขทั้งหมดเป็นค่าทดสอบ

**การตีความสูตรที่ใช้ใน kit**

- HP มอน = (10 + VIT) x ตัวคูณ ปัดลง แล้วบวก 3 x ดาว
- ระยะเดิน: AGI mod / 4 ปัดเข้าหาศูนย์ ระยะเดินต่ำสุด 2 (ถ้าปัดลงตามตัวอักษร Guardian ที่ AGI ต่ำจะเดินได้แค่ 1 ช่อง)
- Tamer ในทั้งสอง scenario ใช้แค่ basic skill เพราะ skill ของอาชีพยังไม่ได้ออกแบบ

**ทีมและธาตุ**

ธาตุจัดให้เป็นวงข้ามทีม ทุกตัวได้เปรียบ 1 ตัวและแพ้ทาง 1 ตัว: Fangrel (ป่า) > Quillfox (น้ำ) > Wispling (ภูเขา) > Tidewall (ทะเลทราย) > Fangrel

| ทีม | Unit |
| --- | --- |
| A | Tamer, Fangrel (ป่า, Striker), Wispling (ภูเขา, Caster) |
| B | Tamer, Tidewall (ทะเลทราย, Guardian), Quillfox (น้ำ, Ranger) |

**Scenario**

| Scenario | Tamer | มอน | Team cost |
| --- | --- | --- | --- |
| 1. ต้นเกม | Lv 1 (cap 3) | 1 ดาวทั้งสองตัว | 2 |
| 2. กลางเกม | Lv 6 (cap 8) | 4 ดาวทั้งสองตัว | 8 |

**Stat block**

ค่าในตารางเป็นค่าหลังปรับจาก simulation 4 รอบ Tidewall 4 ดาว POW 20 และ Quillfox 4 ดาว SPI 16 เป็นค่าทดสอบเพื่อชดเชยตัวเลขของชุดทดสอบ ไม่ใช่ค่าจริงของเกม

| Unit | POW | AGI | VIT | INT | SEN | SPI | HP | เดิน | Guard / Ward | Attack | Damage หลัก |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fangrel 1 ดาว | 14 | 12 | 10 | 8 | 12 | 8 | 19 | 4 | 11 / 9 | +2 | 1d8+2 |
| Fangrel 4 ดาว | 22 | 18 | 14 | 10 | 16 | 12 | 31 | 5 | 14 / 11 | +5 | 1d8+6 |
| Tidewall 1 ดาว | 12 | 8 | 14 | 8 | 10 | 12 | 31 | 3 | 11 / 11 | +1 | Shield Bash 2d6+1 |
| Tidewall 4 ดาว | 20 | 10 | 22 | 10 | 14 | 18 | 50 | 3 | 12 / 14 | +4 | Shield Bash 2d6+5 |
| Wispling 1 ดาว | 8 | 12 | 8 | 14 | 12 | 12 | 17 | 4 | 11 / 11 | +2 | Bolt 1d8+2 |
| Wispling 4 ดาว | 10 | 16 | 12 | 22 | 18 | 18 | 29 | 4 | 13 / 14 | +6 | Bolt 1d8+6 |
| Quillfox 1 ดาว | 12 | 12 | 10 | 8 | 14 | 8 | 19 | 4 | 11 / 9 | +3 | Long Shot 1d8+2 |
| Quillfox 4 ดาว | 16 | 18 | 12 | 10 | 22 | 16 | 29 | 5 | 14 / 13 | +8 | Long Shot 1d8+6 |
| Tamer Lv 1 | 10 | 12 | 12 | 10 | 12 | 12 | 25 | 3 | 11 / 11 | +3 | 1d6 |
| Tamer Lv 6 | 10 | 14 | 14 | 10 | 14 | 16 | 45 | 3 | 12 / 13 | +5 | 1d6 |

Tidewall ใน kit เดิน 3 ช่อง (ข้อยกเว้นของกฎแบบหนัก -1) และใช้ loadout: Taunt, Shield Bash, Counter, Pincer Guard

**กระดานทดสอบ "Crossroads"** (สมมาตรเมื่อหมุน 180 องศา เพื่อให้ทั้งสองฝั่งเท่ากัน)

สัญลักษณ์: . ปกติ, F ป่า, W น้ำ, M ภูเขา, D ทะเลทราย, L แสง, K มืด ทีม A วางในแถว 1 ถึง 2 ทีม B วางในแถว 6 ถึง 7

```text
แถว 1:  .  .  F  .  W  .  .
แถว 2:  .  M  .  .  .  D  .
แถว 3:  W  .  .  L  .  .  F
แถว 4:  .  F  .  K  .  F  .
แถว 5:  F  .  .  L  .  .  W
แถว 6:  .  D  .  .  .  M  .
แถว 7:  .  .  W  .  F  .  .
```

**สิ่งที่ต้องจดในแต่ละเกม** (เล่นแต่ละ scenario อย่างน้อย 3 ครั้ง)

- จำนวนเทิร์นและเวลาที่ใช้ เทียบกับเป้า 5 ถึง 6 เทิร์นต่อฝั่งและประมาณ 10 นาที
- จำนวนครั้งที่โดนจนล้ม เทียบกับเป้า 3 ถึง 4 ครั้ง
- Tamer ล้มเป็นตัวแรกบ่อยแค่ไหน
- skill ไหนถูกใช้มากหรือไม่ถูกใช้เลย
- terrain และการวางตำแหน่งมีผลกับการตัดสินใจจริงหรือไม่ (ถ้าไม่ ให้ลดระยะทุกหมวดลง 1 ตามหมายเหตุใน F3)
- ฝั่งที่เริ่มก่อนชนะบ่อยกว่าหรือไม่

**ผล simulation 4 รอบ** (AI แบบ greedy เล่นทั้งสองฝั่ง 2,000 เกมต่อ config)

| ตัวชี้วัด | รอบ 1 S1 / S2 | รอบ 4 S1 / S2 | เป้า |
| --- | --- | --- | --- |
| ทีม A ชนะ | 76 / 96% | 54 / 80% | 40 ถึง 60% |
| เทิร์นต่อฝั่ง | 5 / 3 | 7 / 6 | 5 ถึง 6 |
| Tamer ตายเป็นตัวแรก | 60 / 99% | 29 / 46% | ต่ำ |
| เกมที่ไปจบที่ 10 เทิร์น | 1 / 0% | 16 / 10% | ต่ำ |
| ฝั่งที่เริ่มก่อนชนะ | 52 / 52% | 50 / 52% | ประมาณ 50% |

- S2 ที่รอบ 4 ยังไม่ได้รวมค่าทดสอบ POW 20 และ SPI 16 ซึ่งทดสอบแยกแล้วลดเหลือประมาณ 68%
- AI มองแค่ step เดียว จึงไม่ใช้ skill ที่ต้องวางแผน ผลของ Hex, Blink, Mark, Camouflage และ Pin ต้องทดสอบด้วยการเล่นแบบคนจริง

## Risks and open questions

ความเสี่ยงใหญ่สุดคือ 4 pillar ดึงกันไปคนละทาง จนได้หลายเกมเล็กที่ไม่เชื่อมกัน แทนที่จะเป็นเกมเดียว

| Risk | ผลกระทบ | ทางลด |
| --- | --- | --- |
| ลูกเต๋าทำให้ Tactician รู้สึกแพ้เพราะดวง | churn ของกลุ่ม tactics | แสดง % ชัด, โหมดลดความสุ่ม, ใช้ advantage แทน bonus ตัวเลขใหญ่ |
| Lifespan ทำให้ผู้เล่นเสียใจจนเลิก | churn หลังมอนตัวแรกเกษียณ | legacy bonus ชัดเจน, Hall of Fame, เตือนล่วงหน้า |
| Scope ใหญ่เกินทีม | ไม่ได้ ship | MVP ตามเฟส, gate ชัด, ตัด campaign ได้ถ้าจำเป็น |
| ความคล้าย IP เดิม | ความเสี่ยงทางกฎหมาย | art/ชื่อ/โลกเป็นของตัวเอง, ปรึกษาผู้เชี่ยวชาญ IP ก่อนเปิดตัว |
| Seed จากไฟล์ผู้ใช้ | ความเป็นส่วนตัว | hash ฝั่ง client, ไม่ upload ไฟล์ต้นฉบับ |
| โกงด้วยการแก้ save local | leaderboard เสีย | MVP ไม่มี ranked, rarity และโควตาแชร์ตรวจฝั่ง server, ranked ในอนาคตตรวจด้วย replay |

**Open questions**

- [ ] ตัดสินแล้ว: art direction เป็น pixel art
- [ ] ตัดสินแล้ว: เวลาในเกมเดินทีละสัปดาห์เมื่อผู้เล่นกดจบสัปดาห์ ไม่ใช่เวลาจริง
- [ ] ตัดสินแล้ว: ทีมคือ Tamer 1 + มอน 2 ตัว
- [ ] ตัดสินแล้ว: Free + expansion campaign
- [ ] ตัดสินแล้ว: multiplayer ระดับ 1 (social + share code) ดู F6
- [ ] ตัดสินแล้ว: Tamer ครบ 4 อาชีพ เริ่มจาก Basic Tamer ทุกคน
- [ ] ตัดสินแล้ว: tile 32x32
- [ ] ตัดสินแล้ว: กระดาน 7x7 (ฝั่งละ 3 unit ไม่ต้องขยาย)

**ยังไม่พร้อม (จาก simulation)**

- [ ] เกมยื้อเวลาใน S1: 16% ไปจบที่ 10 เทิร์น
- [ ] S2 ทีม A ยังชนะประมาณ 68% หลังปรับ stat ทดสอบ ต้องแก้ตอนออกแบบ stat จริงตามบทเรียนใน F7
- [ ] skill ที่แทบไม่ถูกใช้: Hex, Blink, Mark, Camouflage, Pin (ทดสอบด้วยการเล่นแบบคนจริง)
- [ ] Tidewall และ Tamer ที่ 4 ดาว / Lv 6 ทนเกินเป้า (โดน 4 ถึง 5 ครั้ง)

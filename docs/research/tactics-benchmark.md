# Tactics benchmark: กลไก action ในเกม tactics เชิงพาณิชย์

ตรวจเมื่อ 2026-10-18 สำหรับ phase 1.x (`.scratch/phase-1x-playtest-feedback/spec.md`, ticket 01–19)
ใช้เฉพาะแหล่งสาธารณะ (เว็บทางการ, คู่มือ/guide ทางการ, store page, บทสัมภาษณ์ผู้พัฒนา, wiki และสื่อที่เชื่อถือได้) ไม่ได้แกะ client, APK หรือ network traffic ของเกมใด
ศัพท์ตาม `CONTEXT.md` (Board, Unit, Turn, Round, Move preview, Threat zone, Undo, Start over)

**ระดับแหล่ง** ทุกแถวในตารางติดป้าย
- **P** (primary): เว็บ/guide/store page ทางการ หรือคำพูดผู้พัฒนาโดยตรง
- **S** (secondary): wiki ที่รู้จักกัน (Fire Emblem Wiki, GameWith, UFOpaedia, Wikipedia) และสื่อ (RPG Site, Nintendo Life, AV Club, PC Gamer ฯลฯ)
- **C** (community): กระทู้ Steam หรือโพสต์ผู้เล่น ใช้เมื่อไม่มีแหล่งอื่น และถือว่าอ่อน

ถ้าเขียนว่า **unconfirmed** คือหาแหล่งที่ยืนยันไม่ได้ในรอบนี้ อย่าใช้เป็นข้อเท็จจริง War of the Visions มีแหล่งน้อยมาก จึงเป็น unconfirmed เกือบทุกหัวข้อ

## Summary

- **Move preview เป็นมาตรฐาน และแสดงผลลัพธ์ก่อนยืนยันเสมอ** FEH ให้ลาก Unit ไปค้างบนศัตรูเพื่อดู combat forecast และลองได้ไม่จำกัดจนกว่าจะปล่อยนิ้ว XCOM 2 แสดงชนิด cover และช่องที่ศัตรูมองเห็นที่ปลายทางก่อนยืนยัน Triangle Strategy เพิ่ม "Simulation Mode" หลังรับ feedback จาก demo ทิศทางของ ticket 03/04 จึงตรงกับตลาด
- **Undo ที่เกมใช้กันมีสองแบบ** แบบแรกคือย้อนเฉพาะการเดินที่ยังไม่มีผลสุ่ม ทำได้ฟรีไม่จำกัด (Into the Breach Undo Move) แบบที่สองคือ rewind ข้ามผลสุ่มได้ แต่จำกัดจำนวนครั้ง (Divine Pulse, Time Crystal, Chariot Tarot, Backtrack ของ Sword of Convallaria, Reset Turn ของ Into the Breach) Undo ของ ticket 05 เป็นแบบแรก จึงไม่ต้องมีจำนวนครั้ง
- **Rewind ไม่เปลี่ยนลำดับเลขสุ่มในเกมที่มีข้อมูล** Fire Emblem Wiki ระบุว่า Divine Pulse ไม่เปลี่ยนลำดับ RNG ส่วน XCOM: Enemy Unknown ใช้ seed ทำให้โหลดเซฟแล้วได้ผลเดิม และภายหลังต้องเพิ่มตัวเลือก "Save Scum" ที่สุ่ม seed ใหม่ Monster Tactics ใช้ Dice Seed ตายตัว Undo ที่ข้ามการทอยได้จะทำให้ผู้เล่นรู้ผล d20 ลูกถัดไปล่วงหน้า กฎ "ห้ามข้ามการทอย" ของ ticket 05 จึงจำเป็น
- **Threat zone ทุกเกมที่ตรวจเป็น overlay ทั้ง Board ที่เปิดปิดได้ และแตะศัตรูทีละตัวเพื่อดูระยะได้** (FEH, Three Houses, Langrisser Mobile, Sword of Convallaria) การแสดงแค่ตัวเลขที่ช่อง preview อย่างที่ ticket 11/12 กำหนดไม่ตรงกับเกมใดในรายการ ความแม่นยำก็หยาบทั้งนั้น Sword of Convallaria แสดงเฉพาะระยะ basic attack จึงประเมินต่ำ ส่วนสูตรของเราประเมินสูง
- **Turn structure แบ่งเป็นสองค่ายพอๆ กัน** แบบเล่นทีละฝั่ง (FEH, Langrisser, Fire Emblem, Into the Breach, XCOM 2) กับแบบเรียงตามความเร็วรายตัว (Sword of Convallaria, Triangle Strategy, Tactics Ogre Reborn, War of the Visions) เกมมือถือ Fire Emblem ที่ออกแบบให้เล่นสั้นเลือกแบบเล่นทีละฝั่ง Side-based Turn ของเราไม่ใช่ปัญหา
- **Board เล็กไปคู่กับระยะสั้น** FEH ใช้ Board 6x8 กับ move 1–3 และ Fire Emblem ทั้งซีรีส์ใช้ระยะโจมตีหลัก 1–2 ส่วน Into the Breach ใช้ 8x8 Monster Tactics ใช้ Board 7x7 วัดระยะแบบ Chebyshev กับ move 2–4 และระยะ 3–5 ซึ่งยาวกว่ากลุ่มนี้มาก การคำนวณใน §5 ชี้ว่าบน 7x7 การลดระยะอย่างเดียวสร้างช่วงเข้าหากันไม่ได้
- **ความสุ่มแบ่งเป็นสามแนว** แนวแรกแสดง % แล้วแอบช่วยผู้เล่น (Fire Emblem 2RN/hybrid, XCOM 2 aim assist ที่ซ่อนไว้) แนวที่สองตัดความสุ่มออกเกือบหมด (Into the Breach, FEH ที่ HP หลังการต่อสู้ตรงกับ forecast เสมอ) แนวที่สามใช้ % น้อยขั้น (Mario + Rabbids ใช้ 0/50/100) ทุกเกมที่มีความสุ่มแสดงโอกาสโดนก่อนยืนยัน แต่ Monster Tactics ยังไม่แสดง
- **คำเตือนก่อนจบ Turn มีจริง แต่ยืนยันได้จากแหล่งน้อย** ผู้เล่น Into the Breach รายงานว่าเกมเตือนเมื่อมี mech ที่ยังไม่ใช้ action ส่วน FEH ให้ผู้เล่นเลือกเองว่าจะจบ Turn อัตโนมัติหรือกดปุ่ม End Turn (ตั้งค่า Smart End) ticket 01/02 อยู่ในแนวเดียวกัน

---

## 1. Move preview / confirm

| เกม | วิธีทำงาน | แหล่ง |
|---|---|---|
| Fire Emblem Heroes | ลาก Unit ไปค้างบนศัตรูเพื่อเปิด combat forecast ด้านบนจอ ลองหลายคู่ได้โดยไม่เริ่มการต่อสู้ ตราบที่ยังไม่ปล่อย Unit ลงบนศัตรู forecast บอก damage และ HP หลังการต่อสู้ รวมถึงการเปลี่ยน stat ที่เกิดจากตำแหน่ง (เช่น skill กลุ่ม Solo) | P [FEH guide 3460](https://new-guide.fire-emblem-heroes.com/en-GB/feh-3460.html) |
| Fire Emblem (ซีรีส์ รวม Three Houses/Engage) | combat forecast แสดงเมื่อเลือกโจมตี หรือวาง Unit บนศัตรูที่โจมตีได้ เปลี่ยนเป้าและอาวุธได้จากหน้าเดียวกัน แล้วกดยืนยันจึงเริ่มการต่อสู้ ส่วนการกดยกเลิกการเดินก่อนเลือก action ยังไม่มีแหล่ง (**unconfirmed**) | S [FE Wiki: Combat forecast](https://www.fireemblemwiki.org/wiki/Combat_forecast) |
| Fire Emblem Engage | ขณะขยับ Unit จะมีเส้นสีแดงลากจากศัตรูที่จะเล็ง Unit นั้นถ้ายืนช่องนั้น | S [Prima Games](https://primagames.com/tips/how-to-see-enemy-targeting-in-fire-emblem-engage) (อ่านได้แค่ผลค้นหา หน้าเว็บตอบ 403) |
| XCOM 2 | เลือกทหารแล้วชี้ปลายทาง ขอบสีน้ำเงินคือใช้ 1 action point ขอบสีเหลือง (dash) ใช้ทั้ง 2 ที่ปลายทางมีไอคอนโล่บอกระดับ cover และรูปตาสีแดงบอกว่าศัตรูมองเห็นช่องนั้น บน PC คลิกขวาเพื่อยืนยัน หน้ายิงแสดงโอกาสโดนและ damage ที่คาด ยกเลิกได้ก่อนยิง | S [Pixel Twelve (อ้างคู่มือทางการ)](https://pixeltwelve.com/guides/xcom-2-beginner-guide-first-mission-cover-overwatch), S [Fextralife](https://xcom2.wiki.fextralife.com/Combat) |
| Triangle Strategy | หลังรับ feedback จาก demo เพิ่มการเทียบ damage และ accuracy ที่คาดไว้โดยสลับคำสั่งขณะชี้ศัตรู เพิ่ม "Simulation Mode" ที่ดูผลได้ทั้งศัตรูในและนอกระยะ และแสดงจุดหมายสุดท้ายก่อนใช้ ability ที่ทำให้ตัวละครเคลื่อนที่ | P [Nintendo: demo survey results](https://www.nintendo.com/us/whatsnew/triangle-strategy-debut-demo-survey-results-nintendo-switch) |
| Tactics Ogre: Reborn | ธนู หน้าไม้ และเวทแบบ projectile แสดงวิถีก่อนยิง | S [GamingBolt](https://gamingbolt.com/tactics-ogre-reborn-ai-improvements-reviving-units-training-battles-and-more-revealed) |
| Langrisser Mobile | แตะ Unit แล้วเห็นระยะเดิน (สีน้ำเงิน) กับระยะโจมตี (สีแดง) และเมื่ออยู่ในระยะโจมตี ศัตรูมีป้าย "Strong"/"Weak" ตามคู่ชนิด Unit | P [Langrisser Wiki ทางการ](https://us-news.zlongame.com/game/888.jhtml), S [Pocket Gamer](https://www.pocketgamer.com/langrisser-mobile/langrisser-mobile-cheats-and-tips-advanced-battle-tips-you-must-know/) |
| Sword of Convallaria | ช่องเดินได้แสดงสีน้ำเงิน และระยะโจมตีไกลสุดแสดงสีแดง | S [GameWith](https://gamewith.net/sword-of-convallaria/69373) |
| Into the Breach | ไม่ต้องมี preview แยก เพราะเดินแล้วกด Undo Move ได้จนกว่าจะโจมตี (ดู §2) | S [Nintendo Life](https://nintendolife.com/reviews/switch-eshop/into_the_breach) |
| Mario + Rabbids Sparks of Hope | เดินอิสระภายในรัศมี ไม่ได้เลือกช่องปลายทาง | S [Gamepressure](https://gamepressure.com/editorials/reviews/mario-rabbids-sparks-of-hope-review/z05d7) |
| Advance Wars Re-Boot Camp, War of the Visions | **unconfirmed** | — |

**Recommendation for Monster Tactics**
- **ยืนยันทิศทางของ ticket 03/04 (done) และ 18/19** เงา Unit + ปุ่ม "เดิน" + แตะ Unit เพื่อยกเลิก preview คือรูปแบบเดียวกับ FEH ที่ "ลองได้จนกว่าจะปล่อย" ticket 18 (แตะ Unit แล้วยกเลิกแค่ preview) ตรงกับ FEH ที่ยกเลิกได้โดยไม่เสียการเลือก
- **ความคิดใหม่ ยังไม่มี ticket: แสดงโอกาสโดนในแผง Move preview** ทุกเกมที่มีความสุ่ม (Fire Emblem, XCOM 2, Triangle Strategy) แสดง % ก่อนยืนยัน และ FEH แสดงผล HP ที่แน่นอน แผงของเราบอกแค่ว่า skill ไหนถึงศัตรูตัวไหน ควรเพิ่มโอกาสโดนต่อเป้า ซึ่ง engine คำนวณได้ตรงจาก d20 รวม advantage/disadvantage (ดู §6) เป็น field เพิ่มใน snapshot แบบ additive (ticket Claude) คู่กับ ticket UI (Codex)
- **ความคิดใหม่: ป้ายเตือนที่ช่อง preview แบบ Engage/XCOM** ชี้ว่าศัตรูตัวไหนจะเล็งช่องนี้ได้ (เส้นหรือไฮไลต์ที่ตัวศัตรู) ใช้ข้อมูลเดียวกับ ticket 11 และให้ข้อมูลมากกว่าตัวเลข "⚠ N" อย่างเดียว ดู §3

## 2. Undo / rewind

| เกม | ขอบเขต | ข้อจำกัด | ความสุ่ม | แหล่ง |
|---|---|---|---|---|
| Into the Breach | Undo Move ย้อนการเดินของ mech ที่ยังไม่โจมตี และ Reset Turn ย้อนทั้ง Turn แม้โจมตีไปแล้ว | Undo Move ไม่จำกัด ส่วน Reset Turn ได้ 1 ครั้งต่อ battle (ผู้เล่นบอกว่ามี pilot ที่ให้ 2 ครั้ง) | การต่อสู้ deterministic ไม่มีอะไรต้องสุ่มใหม่ | S [Nintendo Life](https://nintendolife.com/reviews/switch-eshop/into_the_breach), C [Steam](https://steamcommunity.com/app/590380/discussions/0/2650805212053351822/?ctp=2) |
| Fire Emblem: Three Houses | Divine Pulse ย้อนไปจุดใดก็ได้ภายใน 50 Turn ล่าสุด ใช้ระหว่าง Turn ผู้เล่น | เริ่ม 3 ครั้ง ได้เพิ่มตามเนื้อเรื่อง สูงสุด 13 (Maddening 10) เปิดใช้อัตโนมัติเมื่อ Game Over ถ้ายังเหลือ | **ไม่เปลี่ยนลำดับ RNG** | S [FE Wiki: Turn rewind](https://fireemblemwiki.org/wiki/Turn_rewind), P [Nintendo AU](https://nintendo.com/au/games/nintendo-switch/fire-emblem-three-houses) (บอกแค่ว่าใช้ได้จำนวนจำกัดต่อ battle) |
| Fire Emblem Engage | Time Crystal ย้อน Turn | Normal ไม่จำกัด, Hard/Maddening 10 ครั้งต่อ map | **unconfirmed** | S [FE Wiki: Turn rewind](https://fireemblemwiki.org/wiki/Turn_rewind) |
| Fire Emblem Echoes: Shadows of Valentia | Mila's Turnwheel ย้อนไป Turn ก่อนหน้าได้ แต่บันทึก action ได้จำนวนจำกัด | มีจำนวนครั้ง เติมหลัง battle | **unconfirmed** | S [FE Wiki: Turn rewind](https://fireemblemwiki.org/wiki/Turn_rewind) |
| Sword of Convallaria | "Backtrack Mode" ย้อนไป Turn หรือ action ของตัวละครที่เลือก | จำนวนครั้งตามที่แสดงบนจอ (ไม่พบตัวเลข) | **unconfirmed** | S [GameWith](https://gamewith.net/sword-of-convallaria/69373) |
| Tactics Ogre: Reborn | Chariot Tarot ย้อนการเคลื่อนไหวระหว่าง battle | ต้นเกมย้อนได้ 10 Turn แล้วเพิ่มขึ้นภายหลัง (บทวิจารณ์บอก 50) | ผู้วิจารณ์บอกว่าการทอยหลังย้อนเป็นผลใหม่ ไม่ได้ถูกกำหนดไว้ (ความเห็นผู้วิจารณ์ ไม่ใช่สเปก) | P [PlayStation Store](https://www.playstation.com/en-nz/games/tactics-ogre-reborn/), S [RPG Site](https://www.rpgsite.net/news/13383-tactics-ogre-reborn-details-skills-battiefield-elements-unit-recruitment-the-wheel-of-fortune-the-chariot-tarot-rewind-feature-and-the-world-tarot-route-change-mechanic), S [AV Club](https://www.avclub.com/tactics-ogre-reborn-review) |
| Advance Wars 1+2 Re-Boot Camp | rewind Turn ได้ในทั้งสอง campaign ผู้วิจารณ์บอกว่าย้อนถึงต้น Turn | **unconfirmed** | **unconfirmed** | P [Nintendo AU](https://www.nintendo.com/au/games/nintendo-switch/advance-wars-1-plus-2-re-boot-camp/), S [Shacknews](https://www.shacknews.com/article/134936/advance-wars-1-2-reboot-camp-preview) |
| Triangle Strategy | ไม่พบ rewind ระหว่าง battle มี battle retry และ quicksave อัตโนมัติทุกจำนวน Turn ที่กำหนด | — | — | P [Nintendo: demo survey results](https://www.nintendo.com/us/whatsnew/triangle-strategy-debut-demo-survey-results-nintendo-switch) |
| XCOM: Enemy Unknown / Enemy Within (ไม่ใช่ XCOM 2) | ไม่มี Undo ในเกม ผู้เล่นใช้วิธีโหลดเซฟแทน | — | ผลถูกผูกกับ seed โหลดแล้วทำเหมือนเดิมได้ผลเดิม Enemy Within เพิ่มตัวเลือก "Save Scum" ที่สุ่ม seed ใหม่ทุกครั้งที่โหลด ส่วน XCOM 2 เป็น **unconfirmed** | S [Time](https://techland.time.com/?p=148165), S [GameBanshee](https://gamebanshee.com/daf) |
| FEH, Langrisser Mobile, Mario + Rabbids, War of the Visions | **unconfirmed** | — | — | — |

**Recommendation for Monster Tactics**
- **ยืนยันการออกแบบของ ticket 05** จุดปลอดภัยที่ "ต้น Turn หรือหลังการทอยล่าสุด" ใช้งานเหมือน Undo Move ของ Into the Breach คือย้อนสิ่งที่ยังไม่มีผลสุ่มได้ไม่จำกัด เกมที่ย้อนข้ามผลสุ่มได้ต้องจำกัดจำนวนครั้ง แต่ของเราห้ามข้ามการทอย จึงไม่ต้องมีจำนวนครั้ง
- **เหตุผลที่ห้ามข้ามการทอยต้องเขียนไว้ใน spec** Divine Pulse ไม่เปลี่ยนลำดับ RNG และ XCOM: EU ใช้ seed ทำให้โหลดเซฟแล้วได้ผลเดิม ทั้งสองระบบผลเดียวกับ Dice Seed ตายตัวของเรา Undo ที่ข้ามการทอยไม่ได้ทำให้ทอยใหม่ แต่ทำให้ผู้เล่นรู้ผลลูกถัดไปแล้วเลือกเป้าหมายตามนั้น ควรเพิ่มประโยคนี้ใน Implementation Decisions ของ Undo เพื่อกันข้อเสนอ "ให้ Undo ข้ามการทอยได้ X ครั้ง" ในอนาคต ถ้าวันหนึ่งอยากมี rewind แบบ Divine Pulse ต้องออกแบบ RNG ใหม่ (เช่น แยก stream ต่อ action) ซึ่งเป็นงาน phase อื่น
- **ยืนยัน Start over (ticket 07)** Triangle Strategy เพิ่ม battle retry หลัง demo และ Advance Wars Re-Boot Camp มี rewind ระดับ Turn การเริ่มใหม่ด้วย Dice Seed ใหม่เทียบได้กับ "Save Scum" ของ Enemy Within คือผู้เล่นได้เกมใหม่ ไม่ได้ผลเดิม
- **ความคิดใหม่ (เล็ก): บอกเหตุผลเมื่อปุ่ม Undo ถูกปิด** เช่น "ย้อนข้ามการทอยไม่ได้" เพราะผู้เล่นที่คุ้นกับ Divine Pulse หรือ Time Crystal จะคาดว่าย้อนได้ไกลกว่านี้ (แก้ข้อความใน ticket 07)

## 3. Threat zone / danger zone

| เกม | สิ่งที่แสดง | เปิดอย่างไร | ต่อตัว / ทั้งหมด | ความแม่นยำ | แหล่ง |
|---|---|---|---|---|---|
| Fire Emblem Heroes | "Danger Area" ไฮไลต์สีแดงบน Board ทุกช่องที่ศัตรูโจมตีถึง | ปุ่ม Danger Area และ setting "Show Danger Area" ที่แสดงตั้งแต่เริ่ม battle | ทั้งหมด | guide เตือนว่าศัตรูบางตัวอยู่นิ่งจนกว่าจะเข้าระยะ | P [FEH guide 1110](https://new-guide.fire-emblem-heroes.com/en-GB/feh-1110.html), P [FEH guide 3540](https://new-guide.fire-emblem-heroes.com/en-GB/feh-3540.html) |
| Fire Emblem: Three Houses | danger radius ของศัตรูทุกตัว (overlay สีม่วง) | กด ZR เปิดปิด และชี้ศัตรูเพื่อดูระยะของตัวนั้น | ทั้งหมด + ต่อตัว | **unconfirmed** | S [SuperCheats](https://www.supercheats.com/fire-emblem-three-houses/walkthrough/danger-radius) |
| Fire Emblem Engage | เส้นแดงจากศัตรูที่จะเล็ง Unit ระหว่างขยับ และดูการเคลื่อนที่ของศัตรูได้ แต่ไม่รับประกันว่าศัตรูจะโจมตีจริง | อัตโนมัติขณะขยับ | ต่อ Unit ที่ขยับ | ผู้เขียน guide บอกว่าไม่ใช่การทำนายที่แน่นอน | S [Prima Games](https://primagames.com/tips/how-to-see-enemy-targeting-in-fire-emblem-engage) |
| Langrisser Mobile | ปุ่ม Danger Zone มุมซ้ายล่าง บอกว่าจะโดนโจมตีใน Round หน้าหรือไม่ และแตะศัตรูเพื่อดูระยะเดินกับระยะโจมตีของตัวนั้น | ปุ่ม | ทั้งหมด + ต่อตัว | **unconfirmed** | P [Langrisser Wiki ทางการ](https://us-news.zlongame.com/game/888.jhtml) |
| Sword of Convallaria | "Danger Zone Display" แสดงช่องปลายทางที่อยู่ในระยะโจมตีของศัตรูเป็นสีม่วง | ปุ่มเปิดปิด | ทั้งหมด | **นับแค่ระยะ basic attack ไม่นับ skill** อยู่นอกโซนก็ยังโดน skill ได้ | S [GameWith](https://gamewith.net/sword-of-convallaria/69373) |
| Into the Breach | ไม่ใช่โซน แต่ศัตรูประกาศเป้าและทิศการโจมตีของ Turn หน้าก่อนผู้เล่นเล่น | อัตโนมัติ | ต่อตัว (การโจมตีจริง) | แม่นยำ เพราะเป็นสิ่งที่ศัตรูจะทำจริง | S [Wikipedia](https://en.wikipedia.org/wiki/Into_the_Breach), S [Game Developer](https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-) |
| XCOM 2 | รูปตาสีแดงบนช่องปลายทางที่ศัตรูมองเห็น และโล่บอก cover/flank | อัตโนมัติที่ปลายทาง | ต่อช่อง | **unconfirmed** | S [Pixel Twelve](https://pixeltwelve.com/guides/xcom-2-beginner-guide-first-mission-cover-overwatch) |
| Triangle Strategy | เส้นเป้าหมายจากบอสที่มีท่าแรงถูกเน้นให้เห็นชัดขึ้น | อัตโนมัติ | ต่อตัว | **unconfirmed** | P [Nintendo: demo survey results](https://www.nintendo.com/us/whatsnew/triangle-strategy-debut-demo-survey-results-nintendo-switch) |
| Tactics Ogre Reborn, Advance Wars, Mario + Rabbids, War of the Visions | **unconfirmed** | — | — | — | — |

**Recommendation for Monster Tactics**
- **benchmark ขัดกับ Out of Scope ของ spec และควรทบทวน** spec ตัด "full-Board Threat zone overlay" ออก แต่ทุกเกมที่มีโซนอันตราย (FEH, Three Houses, Langrisser, Sword of Convallaria) ใช้ overlay ทั้ง Board แบบเปิดปิดได้เป็นหลัก และสามเกมให้แตะศัตรูดูระยะทีละตัว ไม่มีเกมไหนแสดงแค่ตัวเลขที่ช่องเดียว เสนอให้ ticket 11 คืนค่า "จำนวนศัตรูที่ถึง" ของทุกช่อง (หรือรายชื่อศัตรูต่อช่อง) แทนค่าเดียวที่ช่อง preview ค่าเดียวเป็นแค่ค่าหนึ่งในตารางนี้ คำนวณบน 9x9 ก็แค่ 81 ช่อง จากนั้นเพิ่ม ticket UI ใหม่สำหรับปุ่ม overlay แบบ FEH ส่วน "⚠ N" ของ ticket 12 ใช้ต่อได้
- **ความคิดใหม่: แตะศัตรูเพื่อดูระยะเดิน+ระยะโจมตีของตัวนั้น** (FEH, Three Houses, Langrisser) ใช้ข้อมูลเดียวกับ ticket 11 คนละมุมมอง
- **ระบุทิศทางความคลาดเคลื่อนใน spec** Sword of Convallaria นับแค่ basic attack จึงประเมินต่ำ (นอกโซนก็ยังโดนได้) สูตรของ ticket 11 ใช้ระยะ skill ที่ไกลที่สุดและไม่คิด cooldown/line of sight จึงประเมินสูง (ในโซนอาจไม่โดน) สูตรของเราเลือกฝั่งที่ปลอดภัยกว่า เพราะผู้เล่นไม่ถูกหลอกให้เดินเข้าที่อันตราย ควรเขียนไว้ในข้อความ "เป็นค่าประมาณ" ของ ticket 12 ด้วย
- **ข้อควรระวัง:** spec เขียนไว้แล้วว่า Threat zone มีความหมายหลังแก้ระยะเท่านั้น §5 คำนวณว่าบน 7x7 แบบ Chebyshev แม้ลดระยะตาม variant (a) Unit ระยะไกลก็ยังถึงทุกช่อง overlay จะแดงทั้ง Board ถ้าไม่แก้ §5 ก่อน

## 4. Turn structure

| เกม | แบบ | จำนวน Unit ที่ทำได้ต่อ Turn | แหล่ง |
|---|---|---|---|
| Fire Emblem Heroes | ฝั่งผู้เล่นกับฝั่งศัตรูสลับกันอย่างเคร่งครัด | ทีมสูงสุด 4 ตัว ทุกตัวเล่นใน phase ของฝั่งตัวเอง | S [Wikipedia](https://en.wikipedia.org/wiki/Fire_Emblem_Heroes) |
| Langrisser Mobile | สองฝั่งผลัดกันเล่น (ฝั่งละ Turn) | ทุก troop ของฝั่ง | P [Langrisser Wiki ทางการ](https://us-news.zlongame.com/game/888.jhtml) |
| Into the Breach | ผู้เล่นขยับ mech 3 ตัว ตัวละครละการเดิน + อาวุธ 1 ครั้ง หลังจากศัตรูประกาศการโจมตีแล้ว | 3 mech | S [Wikipedia](https://en.wikipedia.org/wiki/Into_the_Breach) |
| XCOM 2 | ผลัดกันเล่นทีละฝั่ง ทุก Unit มีการเดินและ action ทหารมี 2 action point | ทุก Unit ของฝั่ง | S [Fextralife](https://xcom2.wiki.fextralife.com/Combat), S [Pixel Twelve](https://pixeltwelve.com/guides/xcom-2-beginner-guide-first-mission-cover-overwatch) |
| Sword of Convallaria | เรียงตามค่า SPD รายตัว มีแถบลำดับเปิดปิดได้ ตัวละครละเดิน 1 ครั้ง + action 1 ครั้ง | ทีละตัว | S [GameWith](https://gamewith.net/sword-of-convallaria/69373) |
| Triangle Strategy | เรียงตามความเร็ว แสดงในแถบ AT และชี้ศัตรูเพื่อดูลำดับ | ทีละตัว | P [Nintendo: demo survey results](https://www.nintendo.com/us/whatsnew/triangle-strategy-debut-demo-survey-results-nintendo-switch) |
| Tactics Ogre: Reborn | ลำดับยืดหยุ่นตาม Recovery Time ที่ขึ้นกับ agility และอุปกรณ์ | ทีละตัว | S [RPGamer](https://rpgamer.com/2022/08/tactics-ogre-reborn-gets-more-details-images/) |
| War of the Visions | เรียงตาม CT/agility และการรอ (ไม่เดินหรือไม่ทำ action) ทำให้ได้ CT คืน | ทีละตัว | S [TouchTapPlay](https://www.touchtapplay.com/war-of-the-visions-ffbe-guide-tips-tricks-for-beginners/), S [altema (JP)](https://altema.jp/ffbewotv/mahouct) |
| Fire Emblem (ซีรีส์), Advance Wars, Mario + Rabbids | แบบเล่นทีละฝั่ง (เป็นที่รู้กันทั่วไป แต่รอบนี้ไม่ได้หาแหล่งมายืนยัน: **unconfirmed**) | — | — |

**Recommendation for Monster Tactics**
- **คง Side-based Turn ไว้** เกมมือถือที่ตั้งใจให้เล่นสั้นและง่าย (FEH, Langrisser) ใช้แบบนี้ ส่วนแบบเรียงตามความเร็ว (Sword of Convallaria, Triangle Strategy) ต้องมีแถบลำดับ และทำให้ Hotseat สลับเครื่องบ่อยกว่า
- **ยืนยัน ticket 01/02 (done)** activation แบบ "เดิน + action ลำดับไหนก็ได้ เปลี่ยน Unit แล้วจบ activation" ใกล้กับ Into the Breach (เดิน + อาวุธ 1 ครั้ง) dialog ยืนยันก่อนเปลี่ยน Unit ชดเชยการที่เราไม่มี "Undo Move ต่อ Unit"
- **ไม่มีข้อเสนอให้เปลี่ยน** การจำกัดจำนวน Unit ที่ทำได้ต่อ Turn ไม่ใช่สิ่งที่เกมในกลุ่มนี้ทำ (ยกเว้นจำนวน Unit ทั้งทีมที่เล็กอยู่แล้ว: FEH 4, Into the Breach 3, เรา 3)

## 5. Board size กับระยะ

| เกม | ขนาด Board | ระยะเดิน | ระยะโจมตี | grid / การวัดระยะ | แหล่ง |
|---|---|---|---|---|---|
| Fire Emblem Heroes | 8 ช่องสูง x 6 ช่องกว้าง ออกแบบให้พอดีจอมือถือ map ทำให้เล็กเพื่อความง่าย | Armored 1, Infantry 2, Flying 2, Cavalry 3 | **unconfirmed** สำหรับ FEH (ซีรีส์ใช้ 1–2 ดูแถวถัดไป) | ช่องสี่เหลี่ยม ส่วนทแยงยังไม่มีแหล่ง (**unconfirmed**) | S [FE Wiki: FEH](https://fireemblemwiki.org/wiki/Fire_Emblem_Heroes), S [Wikipedia](https://en.wikipedia.org/wiki/Fire_Emblem_Heroes), P [FEH guide 1080](https://new-guide.fire-emblem-heroes.com/en-US/feh-1080.html) |
| Fire Emblem (ซีรีส์) | ต่าง map | ตาม stat Mov (ตัวอย่างใน wiki 6) | อาวุธส่วนใหญ่ 1 หรือ 2 ธนู 2, longbow 2–3, เวท 1–2, siege 3–10 (หายาก) | ช่องสี่เหลี่ยม ระยะ 1 = ช่องที่ติดกัน การนับทแยงไม่ได้เขียนไว้ในเนื้อหา (**unconfirmed**) | S [FE Wiki: Range](https://fireemblemwiki.org/wiki/Range), S [FE Wiki: Movement](https://fireemblemwiki.org/wiki/Movement) |
| Into the Breach | 8x8 | **unconfirmed** | **unconfirmed** | ช่องสี่เหลี่ยม | S [PC Gamer](https://www.pcgamer.com/into-the-breach-preview/) |
| XCOM 2 | map ใหญ่แบบ 3D | 1 action point (น้ำเงิน) หรือ dash 2 action point (เหลือง) | ระยะปืนกับ % ที่ลดตามระยะ: **unconfirmed** | **unconfirmed** | S [Pixel Twelve](https://pixeltwelve.com/guides/xcom-2-beginner-guide-first-mission-cover-overwatch) |
| Langrisser Mobile | ต่าง map | ระยะเดินตายตัวต่อ Unit (ระยะโจมตีคำนวณต่อจากระยะเดิน) | **unconfirmed** | ช่องสี่เหลี่ยม | P [Langrisser Wiki ทางการ](https://us-news.zlongame.com/game/888.jhtml) |
| Sword of Convallaria, Triangle Strategy, Tactics Ogre, War of the Visions | มีความสูง (high/low ground) ส่งผล | **unconfirmed** | **unconfirmed** | **unconfirmed** | S [GameWith](https://gamewith.net/sword-of-convallaria/69373) |
| Mario + Rabbids Sparks of Hope | — | เดินอิสระภายในรัศมี ไม่ใช่ grid | — | ไม่ใช่ grid | S [Gamepressure](https://gamepressure.com/editorials/reviews/mario-rabbids-sparks-of-hope-review/z05d7) |

ไม่พบเกมในรายการที่ใช้ hex จากแหล่งที่อ่าน (**unconfirmed** ว่าไม่มีเลย)

### การคำนวณเอง: ระยะคุกคามเทียบกับขนาด Board

ส่วนนี้เป็นการคำนวณของเราเอง ไม่ได้มาจากแหล่งใด ใช้ start zone ตาม `packages/engine/src/deployment.ts` (ทีม A แถว 0–1, ทีม B สองแถวสุดท้าย) และ "ระยะคุกคาม" = ระยะเดิน + ระยะ skill ที่ไกลที่สุด (สูตรเดียวกับ Threat zone ใน ticket 11)

**พื้นที่ที่รัศมี r ครอบได้** (นับช่องบน Board ไม่จำกัดขนาด)

| r | Chebyshev (ทแยง = 1) | ทแยงสลับ 1-2 (นับแบบ max + ⌊min/2⌋) | Manhattan (ไม่มีทแยง) |
|---|---|---|---|
| 3 | 49 | 37 | 25 |
| 4 | 81 | 61 | 41 |

Board 7x7 มี 49 ช่อง Board 9x9 มี 81 ช่อง ระยะ 4 แบบ Chebyshev จากกลาง 7x7 จึงครอบทั้ง Board (ตรงกับคำบ่นใน playtest) การเปลี่ยนไปวัดแบบ Manhattan ลดพื้นที่ที่ระยะเดียวกันครอบได้ราวครึ่งหนึ่ง และแบบทแยงสลับลดลงราวหนึ่งในสี่

**ช่องว่างระหว่าง start zone** (ระยะตามแนวตรงจากแถวหน้าของฝั่งหนึ่งถึงแถวหน้าของอีกฝั่ง เท่ากันทุก metric เพราะเดินตรง)
- 7x7: แถว 1 → แถว 5 = **4**
- 9x9: แถว 1 → แถว 7 = **6**

ผลคือ Unit ที่ระยะคุกคาม ≥ ช่องว่าง โจมตีแถวหน้าของอีกฝั่งได้ตั้งแต่ Turn แรก ไม่ว่าวัดระยะแบบไหน
- 7x7, ปัจจุบัน (move 3 + ระยะ 4 = 7): ถึงทุกช่อง ระยะ Chebyshev ไกลสุดบน 7x7 คือ 6
- 7x7, variant (a) (move 3 + ระยะ 3 = 6): **ยังถึงทุกช่อง** แม้ move 2 + ระยะ 3 = 5 ก็ยังเกินช่องว่าง 4 การลดระยะใน data อย่างเดียว**ไม่สร้างช่วงเข้าหากัน**บน 7x7 ตราบที่ skill ระยะไกลยังเกิน 1
- 9x9, variant (a) (move 3 + ระยะ 3 = 6): เท่ากับช่องว่างพอดี จึงโจมตีแถวหน้าได้ใน Turn แรก แต่แถวหลัง (แถว 0) ปลอดภัย move 3 + ระยะ 2 = 5 จะไม่มีการโจมตีใน Turn แรก
- เทียบ FEH: Board ด้านยาว 8 ช่อง Unit ระยะไกลที่เร็วที่สุด (Cavalry 3 + ระยะ 2 ของซีรีส์) มีระยะคุกคาม 5 หรือประมาณ 60% ของด้านยาว ส่วนของเราบน 7x7 คือ 7/7 = 100% เกิน

**Recommendation for Monster Tactics**
- **ticket 08 ควรเพิ่ม variant (d) การวัดระยะ** (Manhattan หรือทแยงสลับ 1-2) เพราะ metric เป็นตัวที่ลดพื้นที่ที่ถูกคุกคามด้านข้างและมุม ทำให้มีที่ปลอดภัย แม้ไม่ได้ลดระยะตามแนวตรง เกมที่ใช้ระยะสั้นแบบ Fire Emblem ไม่นับระยะทแยงเป็น 1 แต่ยังหาข้อความยืนยันไม่ได้ (unconfirmed)
- **ticket 08 ควรทดลองระยะ 2–3 สำหรับ skill ระยะไกล** ไม่ใช่แค่ 4 → 3 และ Mark 5 → 4 ค่าเริ่มของ variant (a) ยังยาวกว่า benchmark (ธนู Fire Emblem 2, longbow 3) และจากตัวเลขข้างบนก็ยังครอบ 7x7 ทั้ง Board
- **ticket 08 ควรตั้งความคาดหวังของตัวชี้วัด "Turn ก่อนการโจมตีครั้งแรก" บน 7x7 ให้ถูก** ตามเรขาคณิตข้างบน บน 7x7 มีแค่ variant (c) terrain บัง line of sight ที่ทำให้ค่านี้ขึ้นได้ ส่วน (a) กับ (b) จะเห็นผลบน 9x9 ควรรัน 9x9 (ticket 15) ในชุดเดียวกับ ticket 08 แทนที่จะรอทีหลัง
- **ticket 09 ควรเลือกชุดจากผลทั้ง 7x7 และ 9x9** และพิจารณาให้ 9x9 เป็น Board ตั้งต้นของ Scenario ที่มี Unit ระยะไกลหลายตัว 7x7 เหมาะกับทีมสายประชิด
- **ยืนยัน ticket 15/16** การเพิ่ม 9x9 คู่กับ 7x7 สอดคล้องกับ benchmark ที่ใช้ Board ด้านยาว 8 ช่องขึ้นไป (FEH, Into the Breach) จากแหล่งที่หาได้ ไม่มีเกมไหนใช้ Board ด้านยาวต่ำกว่า 8

## 6. Hit chance และความสุ่ม

| เกม | สิ่งที่แสดง | การปรับที่ซ่อนอยู่ / ความ deterministic | ทรัพยากรแบบ reroll | แหล่ง |
|---|---|---|---|---|
| Fire Emblem (Binding Blade ถึง Awakening และ Three Houses) | hit % ใน combat forecast | **2RN**: ทอยสองลูกแล้วเฉลี่ย ทำให้ % สูงโดนบ่อยกว่าที่แสดง และ % ต่ำโดนน้อยกว่าที่แสดง | Divine Pulse (§2) | S [FE Wiki: True hit](https://fireemblemwiki.org/wiki/True_hit) |
| Fire Emblem Fates, Shadows of Valentia, Engage | hit % | **hybrid**: ต่ำกว่า 50% ตรงตามที่แสดง ตั้งแต่ 50% ขึ้นไปเทียบกับเส้นโค้งที่ช่วยผู้เล่น | Turnwheel / Time Crystal | S [FE Wiki: True hit](https://fireemblemwiki.org/wiki/True_hit) |
| XCOM 2 | โอกาสโดนและ damage ที่คาดก่อนยิง | aim assist ที่ซ่อนอยู่ มากที่สุดที่ Rookie ไม่มีที่ Legend (UFOpaedia อ่านจาก config ที่ผู้เล่นเปิดดูเอง) ผู้เล่นรายงานว่ามีโบนัสหลังยิงพลาดด้วย แต่ตัวเลขไม่ตรงกัน | ไม่มี | S [UFOpaedia](https://www.ufopaedia.org/index.php/Difficulty_(XCOM2)), C [Steam](https://steamcommunity.com/app/268500/discussions/0/412447331645399260) |
| Into the Breach | ไม่มี % การโจมตีโดนเสมอ ศัตรูประกาศการโจมตีล่วงหน้า | ผู้พัฒนาบอกว่าตั้งใจให้ deterministic ในการเล่นระดับวินาทีต่อวินาที ข้อยกเว้นคือโอกาสต้านทาน (Resist) ต่ำๆ ที่ใส่ไว้ให้มีโอกาสรอดเล็กน้อย | Reset Turn 1 ครั้ง | P [PC Gamer (คำพูด Matthew Davis)](https://www.pcgamer.com/into-the-breach-preview/), S [Cliqist (สัมภาษณ์ Justin Ma)](https://cliqist.com/2018/03/06/into-the-breach-building-a-better-mech-with-subset-games-justin-ma/) |
| Fire Emblem Heroes | combat forecast แสดง HP หลังการต่อสู้ | guide ทางการบอกว่า HP ที่ได้/เสียใน forecast ตรงกับผลจริงเสมอ (ตัวเลข damage ต่อครั้งอาจไม่รวมผลของ Special) จึงไม่มีความสุ่มในการโจมตี | ไม่มี | P [FEH guide 3460](https://new-guide.fire-emblem-heroes.com/en-GB/feh-3460.html) |
| Triangle Strategy | damage และ accuracy ที่คาดไว้ | **unconfirmed** | Quietus: ไอเทมใช้ครั้งเดียวต่อ battle เช่นหยุดศัตรูหรือย้ายพวกไกลๆ โดยไม่เสีย Turn | P [Nintendo: demo survey results](https://www.nintendo.com/us/whatsnew/triangle-strategy-debut-demo-survey-results-nintendo-switch), P [Nintendo AU: tips](https://www.nintendo.com/au/news-and-articles/ten-tactical-tips-for-triangle-strategy-tm/) |
| Mario + Rabbids (Kingdom Battle และ Sparks of Hope) | โอกาสโดนมีแค่ 3 ระดับ: 100% (ไม่มี cover), 50% (cover ครึ่ง), 0% (cover เต็ม) | ตั้งใจให้ % น้อยขั้น | ไม่มี | S [Gamepressure](https://gamepressure.com/editorials/reviews/mario-rabbids-sparks-of-hope-review/z05d7), S [Gfinity](https://www.gfinityesports.com/article/mario-and-rabbids-sparks-of-hope-preview-pulling-it-out-of-the-hat) |
| Advance Wars | damage ที่ preview แล้วบวก Luck 0–9% (CO บางคนมี Bad Luck) | โจมตีพลาดไม่ได้: **unconfirmed** | ไม่มี | S [Advance Wars Wiki](https://advancewars.fandom.com/wiki/Damage_Formula), S [AWBW Wiki](https://awbw.fandom.com/wiki/Luck) |
| Tactics Ogre: Reborn | **unconfirmed** | terrain มีผลต่อ hit rate | Chariot Tarot (§2) | S [RPG Site](https://www.rpgsite.net/news/13383-tactics-ogre-reborn-details-skills-battiefield-elements-unit-recruitment-the-wheel-of-fortune-the-chariot-tarot-rewind-feature-and-the-world-tarot-route-change-mechanic) |
| Sword of Convallaria, Langrisser Mobile, War of the Visions | **unconfirmed** | — | — | — |

**Recommendation for Monster Tactics**
- **ความคิดใหม่: แสดงโอกาสโดนจริงก่อนยืนยัน** ทุกเกมที่มีความสุ่มแสดงตัวเลขให้เห็น d20 ของเราคำนวณตรงได้ โอกาส p = (21 − ค่าที่ต้องทอยได้) / 20 ถ้า advantage = 1 − (1 − p)² ถ้า disadvantage = p² เช่นต้องทอยได้ 11 คือ 50% ถ้า advantage เป็น 75% ถ้า disadvantage เป็น 25% (กติกา natural 1/20 ของเกมต้องรวมด้วย) ใช้ในแผง Move preview (§1) และตอนเลือกเป้า engine เป็นคนคำนวณ แล้ว session ส่งออกแบบ additive
- **ไม่แนะนำ aim assist ที่ซ่อนไว้** ทั้ง 2RN ของ Fire Emblem และ aim assist ของ XCOM 2 ทำให้ % ที่แสดงไม่ตรงกับความจริง และขัดกับ Replay ที่ต้องอธิบายได้ ถ้าอยากให้ผู้เล่นรู้สึกว่าโชคดีขึ้น ให้ใช้กลไกที่มองเห็นได้
- **ยืนยัน ticket 01 (done)** Inspiration "reroll เฉพาะเมื่อพลาดหรือ save ไม่ผ่าน" ทำหน้าที่แบบเดียวกับโบนัสหลังยิงพลาดของ XCOM แต่เปิดเผยและให้ผู้เล่นตัดสินใจเอง ใกล้กับ Reset Turn ของ Into the Breach หรือ Quietus ของ Triangle Strategy (ทรัพยากรใช้ครั้งเดียวต่อ battle) เมื่อมีการแสดง % แล้ว ผู้เล่นจะตัดสินใจใช้ Inspiration ได้ดีขึ้น
- **ทางเลือกระยะยาว (นอก phase 1.x):** ถ้าระยะไกลยังแรงเกินหลังแก้ §5 ให้พิจารณาใช้ cover/line of sight แบบขั้น (เหมือน Mario + Rabbids ที่ 100/50/0) ซึ่งเข้ากับ variant (b) disadvantage และ (c) terrain ของ ticket 08 อยู่แล้ว

## 7. คำเตือน action ที่ยังไม่ใช้ / ยืนยันการจบ Turn

| เกม | วิธีทำงาน | แหล่ง |
|---|---|---|
| Fire Emblem Heroes | setting "Smart End": เปิดไว้ = เริ่ม Turn ศัตรูอัตโนมัติเมื่อ Unit ทุกตัวทำครบ, ปิด = รอผู้เล่นกด End Turn และมีโหมดกลางสำหรับ Unit ชนิดพิเศษ | P [FEH guide 3540](https://new-guide.fire-emblem-heroes.com/en-GB/feh-3540.html) |
| Into the Breach | ผู้เล่นรายงานว่ากด End Turn แล้วเกมเตือนว่ามี mech ที่ยังไม่ใช้ action | C [Steam](https://steamcommunity.com/app/590380/discussions/0/1694914735994664785) |
| XCOM 2 | guide สำหรับผู้เริ่มเล่นแนะนำให้ตรวจทหารที่ยังเหลือ action ก่อนกด End Turn ส่วนการที่เกมเตือนเองยังไม่มีแหล่ง (**unconfirmed**) | S [Pixel Twelve](https://pixeltwelve.com/guides/xcom-2-beginner-guide-first-mission-cover-overwatch) |
| Triangle Strategy | ต้องกดปุ่มเพื่อเข้า/ออกบ้าน เพื่อกันการกดพลาด (ตัวอย่างแนวคิดเดียวกันจาก feedback ของ demo) | P [Nintendo: demo survey results](https://www.nintendo.com/us/whatsnew/triangle-strategy-debut-demo-survey-results-nintendo-switch) |
| เกมอื่นในรายการ | **unconfirmed** | — |

**Recommendation for Monster Tactics**
- **ยืนยัน ticket 01/02 (done)** dialog ยืนยันก่อนเปลี่ยน Unit และคำเตือนตอนจบ Turn อยู่แนวเดียวกับ Into the Breach
- **ความคิดใหม่ (ความสำคัญต่ำ): setting จบ Turn อัตโนมัติแบบ Smart End ของ FEH** เปิดเมื่อทุก Unit ใช้ activation ครบแล้ว ค่าเริ่มควรเป็นปิด เพราะมี Undo ใน Turn ถ้าจบ Turn อัตโนมัติจะตัดโอกาส Undo ทิ้ง

---

## Recommended changes to phase 1.x (เรียงตามผลกระทบ)

1. **ticket 08: เพิ่ม variant (d) การวัดระยะ (Manhattan หรือทแยงสลับ) และลองระยะ 2–3 ให้ skill ระยะไกล** variant (a) ที่ลด 4 → 3 / 5 → 4 ยังครอบ 7x7 ทั้ง Board (§5) ตรงกับคำบ่นหลักของ playtest
2. **ticket 08/15: รันชุดทดลองบน 9x9 พร้อม 7x7 และตั้งความคาดหวังบน 7x7 ให้ถูก** บน 7x7 ช่องว่างระหว่าง start zone มีแค่ 4 ระยะคุกคามเกิน 4 จึงโจมตีได้ใน Turn แรกทุก metric มีแค่ terrain บัง line of sight (c) ที่แก้ได้ ticket 09 ควรเลือกชุดจากทั้งสองขนาด
3. **spec + ticket 11/12: ทบทวน "full-Board overlay" ที่อยู่ใน Out of Scope** ทุกเกมที่ตรวจใช้ overlay เปิดปิดได้ + แตะศัตรูดูระยะ ให้ ticket 11 คืนค่าต่อช่องของทั้ง Board (additive) เพิ่ม ticket UI สำหรับปุ่ม overlay และเขียนใน ticket 12 ว่าค่าประมาณนี้ "ประเมินสูง"
4. **ticket ใหม่ (Claude + Codex): แสดงโอกาสโดนต่อเป้าใน Move preview และตอนเลือกเป้า** ใช้ค่าจริงของ d20 + advantage ไม่มี assist ที่ซ่อนไว้
5. **spec, Undo: เขียนเหตุผลว่าทำไมห้ามข้ามการทอย** (Dice Seed ตายตัว = รู้ผลลูกถัดไป ซึ่ง Divine Pulse และ XCOM: EU ก็เป็นแบบนี้) และ ticket 07 ให้ปุ่มที่ถูกปิดบอกเหตุผล ticket 05 ไม่ต้องเปลี่ยนการออกแบบ
6. **ticket ใหม่ (ความสำคัญต่ำ): แตะศัตรูเพื่อดูระยะเดิน+ระยะโจมตี** และไฮไลต์ศัตรูที่ถึงช่อง preview (แบบ Engage) ใช้ข้อมูลจาก ticket 11
7. **ticket ใหม่ (ความสำคัญต่ำ): setting จบ Turn อัตโนมัติ** ค่าเริ่มปิด

สิ่งที่ benchmark **ยืนยัน** โดยไม่ต้องแก้: Move preview + ปุ่ม "เดิน" (03/04/18/19), Undo ถึงจุดปลอดภัยแบบไม่จำกัดครั้ง (05), Start over ด้วย Dice Seed ใหม่ (07), dialog เปลี่ยน Unit และคำเตือนจบ Turn (01/02), Inspiration เฉพาะเมื่อพลาด (01), Side-based Turn, Board 9x9 คู่ 7x7 (13–16)

## Open questions

1. **ระยะทแยงใน Fire Emblem/FEH/Into the Breach**: แหล่งที่อ่านได้บอกแค่ว่า "ระยะ 1 = ช่องติดกัน" ไม่ได้เขียนตรงๆ ว่านับทแยงหรือไม่ ถ้าจะใช้ข้อนี้เป็นเหตุผลหลักของ variant (d) ควรหาแหล่งยืนยัน (เช่นคู่มือทางการ)
2. **XCOM 2 กับ seed**: ข้อมูลว่าโหลดแล้วได้ผลเดิมเป็นของ XCOM: Enemy Unknown/Enemy Within ยังไม่ยืนยันว่า XCOM 2 เหมือนกัน
3. **Sword of Convallaria Backtrack**: จำนวนครั้งต่อ battle และการจัดการผลสุ่มหลังย้อนยังไม่มีแหล่ง เกมนี้ใกล้กับเรามากที่สุด (มือถือ มี Backtrack และ Danger Zone) จึงควรหาเพิ่มถ้าจะออกแบบ rewind ต่อ
4. **War of the Visions และ Langrisser**: ไม่มีแหล่งเรื่อง hit chance, rewind และขนาด map
5. **Engage**: ข้อมูลเส้นเล็งของศัตรูมาจากผลค้นหาของ Prima Games ที่เปิดหน้าเว็บไม่ได้ (403) ควรยืนยันอีกครั้งถ้าจะใช้เป็นต้นแบบ UI

## Sources

**Primary**
- Fire Emblem Heroes, Learn with Sharena (Nintendo): [Danger Area 1110](https://new-guide.fire-emblem-heroes.com/en-GB/feh-1110.html), [Combat forecast 3460](https://new-guide.fire-emblem-heroes.com/en-GB/feh-3460.html), [Settings 3540](https://new-guide.fire-emblem-heroes.com/en-GB/feh-3540.html), [Movement 1080](https://new-guide.fire-emblem-heroes.com/en-US/feh-1080.html)
- Nintendo, [TRIANGLE STRATEGY Debut Demo survey results](https://www.nintendo.com/us/whatsnew/triangle-strategy-debut-demo-survey-results-nintendo-switch)
- Nintendo AU, [Ten tactical tips for Triangle Strategy](https://www.nintendo.com/au/news-and-articles/ten-tactical-tips-for-triangle-strategy-tm/)
- Nintendo AU, [Advance Wars 1+2: Re-Boot Camp](https://www.nintendo.com/au/games/nintendo-switch/advance-wars-1-plus-2-re-boot-camp/)
- Nintendo AU, [Fire Emblem: Three Houses](https://nintendo.com/au/games/nintendo-switch/fire-emblem-three-houses)
- PlayStation Store, [Tactics Ogre: Reborn](https://www.playstation.com/en-nz/games/tactics-ogre-reborn/)
- Zlongame, [Langrisser Mobile Encyclopedia: Battle Rules](https://us-news.zlongame.com/game/888.jhtml)
- PC Gamer, [Into the Breach preview (คำพูดผู้พัฒนา)](https://www.pcgamer.com/into-the-breach-preview/)

**Secondary**
- Fire Emblem Wiki: [Turn rewind](https://fireemblemwiki.org/wiki/Turn_rewind), [True hit](https://fireemblemwiki.org/wiki/True_hit), [Combat forecast](https://www.fireemblemwiki.org/wiki/Combat_forecast), [Range](https://fireemblemwiki.org/wiki/Range), [Movement](https://fireemblemwiki.org/wiki/Movement), [Fire Emblem Heroes](https://fireemblemwiki.org/wiki/Fire_Emblem_Heroes)
- Wikipedia: [Fire Emblem Heroes](https://en.wikipedia.org/wiki/Fire_Emblem_Heroes), [Into the Breach](https://en.wikipedia.org/wiki/Into_the_Breach)
- GameWith, [Sword of Convallaria Battle System and UI Guide](https://gamewith.net/sword-of-convallaria/69373)
- UFOpaedia, [Difficulty (XCOM2)](https://www.ufopaedia.org/index.php/Difficulty_(XCOM2))
- Pixel Twelve, [XCOM 2 Beginner Guide](https://pixeltwelve.com/guides/xcom-2-beginner-guide-first-mission-cover-overwatch); Fextralife, [XCOM 2 Combat](https://xcom2.wiki.fextralife.com/Combat)
- Time, [Why XCOM's Random Results Sometimes Aren't](https://techland.time.com/?p=148165); GameBanshee, [XCOM: Enemy Within adds "Save Scum" option](https://gamebanshee.com/daf)
- RPG Site, [Tactics Ogre: Reborn details … Chariot Tarot](https://www.rpgsite.net/news/13383-tactics-ogre-reborn-details-skills-battiefield-elements-unit-recruitment-the-wheel-of-fortune-the-chariot-tarot-rewind-feature-and-the-world-tarot-route-change-mechanic); AV Club, [Tactics Ogre: Reborn review](https://www.avclub.com/tactics-ogre-reborn-review); RPGamer, [Tactics Ogre: Reborn details](https://rpgamer.com/2022/08/tactics-ogre-reborn-gets-more-details-images/); GamingBolt, [Tactics Ogre: Reborn AI improvements](https://gamingbolt.com/tactics-ogre-reborn-ai-improvements-reviving-units-training-battles-and-more-revealed)
- Nintendo Life, [Into the Breach review](https://nintendolife.com/reviews/switch-eshop/into_the_breach); Game Developer, [Road to the IGF: Into the Breach](https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-); Cliqist, [Interview with Justin Ma](https://cliqist.com/2018/03/06/into-the-breach-building-a-better-mech-with-subset-games-justin-ma/)
- Shacknews, [Advance Wars 1+2: Re-Boot Camp preview](https://www.shacknews.com/article/134936/advance-wars-1-2-reboot-camp-preview); Advance Wars Wiki, [Damage Formula](https://advancewars.fandom.com/wiki/Damage_Formula); AWBW Wiki, [Luck](https://awbw.fandom.com/wiki/Luck)
- Gamepressure, [Mario + Rabbids Sparks of Hope review](https://gamepressure.com/editorials/reviews/mario-rabbids-sparks-of-hope-review/z05d7); Gfinity, [Sparks of Hope preview](https://www.gfinityesports.com/article/mario-and-rabbids-sparks-of-hope-preview-pulling-it-out-of-the-hat)
- SuperCheats, [Three Houses danger radius](https://www.supercheats.com/fire-emblem-three-houses/walkthrough/danger-radius); Prima Games, [Enemy targeting in Fire Emblem Engage](https://primagames.com/tips/how-to-see-enemy-targeting-in-fire-emblem-engage) (หน้าเว็บตอบ 403 ใช้แค่ข้อความจากผลค้นหา)
- Pocket Gamer, [Langrisser Mobile battle tips](https://www.pocketgamer.com/langrisser-mobile/langrisser-mobile-cheats-and-tips-advanced-battle-tips-you-must-know/)
- TouchTapPlay, [War of the Visions beginner guide](https://www.touchtapplay.com/war-of-the-visions-ffbe-guide-tips-tricks-for-beginners/); altema (JP), [WOTV CT](https://altema.jp/ffbewotv/mahouct)

**Community**
- Steam (Into the Breach): [Reset Turn / pilot](https://steamcommunity.com/app/590380/discussions/0/2650805212053351822/?ctp=2), [end-turn warning](https://steamcommunity.com/app/590380/discussions/0/1694914735994664785)
- Steam (XCOM 2): [hidden aim modifiers](https://steamcommunity.com/app/268500/discussions/0/412447331645399260)

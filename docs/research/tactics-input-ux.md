# Tactics input UX: วิธีสั่ง Move + Action บนจอสัมผัส

ตรวจเมื่อ 2026-10-18 จากคำถามผู้ใช้: "อยากได้ UI ที่ move / action สะดวกกว่านี้ เช่น กดที่ tile แล้วเลือกได้เลยว่า move หรือ action อะไรที่ช่องนั้น ตามที่สามารถทำได้"
ใช้เฉพาะแหล่งสาธารณะ (คู่มือ/guide ทางการ, help page, store page, wiki, สื่อ และบทความ UX ที่ตีพิมพ์แล้ว) ไม่ได้แกะ client, APK หรือ network traffic ของเกมใด
ศัพท์ตาม `CONTEXT.md` (Unit, Turn, activation, Move, Action, Board, Move preview, Threat zone, Undo) และกฎตาม `docs/rules/rules.md` §14.3, §15, §16, §17.4–17.5
เอกสารคู่กัน: `docs/research/tactics-benchmark.md` (Move preview, Undo, Threat zone)

**ระดับแหล่ง** ใช้แบบเดียวกับ benchmark
- **P** (primary): คู่มือ/guide/help ทางการ, store page, คำพูดผู้พัฒนา, มาตรฐาน (W3C, Apple, Android)
- **S** (secondary): wiki ที่รู้จักกัน, สื่อ และบทความ UX (NN/g, UXmatters)
- **C** (community): โพสต์ผู้เล่น ถือว่าอ่อน

แหล่งที่มี **†** อ่านได้แค่ข้อความจากผลค้นหา (หน้าเว็บตอบ 403 หรือไม่ได้เปิด) จึงอ่อนกว่าแหล่งระดับเดียวกัน
**unconfirmed** = หาแหล่งยืนยันไม่ได้ในรอบนี้ จำนวนการแตะของเกมอื่นทั้งหมดเป็น **ค่าประมาณ** จากคำบรรยายในแหล่ง ไม่ได้นับจากการเล่นจริง

> **หมายเหตุเรื่อง "ตอนนี้"**: brief บอกว่าแตะช่องแล้ว "เดินทันที" แต่ main (19fe3c9) มี Move preview แล้ว ticket 03 (session) และ 04 (UI) เป็น done และ `packages/web/src/movePreviewSession.ts` ส่งการแตะช่องที่สว่างไป `previewMove` เอกสารนี้จึงนับ "ก่อน ticket 04" กับ "main ตอนนี้" แยกกัน

## Summary

- **เกมที่แหล่งบรรยายขั้นยืนยันไว้ (FEH, Fire Emblem, XCOM 2, XCOM: EU บน iPad) ไม่ให้การแตะบน Board ครั้งเดียวทำ action ที่ย้อนไม่ได้** ยกเว้นการลากของ FEH ที่ปล่อยนิ้วแล้วโจมตีเลย และแหล่งปี 2017 บอกว่าเกมมี setting ให้ถามยืนยันได้ (Advance Wars, Into the Breach, Sword of Convallaria, Langrisser: ขั้นยืนยัน **unconfirmed**) XCOM: Enemy Unknown บน iPad ใช้แตะซ้ำหรือปุ่มยืนยัน และผู้วิจารณ์ยังเล่าว่าเคยส่งทหารผิดช่องตอนนิ้วเลื่อนไปหาปุ่ม หลักที่ใช้ได้กับเราคือแตะเลือกได้กี่ครั้งก็ได้ แต่การทำจริงต้องผ่านปุ่มยืนยันที่อยู่นอก Board
- **Target-first เป็นทางลัดที่เกมหลักใช้กันมาก**: FEH ลาก Unit ไปวางบนศัตรู Fire Emblem ตั้งแต่ Shadow Dragon (DS) "วาง Unit บนศัตรูที่โจมตีได้" แล้วข้ามการเลือกอาวุธไปที่ combat forecast เลย ผู้เล่นชี้เป้าแทนการเลือกคำสั่ง เป็นวิธีที่ใช้การแตะน้อยที่สุด (ประมาณ 3 ครั้ง) ส่วนว่าเกมเลือกช่องที่จะยืนโจมตีให้อย่างไรยัง **unconfirmed** (แหล่งบอกแค่ว่าข้ามการเลือกอาวุธ)
- **Menu-after-move ยังเป็นพื้นฐาน** (Advance Wars: Fire/Wait/Capt, Fire Emblem: Attack/Item/Wait, Triangle Strategy, Tactics Ogre) แต่ใช้การกดราว 4–6 ครั้ง เกมมือถือรุ่นใหม่ (Sword of Convallaria, Langrisser Mobile) ย้ายเมนูนี้ไปเป็นแถบปุ่มถาวร (ability bar) คล้าย XCOM 2 ซึ่งตรงกับ TurnPanel ของเรา
- **ระบายสีช่องตามสิ่งที่ทำได้เป็นมาตรฐาน**: ช่องเดินได้สีน้ำเงิน ระยะโจมตีสีแดง (Langrisser, Sword of Convallaria) Triangle Strategy เพิ่มสีม่วงให้ช่องที่อยู่ในระยะศัตรู และเส้นแดงจากศัตรูที่ตีช่องนั้นได้ Langrisser ติดไอคอนดาบที่ศัตรูที่โจมตีได้ คำถามของผู้ใช้จึงต้องการสองส่วน คือป้ายบน Board บอกว่าจากช่องนี้ทำอะไรได้ และทางลัดให้สั่งจากป้ายนั้น
- **Forecast ขึ้นก่อนยืนยันเสมอเมื่อเลือกเป้าแล้ว** (FEH, Fire Emblem, XCOM 2, Triangle Strategy) การรวม Move + Action เป็นการยืนยันครั้งเดียวจึงต้องแสดงผลของ action หลังเดินก่อนกดยืนยัน
- **ขนาดเป้าแตะ**: Apple ให้ hit region อย่างน้อย 44x44 pt, Android 48x48 dp, WCAG 2.2 AA อย่างน้อย 24x24 CSS px (AAA 44x44) และ NN/g แนะนำ 1 cm Board 9x9 บนจอ 360–375 px ได้ช่องราว 36–38 px ซึ่งผ่าน AA แต่ต่ำกว่า Apple/Android ส่วน 7x7 ได้ราว 47–49 px เมื่อเป้าเล็ก ควรให้แตะเลือกได้เสมอ แต่ห้ามให้การแตะช่องเป็นการยืนยัน
- **ยืนยันด้วยขั้น preview ไม่ใช่ dialog** NN/g บอกว่าไม่ควรใช้ confirmation dialog กับ action ที่ทำเป็นประจำ เพราะผู้ใช้จะกดผ่านจนเป็นนิสัย ขั้น preview ที่บอกผลแล้วมีปุ่มยืนยัน (ซึ่งเรามีอยู่แล้ว) ทำหน้าที่นี้ได้ดีกว่า gesture แบบซ่อน (long-press, swipe) ไม่มี signifier จึงควรเป็นแค่ทางลัดเสริม
- **ข้อเสนอ**: เพิ่ม target-first (แตะ Unit → แตะศัตรูที่ติดป้าย → ยืนยัน = 3 ครั้ง) และปุ่มทางลัดในแผง Move preview (แตะ Unit → แตะช่อง → แตะศัตรู/ปุ่ม action → ยืนยัน = 4 ครั้ง) จากเดิม 6 ครั้ง ทั้งหมดเป็นงาน session แบบเพิ่มเท่านั้น ส่งเป็น action ของ engine ที่มีอยู่แล้ว 2 ตัวต่อกัน จึงไม่ขยับ ENGINE_VERSION

---

## 1. Menu-after-move (เดินก่อน แล้วเลือกคำสั่งจากเมนู)

**วิธีทำงาน**: เลือก Unit → เลือกช่อง (Unit ไปยืนช่องนั้น หรือเงา) → เมนูคำสั่งตามบริบทขึ้นมา → เลือกคำสั่ง → เลือกเป้า → forecast → ยืนยัน กด back ย้อนกลับเป็นขั้นได้

| เกม | รายละเอียด | การกด (ประมาณ) | แหล่ง |
|---|---|---|---|
| Advance Wars (GBA) / 1+2 Re-Boot Camp | หลังเดิน Command Menu ขึ้นพร้อมคำสั่งตามบริบท (CAPT, WAIT, FIRE, SUPPLY, JOIN, LOAD, DROP) FIRE ขึ้นเฉพาะเมื่อ Unit อยู่ในตำแหน่งที่โจมตีศัตรูได้ WAIT จบ Unit นั้น คู่มือ GBA เป็นแหล่งเดียว ส่วน Re-Boot Camp ใช้เมนูชุดเดียวกันหรือไม่ยัง **unconfirmed** | Unit → ช่อง → FIRE → เป้า = 4 ขั้นยืนยันหลังเลือกเป้า **unconfirmed** | P [AW GBA manual †](https://api.regvault.org/api/v1/game/gba/f4c2b2fda444dcec1274844b9a764d64/manual) |
| Fire Emblem (คลาสสิก, Fates, Three Houses, Engage) | หลังเดินมีเมนูตามบริบท ("Attack", "Item", "Wait") Attack → เลือกอาวุธ → forecast → A เปลี่ยนเป้าได้ด้วยซ้าย/ขวาบน forecast ส่วน Wait จบ Unit | Unit → ช่อง → Attack → อาวุธ → เป้า → ยืนยัน = 6 (ไม่นับการเลื่อน cursor) | S [FE Wiki: Combat forecast](https://www.fireemblemwiki.org/wiki/Combat_forecast), P [Shadow Dragon eManual †](https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/FESD_BL_NES_eManual_ENG), S [Gamer Guides: Fates †](https://www.gamerguides.com/fire-emblem-fates-birthright/guide/main-campaign/chapters-1-5/chapter-1-nohr) |
| Triangle Strategy | Unit ทำได้ move, attack หรือ ability หลังเดิน (หรือเลือกอยู่กับที่) ช่องระยะโจมตีเป็นสีแดง ชี้ศัตรูในช่องแดงแล้วเห็นข้อมูล หลัง demo เพิ่มการสลับคำสั่งขณะชี้ศัตรูเพื่อเทียบ damage/accuracy ลำดับเมนูที่แน่นอน **unconfirmed** | ~5–6 **unconfirmed** | P [Nintendo: Triangle Strategy tips](https://www.nintendo.com/us/whatsnew/tips-for-getting-started-with-triangle-strategy), P [Nintendo: demo survey results](https://www.nintendo.com/us/whatsnew/triangle-strategy-debut-demo-survey-results-nintendo-switch) |
| Tactics Ogre: Reborn | เมนูคำสั่งหลังเลือก Unit (เดิน/โจมตี/skill/รอ) รายละเอียด **unconfirmed** ในรอบนี้ | **unconfirmed** | — |

**บนมือถือ**
- ข้อดี: ผู้เล่นเห็นคำสั่งทั้งหมดที่ทำได้ ณ ช่องนั้น ซึ่งตรงกับที่ผู้ใช้ขอ ("เลือกได้เลยว่าทำอะไรที่ช่องนั้น ตามที่ทำได้") เมนูตามบริบทกันการเลือกคำสั่งที่ทำไม่ได้
- ข้อเสีย: ใช้การกดมากที่สุด และเมนูที่ขึ้นบน Board จะบังช่องข้างเคียงบนจอ 360 px บนคอนโซลไม่มีปัญหาเพราะใช้ปุ่ม A/B แต่บนจอสัมผัสทุกขั้นคือการแตะเพิ่ม
- Monster Tactics ตอนนี้เป็นแบบนี้ แต่เมนูเป็นปุ่มใน TurnPanel และเลือกได้ก่อนหรือหลังเดิน (§17.4)

## 2. Ability bar (แถบปุ่มถาวร แล้วแตะเป้า)

**วิธีทำงาน**: เลือก Unit แล้วมีแถบปุ่ม action ถาวร เลือก action → เป้าที่เลือกได้สว่าง → แตะเป้า → forecast → ยืนยัน การเดินกับ action แยกกัน

| เกม | รายละเอียด | การกด (ประมาณ) | แหล่ง |
|---|---|---|---|
| XCOM 2 (PC) | คลิกขวาที่ช่องเพื่อเดิน (ขอบน้ำเงิน 1 action point, เหลือง dash) แถบ Actions แสดงทุก action ของทหาร คลิกไอคอนครั้งแรกเพื่อดูผล action ที่ทำไม่ได้เป็นสีเทาพร้อมตัวเลข cooldown และมีไอคอนแดง/เหลือง/เทาบอกจำนวนศัตรูในสายตา ใน shot HUD เห็นโอกาสโดน damage และ crit มีปุ่ม confirm กับ Tab เพื่อเปลี่ยนเป้า | (ทหารถูกเลือกอยู่แล้ว) ช่อง → ไอคอน → (Tab) → ยืนยัน = 3–4 | P [XCOM 2 manual (Feral)](https://www.feralinteractive.com/en/manuals/xcom2/latest/steam/) |
| XCOM: Enemy Unknown (iPad) | สั่งเดินด้วยการแตะ แล้วยืนยันด้วยแตะซ้ำหรือปุ่มบนจอ เล็งด้วยการแตะเป้า ผู้วิจารณ์เล่าว่านิ้วที่เลื่อนไปหาปุ่มยืนยันทำให้ปลายทางเปลี่ยนจนทหารไปยืนที่โล่ง และอีกแหล่งบอกว่าการยืนยันขั้นที่สองช่วยลดคำสั่งพลาด | ช่อง → ยืนยัน → เป้า → ยืนยัน ≈ 4–5 (ลำดับยืนยันการยิง **unconfirmed**) | S [Shacknews](https://www.shacknews.com/article/79824/mobile-review-xcom-enemy-unknown), S [GameBanshee †](https://gamebanshee.com/d9w) |
| Into the Breach | เดินแล้วกด Undo Move ได้จนกว่าจะยิง (ดู benchmark §2) แล้วเลือกอาวุธ → เลือกช่องเป้า เวอร์ชันมือถือ (Netflix, 2022) ออกแบบ touch interface ใหม่ให้ใช้บนมือถือได้ ขยายปุ่มและพับแผงข้อมูล ส่วนว่าแตะเป้าครั้งเดียวยิงเลยหรือต้องแตะยืนยันซ้ำยัง **unconfirmed** | mech → ช่อง → อาวุธ → เป้า (→ ยืนยัน?) ≈ 4–5 | S [Wikipedia](https://en.wikipedia.org/wiki/Into_the_Breach), S [TouchArcade: interview †](https://toucharcade.com/2022/08/08/into-the-breach-mobile-interview-subset-games-ftl-nintendo-switch-netflix-games-ipad-iphone/) |
| Sword of Convallaria (มือถือ) | แถบปุ่มของตัวละคร: "Move" (เข้าหน้าเลือกช่อง), "Basic Attack/Skills" (แสดง cost), "Standby" (จบ action หลังเลือกช่องปลายทาง) ช่องเดินได้สีน้ำเงิน ระยะโจมตีไกลสุดสีแดง | Move → ช่อง → skill → เป้า (→ ยืนยัน?) ≈ 4–5 **unconfirmed** | S [GameWith](https://gamewith.net/sword-of-convallaria/69373) |
| Langrisser Mobile | แตะ hero แล้วเห็นช่องเดิน (น้ำเงิน) กับระยะโจมตี (แดง) แตะเพื่อเดิน แตะช่องเดิมเพื่อย้อนการเดินได้ฟรี ศัตรูที่โจมตีได้มีไอคอนดาบ skill อยู่ที่ปุ่มมุมขวาล่าง | hero → ช่อง → ศัตรู (→ ยืนยัน?) ≈ 3–4 **unconfirmed** | P [Langrisser Encyclopedia](https://us-news.zlongame.com/game/888.jhtml) (ช่องน้ำเงิน/แดง), S beginner guide ในผลค้นหา † (แตะช่องเดิมเพื่อย้อน, ไอคอนดาบ, ปุ่ม skill มุมขวาล่าง; ไม่รู้แน่ว่ามาจากหน้าไหนในรายการ เช่น [TouchArcade guide](https://toucharcade.com/2019/01/25/langrisser-guide-tips-cheats-strategies-and-how-to-play-free-longer/), [Pocket Gamer](https://www.pocketgamer.com/langrisser-mobile/quick-beginner-tips-for-langrisser-mobile/)) |
| War of the Visions FFBE | แตะช่องหรือลากเพื่อเดินในช่องสีน้ำเงิน ขั้นเลือก action/เป้า/ทิศ **unconfirmed** | **unconfirmed** | S [TouchTapPlay †](https://www.touchtapplay.com/war-of-the-visions-ffbe-guide-tips-tricks-for-beginners/) |
| Mario + Rabbids Sparks of Hope | เดินอิสระในรัศมี ไม่มี grid ระหว่างเดินทำ dash ชนศัตรูและ team jump บนพวกได้ (action ที่สอดอยู่ในการเดิน) แล้วจึงใช้อาวุธ/ability เป็นเกม controller ไม่ใช่จอสัมผัส | n/a (controller) | S [Gamepressure](https://gamepressure.com/editorials/reviews/mario-rabbids-sparks-of-hope-review/z05d7), S [Retro Dodo †](https://retrododo.com/mario-rabbids-sparks-of-hope-battle-guide/) |

**บนมือถือ**
- ข้อดี: ปุ่มอยู่ที่เดิมทุกครั้ง หาเจอง่าย ทำงานเหมือนกันทั้ง desktop และมือถือ ไม่บังช่องบน Board ปุ่มที่ปิดใช้บอกเหตุผล (cooldown) ได้ ตรงกับ `SkillButtons.tsx`
- ข้อเสีย: ผู้เล่นต้องเลือก action ก่อนจึงรู้ว่าตีใครได้ คำถามว่า "จากช่องนี้ทำอะไรได้บ้าง" ต้องตอบด้วยข้อมูลแยกอีกชุด (Move preview ของเรา, ไอคอนนับศัตรูของ XCOM 2, ไอคอนดาบของ Langrisser)

## 3. Target-first (แตะเป้า แล้วเกมหาช่องให้)

**วิธีทำงาน**: เลือก Unit → แตะศัตรูที่ "โจมตีได้ใน activation นี้" (รวมการเดิน) → เกมเลือกช่องที่จะยืนโจมตีให้ (หรือให้ผู้เล่นเลือกจากช่องที่ใช้ได้) และขึ้น forecast → ยืนยัน

| เกม | รายละเอียด | การกด (ประมาณ) | แหล่ง |
|---|---|---|---|
| Fire Emblem Heroes (ลาก) | ลาก Unit ไปค้างบนศัตรูเพื่อเปิด combat forecast ลองหลายคู่ได้จนกว่าจะปล่อย ถ้าปล่อยบนศัตรูจะโจมตีทันที ยกเลิกไม่ได้ (ลากกลับช่องเดิมก่อนปล่อยได้) assist กับพวกเดียวกันใช้วิธีเดียวกัน ช่องที่จะยืนโจมตีเลือกอย่างไร **unconfirmed** | 1 gesture (กด-ลาก-ปล่อย) | P [FEH guide 3460](https://new-guide.fire-emblem-heroes.com/en-GB/feh-3460.html), S [Perfectly Nintendo (อ้าง 4Gamer/IGN, 2017)](https://www.perfectly-nintendo.com/?p=185934) |
| Fire Emblem Heroes (แตะ) | แตะช่องสีน้ำเงินเพื่อเดิน ถ้ามีศัตรูในระยะก็โจมตีใน Turn เดียวกันได้ และเปลี่ยนทิศหรือ action ก่อนยืนยันได้ setting ให้ถามยืนยันได้ทั้งสองแบบ (แหล่งปี 2017 ชื่อ setting ปัจจุบัน **unconfirmed**) | Unit → ช่อง/ศัตรู → ยืนยัน ≈ 3 **unconfirmed** | S [Perfectly Nintendo](https://www.perfectly-nintendo.com/?p=185934), S [Time (2017) †](https://time.com/4638567/fire-emblem-heroes/), S [Twinfinite †](https://twinfinite.net/guides/fire-emblem-heroes-attack-how-to/) |
| Fire Emblem (ตั้งแต่ Shadow Dragon) | "วาง Unit บนศัตรูที่โจมตีได้" แล้ว forecast ขึ้นเลย ข้ามการเลือกอาวุธ เปลี่ยนอาวุธได้จาก forecast (X/Y) | Unit → วางบนศัตรู → ยืนยัน ≈ 3 | S [FE Wiki: Combat forecast](https://www.fireemblemwiki.org/wiki/Combat_forecast) |

**บนมือถือ**
- ข้อดี: ใช้การแตะน้อยที่สุด ผู้เล่นคิดเรื่อง "ตีใคร" ก่อน "ยืนตรงไหน" ซึ่งเป็นลำดับที่คนส่วนใหญ่คิด เป้าแตะคือตัวศัตรู (1 ช่อง) ไม่ต้องหาช่องว่างเล็กๆ ข้างศัตรู
- ข้อเสีย: ถ้าเกมเลือกช่องให้ ผู้เล่นอาจไม่ชอบช่องนั้น (Threat zone, ป่า, Hit and Run) จึงต้องเห็นเงาที่ช่องนั้นและเปลี่ยนช่องได้ก่อนยืนยัน การแตะศัตรูชนกับ "แตะศัตรูเพื่อดูระยะ" (ticket 22) ต้องตกลงกันว่าแตะแบบไหนหมายถึงอะไร (ดู §7)

## 4. Tile-first (แตะช่อง แล้วเลือกสิ่งที่ทำได้จากช่องนั้น)

**วิธีทำงาน**: เลือก Unit → แตะช่อง → เห็นเงาและรายการ action ที่ทำได้จากช่องนั้น → แตะ action/เป้า → ยืนยัน ต่างจาก menu-after-move ตรงที่ Unit ยังไม่เดินจริงจนยืนยัน และเลือก action ได้ในขั้นเดียวกัน

| เกม | รายละเอียด | แหล่ง |
|---|---|---|
| Fire Emblem Heroes (แตะ) | เปลี่ยนทิศหรือ action ได้ก่อนยืนยัน (ดูแถวด้านบน) | S [Perfectly Nintendo](https://www.perfectly-nintendo.com/?p=185934) |
| XCOM 2 | ระหว่างชี้ปลายทางเห็น cover ช่องที่ศัตรูมองเห็น (ตาแดง) และระยะ 1 หรือ 2 action point แต่เลือก action ล่วงหน้าไม่ได้ | P [XCOM 2 manual](https://www.feralinteractive.com/en/manuals/xcom2/latest/steam/) |
| Triangle Strategy | ช่องเดินได้สีน้ำเงิน = ปลอดภัย, ม่วง = อยู่ในระยะศัตรู และเส้นแดงบอกว่าศัตรูตัวไหนตีถึง | P [Nintendo: tips](https://www.nintendo.com/us/whatsnew/tips-for-getting-started-with-triangle-strategy) |
| Monster Tactics (main) | Move preview: เงา + แผงที่บอกว่า skill ไหนถึงศัตรูตัวไหนจากช่องเงา แต่ยังเป็นข้อความ ต้องกด "เดิน" ก่อน แล้วจึงเลือก action ในขั้นต่อไป | `packages/web/src/MovePreviewPanel.tsx` |

ไม่พบเกมเชิงพาณิชย์ที่เปิด **เมนูลอยบนช่อง** (context menu หรือ radial menu) หลังแตะช่องว่างบนจอสัมผัส เกมที่ตรวจทั้งหมดใช้แผง/แถบปุ่มที่ขอบจอ หรือ target-first (radial menu ในเกม tactics เป็น **unconfirmed** ในรอบนี้) บนจอ 360 px เมนูลอยรอบช่อง 36–38 px จะบังช่องข้างเคียง ซึ่งเป็นช่องที่ผู้เล่นอยากเห็นที่สุด จึงไม่แนะนำ

**บนมือถือ**
- ข้อดี: ตรงกับคำขอของผู้ใช้ที่สุด ต่อจาก Move preview ที่มีอยู่ได้เลย (ข้อมูล `movePreview.reach` มีแล้ว) และใช้กับ action ที่ไม่ใช่การโจมตีได้ (Defend, Cover, First Aid, Pack Howl)
- ข้อเสีย: แตะมากกว่า target-first 1 ครั้ง และต้องหาช่องที่ใช่เอง ถ้าไม่มีป้ายบน Board บอกว่าช่องไหนตีใครได้ ผู้เล่นต้องลองทีละช่อง

## 5. Drag-and-drop

FEH เป็นตัวอย่างหลัก (§3) ข้อดีคือ forecast ระหว่างลากโดยไม่ต้องยืนยัน แต่การปล่อยนิ้วคือการยืนยัน จึงเสี่ยงกดพลาด (ยกเลิกไม่ได้หลังปล่อย) บนเว็บ การลากบน canvas ต้องปิด scroll/zoom ของหน้า และนิ้วบังช่องที่กำลังจะวาง ซึ่งเป็นปัญหาที่ช่อง 36–38 px บน 9x9 XCOM: EU บน iPad มีปัญหาที่เกมสับสนระหว่าง gesture เลื่อนกล้องกับการเดิน (S [AppSpy †](https://www.appspy.com/review/7551/xcom-enemy-unknown))
ข้อเสนอ: ยังไม่ทำในรอบนี้ ถ้าจะเพิ่มทีหลัง ให้เป็นทางลัดเสริมที่จบที่ขั้น preview เหมือนการแตะ (ปล่อยแล้วแสดงเงา + forecast ไม่ทำ action ทันที)

## 6. Mobile touch UX: ขนาดเป้า, นิ้วโป้ง, การยืนยัน

| หัวข้อ | แนวทาง | แหล่ง |
|---|---|---|
| ขนาดเป้าแตะ | Apple: ปุ่มควรมี hit region อย่างน้อย 44x44 pt และระยะห่างระหว่าง control สำคัญพอๆ กับขนาด | P [Apple HIG: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), P [Apple HIG: Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) |
| | Android: element ที่แตะได้อย่างน้อย 48x48 dp | P [Android: Make apps more accessible](https://developer.android.com/guide/topics/ui/accessibility/apps) |
| | WCAG 2.2 SC 2.5.8 (AA): เป้าอย่างน้อย 24x24 CSS px หรือเว้นระยะให้วงกลม 24 px ไม่ทับกัน, SC 2.5.5 (AAA): 44x44 CSS px | P [W3C: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), P [W3C: Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) |
| | NN/g: อย่างน้อย 1 cm x 1 cm (จากงานของ Parhi, Karlson และ Bederson) และบริเวณที่นิ้วโป้งกดลงกว้างเฉลี่ยราว 2.5 cm เป้าเล็กทำให้ช้าและพลาด | S [NN/g: Touch Targets](https://www.nngroup.com/articles/touch-target-size/) |
| การถือเครื่อง | Hoober สังเกตผู้ใช้: ใช้มือเดียว 49%, ประคองสองมือแต่จิ้มนิ้วเดียว 36%, สองมือ 15% และสลับท่าระหว่างใช้งาน ปุ่มยืนยันควรอยู่ช่วงล่างของจอที่นิ้วโป้งถึง | S [UXmatters: How Do Users Really Hold Mobile Devices?](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php) |
| การยืนยัน | ใช้ confirmation dialog กับ action ที่มีผลร้ายแรง อย่าใช้กับ action ประจำ เพราะคำตอบจะกลายเป็นนิสัย และ dialog ต้องบอกผลที่จะเกิดให้ชัด | S [NN/g: Confirmation Dialogs](https://www.nngroup.com/articles/confirmation-dialog/) |
| gesture ซ่อน | gesture ที่ไม่มี signifier (swipe/long-press) ทำให้ผู้ใช้ไม่รู้ว่าใช้ได้ และ feature ที่ซ่อนไว้ค้นพบยาก | S [NN/g: Contextual Swipe](https://www.nngroup.com/articles/contextual-swipe/) |

**การคำนวณเอง: ขนาดช่องของ Board** (สมมติว่า Board กว้างเต็มจอลบ gutter 16 px สองข้าง ยังไม่ได้วัดจากหน้าจริง `TILE_SIZE` ภายในคือ 32 แล้ว scale)

| จอ | 7x7 | 9x9 |
|---|---|---|
| 360 px (กว้างใช้ได้ 328) | ~47 px | ~36 px |
| 375 px (กว้างใช้ได้ 343) | ~49 px | ~38 px |

สรุป: 7x7 ผ่าน 44 แต่ 9x9 (ticket 15/16) ต่ำกว่า Apple/Android แต่ผ่าน WCAG AA ข้อจำกัดที่ได้คือ
1. การแตะบน Board ต้อง "เลือก" เท่านั้น ห้าม "ทำ" การกระทำที่ย้อนไม่ได้
2. ปุ่มยืนยันอยู่ในแผงนอก Board ช่วงล่างของจอ สูงอย่างน้อย 44 px และไม่อยู่ใต้จุดที่เงาขึ้น
3. การแตะพลาดไปช่องที่ไม่สว่างระหว่าง preview/เล็ง ไม่ควรทิ้งทุกอย่างที่เลือกไว้ (ตอนนี้ `input` ล้างการเลือก Unit เมื่อแตะช่องที่ไม่สว่าง)
4. เป้าที่เป็นตัว Unit (ศัตรู) ใช้ง่ายกว่าช่องว่างข้างมัน จึงเป็นเหตุผลเพิ่มให้ใช้ target-first

---

## 7. Tap-count comparison

นับ "แตะ" = การแตะ/คลิก/กดเลือก 1 ครั้ง ไม่นับการเลื่อน cursor บนคอนโซล งาน: เดินไปช่องหนึ่งแล้วโจมตีศัตรูที่ยังไม่อยู่ในระยะจากช่องเดิม ไม่นับ dialog ยืนยันการเปลี่ยน Unit ของ ticket 02 (+2 เมื่อขึ้น) ขั้นถอยของ Hit and Run และ Inspiration (เกิดหลังยืนยัน และเท่ากันทุกแบบ)

| เกม / แบบ | ลำดับ | แตะ | ความมั่นใจ |
|---|---|---|---|
| FEH ลาก | กด Unit → ลากไปบนศัตรู (forecast) → ปล่อย | 1 gesture | P/S (2017) |
| FEH แตะ | Unit → ช่อง/ศัตรู → ยืนยัน | ~3 | unconfirmed |
| Fire Emblem (Shadow Dragon+) วางบนศัตรู | Unit → ศัตรู → ยืนยัน | ~3 | S |
| Fire Emblem เมนูคลาสสิก | Unit → ช่อง → Attack → อาวุธ → เป้า → ยืนยัน | ~6 | S |
| Advance Wars | Unit → ช่อง → FIRE → เป้า | ~4 | P† (ขั้นยืนยัน unconfirmed) |
| XCOM 2 (PC) | ช่อง → ไอคอน action → ยืนยัน (+ Tab ถ้าเปลี่ยนเป้า, + เลือกทหาร) | 3–4 | P |
| XCOM: EU (iPad) | ช่อง → ยืนยัน → เป้า → ยืนยัน | ~4–5 | S (บางขั้น unconfirmed) |
| Into the Breach | mech → ช่อง → อาวุธ → เป้า | ~4–5 | S (มือถือ unconfirmed) |
| Sword of Convallaria | Move → ช่อง → skill → เป้า | ~4–5 | unconfirmed |
| Langrisser Mobile | hero → ช่อง → ศัตรู | ~3–4 | unconfirmed |
| **Monster Tactics ก่อน ticket 04** | Unit → ช่อง (เดินทันที) → "โจมตี" → ศัตรู → "ยืนยันโจมตี" | 5 | โค้ด |
| **Monster Tactics main (Move preview)** | Unit → ช่อง (เงา) → "เดิน" → "โจมตี"/skill → ศัตรู → "ยืนยันโจมตี" | 6 | โค้ด |
| Monster Tactics main, Act-then-Move | Unit → "โจมตี" → ศัตรู → "ยืนยันโจมตี" → ช่อง → "เดิน" | 6 | โค้ด |
| **ข้อเสนอ: target-first** | Unit → ศัตรูที่ติดป้าย (เงาที่ช่องที่แนะนำ + forecast) → ยืนยัน | **3** | — |
| ข้อเสนอ: target-first + เปลี่ยนช่อง/skill | + แตะช่องอื่นที่ใช้ได้ และ/หรือ + แตะ chip skill | 4–5 | — |
| **ข้อเสนอ: tile-first** | Unit → ช่อง (เงา + ป้าย) → ศัตรู/ปุ่ม action → ยืนยัน | **4** | — |
| ข้อเสนอ: Act-then-Move | Unit → ศัตรูในระยะ (ช่องที่แนะนำ = ช่องเดิม) → ยืนยัน → ช่อง → "เดิน" | 5 | — |
| ทางสำรอง ถ้าคงคำตัดสิน Out of Scope แบบเคร่ง (ไม่แสดง % ก่อนเดินจริง) | Unit → ศัตรูที่ติดป้าย (เงา, ไม่มี %) → "เดิน" → (เล็งต่อให้อัตโนมัติ, เห็น %) → ยืนยัน | 4 | — |

Monster Tactics ตอนนี้ช้ากว่าเกม menu-after-move ทั่วไป 1–2 แตะ เพราะ Move preview เพิ่มขั้น "เดิน" และ action เลือกได้หลังเดินจริงเท่านั้น ข้อเสนอนี้ใช้การแตะเท่ากับ FEH แตะและ Fire Emblem วางบนศัตรู โดยยังคงขั้น preview ไว้

---

## 8. Recommended input design for Monster Tactics

หลักการ: Board ใช้เลือกเท่านั้น การทำจริงผ่านปุ่มยืนยันในแผงเสมอ ข้อมูลทุกอย่างมาจาก engine (คิดบนสำเนาของ Battle แบบ ticket 03) UI ไม่คิดกติกาเอง ของเดิมทั้งหมด (ปุ่มโจมตี/skill, Move preview + "เดิน") ยังใช้ได้

### 8.1 เลือก Unit
แตะ Unit แล้ว
- ช่องที่เดินได้สว่างเหมือนเดิม (Wispling: ช่อง Blink ใช้ขอบอีกแบบ ดู 8.5)
- **ป้ายดาบ** บนศัตรูทุกตัวที่ Unit นี้โจมตีได้ใน activation นี้ ทั้งจากช่องเดิม, หลัง Move หรือหลัง Blink (แบบ Langrisser) ศัตรูที่ตีได้จากช่องเดิมใช้ป้ายเข้ม ที่ต้องเดินก่อนใช้ป้ายจาง
- **จุดเล็กบนช่องที่เดินได้** ที่โจมตีใครได้อย่างน้อย 1 ตัว (แทนสีแดงของ Fire Emblem/SoC เพื่อไม่ชนกับ overlay Threat zone ของ ticket 12)

### 8.2 Target-first: แตะศัตรูที่ติดป้าย
1. แตะศัตรูที่ติดป้าย session ตั้งเป้านั้น และเลือก **ช่องที่จะโจมตีจาก** ตามกฎที่แน่นอนดังนี้:
   (ก) ถ้าตีจากช่องเดิมได้ ใช้ช่องเดิม ไม่เดิน (Act-then-Move และ Hit and Run ยังใช้ได้ครบ)
   (ข) ไม่อย่างนั้น เลือกช่องที่ต้องเดินน้อยก้าวที่สุด
   (ค) ถ้าเท่ากัน เลือกช่องที่ Threat zone ต่ำกว่า (เมื่อ ticket 11 merge แล้ว ก่อนหน้านั้นข้ามข้อนี้)
   (ง) ถ้ายังเท่ากัน เรียงตามลำดับช่อง (y แล้ว x) ให้ผลซ้ำได้ทุกครั้ง
2. เงาของ Unit ขึ้นที่ช่องนั้น ช่องอื่นที่ตีเป้านี้ได้สว่างเป็นตัวเลือก แตะช่องเหล่านั้นเพื่อย้ายเงา
3. แผงแสดง chip ของการโจมตีที่ถึงเป้าจากช่องนั้น (Basic Attack + skill ที่พร้อม) ค่าเริ่มคือ Basic Attack ถ้าใช้ได้ ไม่อย่างนั้นใช้ skill แรกตามลำดับ loadout พร้อมโอกาสโดนและ damage ที่คาด (`previewAction` บนสำเนาหลังเดิน)
4. ปุ่มยืนยันบอกสิ่งที่จะเกิดครบ เช่น "เดินไป C4 แล้ว Heavy Blow ใส่ Tidewall" ถ้าไม่ต้องเดินจะเหลือแค่ "Heavy Blow ใส่ Tidewall"

### 8.3 Tile-first: แตะช่องใน Move preview
1. แตะช่องที่สว่างแล้วได้ Move preview เหมือนเดิม (เงา, Threat zone, ปุ่ม "เดิน")
2. รายการ `reach` ในแผงเปลี่ยนจากข้อความเป็นปุ่ม: แต่ละศัตรูที่ถึงเป็นปุ่ม ส่วน Defend และ skill ที่ไม่ใช่การโจมตี (Pack Howl, Counter, Cover/First Aid ที่เล็งพวก) เป็นปุ่มด้วยถ้าใช้ได้หลังเดิน **ข้อนี้ต้องมีข้อมูลเพิ่ม**: `MoveReach` วันนี้มีแค่ Basic Attack กับ skill โจมตีที่พร้อม ticket 23 ต้องเพิ่ม field แบบ additive ที่บอก action อื่นที่ถูกกติกาจากช่องเงา (คิดบนสำเนาเดียวกัน)
3. **แตะศัตรูที่ติดป้ายบน Board ขณะมีเงา** = target-first โดยใช้ช่องเงาเป็นช่องที่จะโจมตีจาก (ถ้าตีจากช่องเงาไม่ได้ ใช้กฎ 8.2 ข้อ 1)
4. ยืนยันเหมือน 8.2 ข้อ 4 ปุ่ม "เดิน" (เดินอย่างเดียว) ยังอยู่

### 8.4 ความหมายของการยืนยันรวม
- session ส่ง action ของ engine ที่มีอยู่แล้วต่อกัน 2 ตัว คือ `move` (หรือ Blink) แล้วตามด้วย action ไม่มี action ใหม่ใน engine จึงไม่ขยับ ENGINE_VERSION Replay จึงมี 2 action เหมือนกับการเล่นทีละขั้น
- ต้องผ่าน guard เปลี่ยน Unit ของ ticket 02 เหมือน `confirmMove`/`confirmAttack`
- **Undo**: Move ไม่ทอยลูกเต๋า แต่การโจมตีทอย ดังนั้นหลังยืนยันรวมที่มีการโจมตี จุดปลอดภัยจะอยู่หลังการทอย และย้อนกลับไป "หลังเดิน" ไม่ได้ (§17.5) แผงยืนยันต้องบอกสั้นๆ ว่า "ทอยแล้วย้อนไม่ได้" ส่วน Move + Defend (ไม่ทอย) ยัง Undo ได้ทั้งคู่
- **animation**: `BattleSnapshot.events` เก็บแค่ events ของ action ล่าสุด และ `revision` เพิ่มทีละ 1 ต่อ action (`dispatch` ใน `session.ts`) ถ้าส่ง Move กับโจมตีติดกันในรอบเดียว view อาจเห็นแค่ events ของการโจมตีและ Unit จะกระโดดไปช่องใหม่ ticket 23 ต้องทำให้ events ของทั้งสอง action ถึง view ตามลำดับ (field ใหม่แบบ additive หรือ snapshot ทีละขั้น) โดยไม่เปลี่ยนความหมายของ `events`
- ถ้า engine ปฏิเสธ action ตัวที่สองหลังเดินแล้ว (ไม่ควรเกิด เพราะคิดจากสำเนาเดียวกัน) session ต้องย้อน Move นั้นเอง หรือ test ต้องพิสูจน์ว่าเกิดไม่ได้

### 8.5 กรณีตามกฎ
| กรณี | การจัดการ |
|---|---|
| Act-then-Move (§17.4) | กฎ 8.2 (ก) ใช้ช่องเดิมก่อน หลังโจมตีแล้ว Unit ยังเลือกอยู่ ช่องเดินได้ยังสว่าง แตะช่องแล้วกด "เดิน" ได้ตามเดิม |
| Hit and Run (§15) | ขั้นถอยฟรียังขึ้นหลังการโจมตีเหมือนเดิม (`state.pending.kind === 'retreat'`) แผงยืนยันบอกว่า "แล้วถอยได้ 1 ช่อง" ถ้า Unit ติด Pin ไม่บอก |
| Blink (Wispling) | session บอกว่าแต่ละช่องไปถึงด้วย Move, Blink หรือทั้งสองอย่าง ถ้าทั้งสอง ค่าเริ่มคือ Move และมี chip "Blink" ให้เลือก Blink ใช้ได้แม้ติด Pin และไม่ได้ +1 จาก Command หรือ Aquatic (engine จัดการ) ระหว่างนี้ Blink ยังเล็งผ่านปุ่ม skill ได้เหมือนเดิม |
| Camouflage (ฟรี, §15) | ไม่ใส่ในการยืนยันรวม เพราะ attack roll ทำให้ Hidden หลุด ลำดับที่คุ้มคือ Action ก่อนแล้วจึง Camouflage หลังยืนยันรวม ถ้า Unit ยืนบนป่าและ Camouflage ยังใช้ได้ ให้ปุ่ม Camouflage เด่นขึ้น |
| Tamer Command (§16) | ไม่เปลี่ยน ยังเป็นปุ่มแยก (ใช้ก่อน ระหว่าง หรือหลัง) ป้ายและช่องที่โจมตีได้ของ Monster ที่ได้ Command ขยับ +1 ต้องมาจาก engine จึงรวม +1 ไปแล้ว Cover/First Aid/Attune ของ Tamer อยู่ในปุ่มของ tile-first ได้ แต่ target-first ใช้กับศัตรูเท่านั้น |
| Taunted (§14.3) | engine ตัดสิน "ต้องโจมตีผู้ taunt" ตอนเริ่ม activation (`tauntDuty`) ถ้า `mustAttack` ศัตรูตัวอื่นไม่ติดป้าย และช่องที่เดินไปแล้วตีผู้ taunt ไม่ถึงจะทำให้เสีย Action (taunt.ts: Unit ที่เดินออกนอกระยะใช้ Action อื่นแทนไม่ได้) ช่องเหล่านี้ต้องมีป้ายเตือน "เดินไปแล้วใช้ Action ไม่ได้" ถ้าไม่ใช่ `mustAttack` ช่องที่เดินได้มีแค่ช่องที่ใกล้ผู้ taunt ที่สุดและไม่มีปุ่มโจมตี ทั้งหมดอ่านจาก legal actions บนสำเนา **ต้องตรวจใน ticket**: test เทียบกับการเล่นจริงทั้งสองกรณี |
| Burst (area) | รอบแรก: target-first ไม่ใช้กับ Burst (เป้าคือช่องกลาง ไม่ใช่ศัตรู) ใน tile-first ปุ่ม "Burst" เข้าโหมดเล็งพื้นที่จากช่องเงา ถ้าการเล็งจากช่องสมมติซับซ้อนเกินไป รอบแรกให้ Burst ต้องกด "เดิน" ก่อนเหมือนเดิม (ตัดสินใน ticket) |
| Pin / ไม่มีช่องเดิน | ป้ายดาบมีเฉพาะศัตรูที่ตีจากช่องเดิมได้ target-first ทำงานแบบไม่เดิน |
| Unit ที่เดินแล้ว | ไม่มีเงา target-first ใช้ช่องปัจจุบันเท่านั้น (เท่ากับ flow โจมตีเดิม แต่ไม่ต้องกด "โจมตี") |
| ระหว่าง pending (Inspiration, save, ขั้นถอย), Turn ของ AI, Hotseat ขณะส่งเครื่อง | คำสั่งใหม่ไม่ทำอะไร เหมือนคำสั่งเดิม (`humanMayAct`, `state.pending`) |
| ticket 22 (แตะศัตรูดูระยะ) | ขณะเลือก Unit อยู่และไม่ได้เล็ง: แตะศัตรูที่ **ติดป้าย** = target-first, แตะศัตรูที่ **ไม่ติดป้าย** = ดูระยะ (ticket 22) และการ์ดของศัตรูที่ติดป้ายมีปุ่ม "ดูระยะ" ไม่มี Unit ที่เลือก: แตะศัตรู = ดูระยะ |

### 8.6 กันการแตะพลาด
- การแตะบน Board ไม่ทำ action ที่ย้อนไม่ได้ ปุ่มยืนยันอยู่ในแผงล่าง สูงอย่างน้อย 44 px และอยู่ห่างจากปุ่มยกเลิก
- ระหว่างมีเงาหรือกำลังเล็ง การแตะช่องที่ไม่สว่างไม่ทำอะไร ไม่ล้างการเลือก ยกเลิกด้วยปุ่ม "ยกเลิก" หรือแตะ Unit ตัวเอง (ticket 18)
- ยังไม่ให้แตะเป้าซ้ำเพื่อยืนยัน (แบบ XCOM iPad) เพราะเป็นจุดที่ผู้วิจารณ์เล่าว่าพลาด ถ้าผู้เล่นขอเพิ่มหลัง playtest ค่อยทำเป็น setting ค่าเริ่มปิด
- long-press ใช้ได้แค่เป็นทางลัดเสริม (เช่นดูการ์ด) ห้ามเป็นทางเดียวไปถึง feature ใด (NN/g)
- ป้ายและเงาต้องอ่านได้บนช่อง 36 px (9x9) ใช้ screenshot ที่ 360 px ตรวจ

---

## 9. What this means for our tickets

**ยืนยัน ไม่ต้องแก้**
- **03/04 (done)**: Move preview คือฐานของ tile-first ข้อมูล `movePreview.reach` ใช้ทำปุ่มทางลัดได้เลย
- **18**: ยังต้องทำก่อน เพราะ "แตะ Unit ยกเลิกแค่ preview" เป็นทางยกเลิกหลักของ 8.6 ticket ใหม่ควร `Blocked by: 18` เพราะแก้โค้ดส่วนเดียวกันใน `session.ts`
- **19**: ไม่เปลี่ยน ticket UI ใหม่ควร `Blocked by: 19` (ไฟล์ `BattleScene.ts` เดียวกัน)
- **02 (done)**: guard เปลี่ยน Unit ใช้ต่อ ต้องครอบคำสั่งยืนยันรวมด้วย (ใส่ใน ticket UI ใหม่)
- **spec Out of Scope "hit % ใน Move preview"**: ข้อเสนอนี้ไม่ขัด เพราะรายการใน preview ยังไม่มี % ตัวเลขขึ้นหลังผู้เล่นเลือกเป้าแล้วเท่านั้น ซึ่งตรงกับคำตัดสิน 2026-10-18 "hit chance is shown when aiming an attack" **แต่ต้องให้ผู้ใช้ยืนยัน** เพราะการเล็งจากช่องเงาใกล้กับสิ่งที่ถูกปฏิเสธไป

**ต้องปรับข้อความ**
- **11/12 (Threat zone)**: เพิ่มใน 11 ว่า helper ใช้เป็น tie-break ของกฎ 8.2 ได้ (ถ้า 11 merge ก่อน ticket session ใหม่) เพิ่มใน 12 ว่าสี overlay ต้องไม่ชนกับป้ายดาบและจุดบอกช่องที่โจมตีได้
- **21/22 (ระยะศัตรู)**: แก้เกณฑ์ใน 22 จาก "ระหว่างเล็ง แตะศัตรู = เลือกเป้า" เป็นกฎในตาราง 8.5 (ติดป้าย = target-first, ไม่ติดป้าย = ดูระยะ) และเพิ่มปุ่ม "ดูระยะ" บนการ์ด ticket 22 กับ ticket UI ใหม่แก้จุดเดียวกัน ใครทำทีหลังต้อง merge `origin/main` แล้วรัน check ใหม่

**ticket ใหม่ที่เสนอ** (เลขชั่วคราว ยังไม่สร้างไฟล์ คู่ Claude + Codex ตาม AGENTS.md)

1. **23 — Attack plans ใน session: target-first และยืนยัน Move + Action รวม** (`Owner: claude`, `Blocked by: 18`)
   ทุกอย่างเพิ่มแบบ additive ไม่เปลี่ยนความหมายของ `input` หรือคำสั่งเดิม (contract rule):
   - snapshot: `attackable` (ศัตรูที่ Unit ที่เลือกโจมตีได้ใน activation นี้ พร้อมบอกว่าต้องเดินหรือไม่), `attackFromTiles` (ช่องที่เดินได้ซึ่งโจมตีใครได้อย่างน้อย 1 ตัว), ต่อช่องบอก via Move/Blink และช่องที่ทำให้เสีย Action เพราะ Taunted
   - snapshot ของ Move preview: field ใหม่ที่บอก action ที่ไม่ใช่การโจมตีซึ่งถูกกติกาจากช่องเงา (Defend, Pack Howl, Counter, Cover, First Aid ฯลฯ) เพราะ `MoveReach` มีแค่การโจมตี
   - คำสั่ง: `aimTarget(unit)` (target-first ใช้กฎ 8.2 กับช่องเงาถ้ามี), `chooseOrigin(tile)`, `choosePlanAction(…)` (เลือก action ใดก็ได้ของแผน ทั้งการโจมตีและ Defend/skill อื่น ไม่ใช่แค่การโจมตี), `confirmPlan()` (ส่ง Move/Blink แล้วตามด้วย action)
   - events ของ Move และ action ถึง view ครบตามลำดับ (ดู 8.4 animation) ไม่เปลี่ยนความหมายของ `events`/`revision`
   - snapshot ของแผน: ช่องที่จะโจมตีจาก, ช่องอื่นที่เลือกได้, การโจมตีที่ถึง, `preview` (โอกาสโดน/damage จาก `previewAction` บนสำเนาหลังเดิน) และลำดับ action ที่จะส่ง
   - เกณฑ์: test เทียบแผนกับการเล่นจริงทุกช่องและทุกเป้า (แบบ test ของ ticket 03) รวม line of sight/Hidden, Taunted ทั้งสองกรณี, Pin, Blink, Command +1 และ Burst (ถ้าทำ); กฎเลือกช่องให้ผลเดิมทุกครั้ง; Undo หลัง Move + Defend ย้อนได้ทั้งคู่ หลัง Move + โจมตีย้อนข้ามการทอยไม่ได้; Replay มี 2 action; Hotseat ฝั่ง B; ไม่มีผลระหว่าง pending/Turn ของ AI; ENGINE_VERSION ไม่เปลี่ยน; README ของ session อัปเดต
   - helper ใน engine ที่ช่วยเรื่องความเร็วทำได้ ถ้าไม่เปลี่ยนผลของ action ใดก็ไม่ต้อง bump
2. **24 — UI: ป้ายโจมตีได้, target-first และปุ่มทางลัดใน Move preview** (`Owner: codex`, `Blocked by: 23, 19`)
   ป้ายดาบและจุดบอกช่องที่โจมตีได้ตาม 8.1; wrapper ใน web ส่งการแตะศัตรูไป `aimTarget` ตามกฎ 8.5 (แบบเดียวกับ `withMovePreview`); เงาที่ช่องที่แนะนำและช่องอื่นที่เลือกได้; chip skill; ปุ่มยืนยันที่บอกครบว่าจะเกิดอะไร (รวม "ทอยแล้วย้อนไม่ได้" และ "ถอยได้ 1 ช่อง"); `reach` ในแผง Move preview เป็นปุ่ม; ยืนยันผ่าน guard ของ ticket 02; แตะช่องที่ไม่สว่างระหว่างเล็งไม่ล้างการเลือก; ข้อความใน strings + text test; screenshot ที่ desktop, 360 px, 7x7 และ 9x9 (ถ้า 16 merge แล้ว) ไม่มี horizontal scroll; CI เขียวทั้งสาม job

**ยังไม่เปิด ticket (รอ playtest)**: ลากแบบ FEH, setting แตะเป้าซ้ำเพื่อยืนยัน, Burst แบบ target-first, ป้ายบอกช่องปลอดภัย/อันตรายแบบ Triangle Strategy บนช่องที่เดินได้ (ต่อยอดจาก ticket 11/12)

ลำดับที่แนะนำ: 18 → 23 → (19) → 24 แล้วจึง 21/22 เพราะ 22 ต้องใช้กฎการแตะศัตรูจาก 24 ticket 23 ไม่ชนกับ 11 ในโค้ด engine แต่แก้ snapshot ใน `session.ts` เหมือนกัน ใครทำทีหลังต้อง merge `origin/main` ก่อน

## Open questions

1. **ผู้ใช้ยืนยันได้ไหมว่า % ที่ขึ้นหลังเลือกเป้าจากช่องเงาไม่ขัดกับคำตัดสิน Out of Scope 2026-10-18** ("hit chance is shown when aiming an attack, not while previewing a move") ถ้าคงคำตัดสินแบบเคร่ง การยืนยันรวมจะแสดง % ก่อนยืนยันไม่ได้ ซึ่งขัดกับหลัก "forecast ก่อนยืนยัน" (Summary ข้อ 5) ทางสำรองคือเดินก่อนแล้วเล็งต่อ: Unit → ศัตรู → "เดิน" → ยืนยัน = 4 แตะสำหรับ target-first (แทน 3) และ tile-first = 5 (แทน 4) ยังเร็วกว่า main (6)
2. **ช่องที่แนะนำของ target-first**: "เดินน้อยก้าวที่สุด" อาจพา Unit ไปยืนช่องอันตราย ก่อนมี ticket 11 จะมีแค่เงาให้ผู้เล่นตรวจเอง ต้อง playtest
3. **FEH เลือกช่องโจมตีอย่างไรเมื่อลาก/แตะศัตรู** และชื่อ setting ยืนยันปัจจุบัน ยังไม่มีแหล่ง ถ้าจะลอกพฤติกรรมให้ตรง ควรหาแหล่งที่ใหม่กว่า 2017
4. **Into the Breach, Sword of Convallaria และ Langrisser บนมือถือมีขั้นยืนยันการโจมตีหรือไม่** ยัง unconfirmed ทั้งหมด จำนวนแตะในตาราง §7 จึงเป็นค่าประมาณ
5. **ขนาดช่องจริงบนจอ**: ตัวเลขใน §6 คำนวณจากความกว้างจอ ควรวัดจาก screenshot 360 px ของ ticket 16 เมื่อ 9x9 มีใน UI

## Sources

**Primary**
- Fire Emblem Heroes, Learn with Sharena (Nintendo): [Combat forecast 3460](https://new-guide.fire-emblem-heroes.com/en-GB/feh-3460.html)
- Nintendo, [Shadow Dragon (NES) eManual](https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/FESD_BL_NES_eManual_ENG) †
- Advance Wars (GBA) manual (Nintendo) ผ่าน mirror ของบุคคลที่สาม regvault: [manual](https://api.regvault.org/api/v1/game/gba/f4c2b2fda444dcec1274844b9a764d64/manual) †
- Nintendo, [Tips for getting started with TRIANGLE STRATEGY](https://www.nintendo.com/us/whatsnew/tips-for-getting-started-with-triangle-strategy); [Debut Demo survey results](https://www.nintendo.com/us/whatsnew/triangle-strategy-debut-demo-survey-results-nintendo-switch)
- Feral Interactive, [XCOM 2 manual](https://www.feralinteractive.com/en/manuals/xcom2/latest/steam/) (Action points, Actions, Controls)
- Zlongame, [Langrisser Mobile Encyclopedia: Battle Rules](https://us-news.zlongame.com/game/888.jhtml)
- Apple Human Interface Guidelines: [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- Android Developers, [Make apps more accessible](https://developer.android.com/guide/topics/ui/accessibility/apps)
- W3C, [Understanding SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [Understanding SC 2.5.5 Target Size (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)

**Secondary**
- Fire Emblem Wiki, [Combat forecast](https://www.fireemblemwiki.org/wiki/Combat_forecast)
- Perfectly Nintendo, [Fire Emblem Heroes: plenty of details (อ้าง 4Gamer/IGN, 2017-01-31)](https://www.perfectly-nintendo.com/?p=185934); Time, [Fire Emblem Heroes preview (2017)](https://time.com/4638567/fire-emblem-heroes/) †; Twinfinite, [How to attack in FEH](https://twinfinite.net/guides/fire-emblem-heroes-attack-how-to/) † (403)
- Gamer Guides, [Fire Emblem Fates: Chapter 1](https://www.gamerguides.com/fire-emblem-fates-birthright/guide/main-campaign/chapters-1-5/chapter-1-nohr) †
- Shacknews, [Mobile review: XCOM: Enemy Unknown](https://www.shacknews.com/article/79824/mobile-review-xcom-enemy-unknown); GameBanshee, [XCOM: EU iOS preview and interview](https://gamebanshee.com/d9w) †; AppSpy, [XCOM: EU iPad review](https://www.appspy.com/review/7551/xcom-enemy-unknown) †
- Wikipedia, [Into the Breach](https://en.wikipedia.org/wiki/Into_the_Breach); TouchArcade, [Into the Breach mobile interview](https://toucharcade.com/2022/08/08/into-the-breach-mobile-interview-subset-games-ftl-nintendo-switch-netflix-games-ipad-iphone/) † (403)
- GameWith, [Sword of Convallaria Battle System and UI Guide](https://gamewith.net/sword-of-convallaria/69373)
- Langrisser Mobile beginner guides จากผลค้นหา (ไม่รู้แน่ว่าข้อความไหนมาจากหน้าไหน): TouchArcade, [Langrisser guide](https://toucharcade.com/2019/01/25/langrisser-guide-tips-cheats-strategies-and-how-to-play-free-longer/) †; Pocket Gamer, [Quick beginner tips](https://www.pocketgamer.com/langrisser-mobile/quick-beginner-tips-for-langrisser-mobile/) †
- Gamepressure, [Mario + Rabbids Sparks of Hope review](https://gamepressure.com/editorials/reviews/mario-rabbids-sparks-of-hope-review/z05d7); Retro Dodo, [Sparks of Hope battle guide](https://retrododo.com/mario-rabbids-sparks-of-hope-battle-guide/) †
- TouchTapPlay, [War of the Visions beginner guide](https://www.touchtapplay.com/war-of-the-visions-ffbe-guide-tips-tricks-for-beginners/) †
- Nielsen Norman Group: [Touch Targets on Touchscreens](https://www.nngroup.com/articles/touch-target-size/), [Confirmation Dialogs Can Prevent User Errors](https://www.nngroup.com/articles/confirmation-dialog/), [Contextual Swipe](https://www.nngroup.com/articles/contextual-swipe/)
- Steven Hoober, UXmatters, [How Do Users Really Hold Mobile Devices?](https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php)

**ในโค้ดของเรา** (main 19fe3c9): `packages/session/src/session.ts` (`previewMove`, `confirmMove`, `confirmAttack`, `cancel`, `input`), `packages/session/src/port.ts`, `packages/engine/src/taunt.ts`, `packages/web/src/movePreviewSession.ts`, `MovePreviewPanel.tsx`, `TurnPanel.tsx`, `SkillButtons.tsx`, `actionConfirmation.ts`, `packages/battle/src/boardGeometry.ts`, `.scratch/phase-1x-playtest-feedback/spec.md` และ issues 02–04, 11, 12, 18, 19, 21, 22

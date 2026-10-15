# data/statuses/

นิยาม status หนึ่งไฟล์ต่อหนึ่ง status ตรวจด้วย `StatusTypeSchema` (packages/shared/src/combatData.ts)

## เก็บอะไร
- `polarity`: `positive` / `negative`
- `duration`: `{ kind: 'turns', turns }` นับลดตอนจบ Turn ของฝั่งที่ติด (ติดใน Turn ของฝั่งตัวเองข้ามการนับครั้งแรก D-02), `untilOwnTurnStart` (หลุดตอนเริ่ม Turn ถัดไปของฝั่งตัวเอง ก่อน Bleed tick), `untilAttackRoll` (Off-balance), `untilBroken` (Hidden)
- `stacking`: `reset` (ติดซ้ำ = เริ่มนับใหม่ ไม่ซ้อน) หรือ `keepHigher` (Guarded เก็บโบนัสที่สูงกว่า)
- `tracksSource`: จำ Unit ที่ทำให้ติด (Taunted)
- `effects`: `startOfTurnDamage` (Bleed), `attackRoll` (Rallied), `defenceFromSource` (Guarded: โบนัสมาจาก skill ที่ให้), `immobile` (Pin), `damageDealt` (Weakened), `attackersRollMode` (Marked), `nextAttackRollMode` (Off-balance), `untargetableFrom` (Hidden), `forcedToAttackSource` (Taunted), `counterattack` (Countering)

## อ้างอิง PRD
- F3 Tactical grid battle

## แนวทาง/กฎการตั้งชื่อ
- `<status_id>.json` เช่น `bleed.json`, `off_balance.json`
- save stat อยู่ที่ skill ที่ให้ status (`applies[].save`) ไม่ใช่ที่ status

## สถานะ
- มีครบ 10 status ของ phase 1 (rules §14.2)
- engine ใช้ effect แล้ว: `startOfTurnDamage`, `attackRoll`, `defenceFromSource`, `immobile` (ticket 07)
- effect ที่เหลือมีตัวเลขใน data แล้ว engine จะอ่านใน ticket ของ skill ที่ให้ status นั้น (08 Taunted/Countering, 09 Weakened, 10 Marked/Hidden, 11 Off-balance)

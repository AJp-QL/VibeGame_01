# data/elements/

element wheel (rules §4.1) ไฟล์เดียว `element_wheel.json` ตรวจด้วย `ElementWheelSchema` (packages/shared/src/combatData.ts)

## เก็บอะไร
- `beats`: ธาตุแต่ละตัวชนะธาตุใดบ้าง (ป่า > น้ำ > ภูเขา > ทะเลทราย > ป่า, แสงกับมืดชนะกันและกัน D-08)
- engine ใช้ทั้ง advantage/disadvantage ของธาตุ (§4.2) และ terrain (§4.3)

## แนวทาง
- ต้องมี `element_wheel.json` เสมอและมีได้ไฟล์เดียว (`loadGameData` ตรวจ) ธาตุชนะตัวเองไม่ได้

# Engine เขียนด้วย TypeScript และใช้คณิตศาสตร์จำนวนเต็มเท่านั้น

Engine ต้องรันได้ทั้งใน browser และบน server (ตรวจ Rarity Roll และ replay) และ replay จาก Dice Seed ต้องได้ผลเดิมทุกเบราว์เซอร์ จึงเขียน engine ใหม่ด้วย TypeScript ตัวเดียวใช้ทุกที่ และห้ามใช้ทศนิยมในกติกา ตัวคูณอย่าง x1.2 เขียนเป็น x12 / 10 ปัดลง ส่วน Python simulator เดิมเก็บไว้เป็นตัวอ้างอิงเทียบผล ไม่ได้เป็นส่วนของเกม

**Considered Options**: แปลง Python เป็น WASM (เพิ่ม toolchain และ bundle ใหญ่); ใช้ float ปกติ (เสี่ยงผลต่างข้ามเครื่องจน replay ไม่ตรง)

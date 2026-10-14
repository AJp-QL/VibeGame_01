# UI ใช้ React เป็นโครง และ Phaser วาด Battle ตั้งแต่ phase 1

Phase 1 มีแค่ Battle แต่ phase 2 จะมี ranch ซึ่งเป็น UI แบบฟอร์มและเมนูเยอะ เราจึงวางโครงแบบ hybrid ตั้งแต่แรก: React ดูแลเมนูและ UI ทั่วไป ส่วน Phaser วาด Board และ animation ทั้งสองฝั่งไม่เก็บ state ของเกมเอง แต่ทำแค่อ่าน state จาก engine และส่ง action กลับไป เส้นแบ่งระหว่างสอง stack จึงอยู่ที่ engine เท่านั้น ข้อเสียที่ยอมรับคือต้องดูแลสอง stack ตั้งแต่ phase 1

**Considered Options**: React + Canvas เขียนเอง (ต้องทำ input และ animation เองทั้งหมด); Phaser อย่างเดียว (UI ranch แบบฟอร์มทำยาก ต้องรื้อตอน phase 2)

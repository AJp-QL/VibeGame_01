# Repo เป็นต้นฉบับของกติกาเกม ไม่ใช่ PRD

PRD ต้นฉบับอยู่ใน Claude Docs และ `prototype/rules/` เป็นชุด v1–v4 ที่ต้องอ่านซ้อนกัน ซึ่งเริ่มขัดกันแล้ว (v4 ข้อ 5 เรื่อง Command กับการป้องกัน Tamer ขัดกับ PRD และ decision log) เราจึงให้ repo เป็นต้นฉบับ: กติกาอยู่ในเอกสาร rules ฉบับรวมเดียวใน repo ตัวเลขอยู่ใน `data/` ส่วน PRD เหลือแค่ vision และ scope แล้วลิงก์มาที่ repo เหตุผลคือ AI agent ที่เขียน engine อ่านได้แค่ repo และกติกาต้องอยู่ที่เดียวกับที่ engine อ่าน

**Considered Options**: PRD ใน Claude Docs เป็นต้นฉบับแล้ว export เข้า repo; ใช้ทั้งสองที่แล้วซิงก์ด้วยมือ ทั้งสองแบบทำให้ engine อ่านกติกาที่ล้าหลังได้

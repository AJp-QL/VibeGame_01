# 31 — CI: pin runner เป็น ubuntu-24.04

**Owner:** claude

**What to build:** GitHub ย้าย `ubuntu-latest` ไปเป็น Ubuntu 26 ตั้งแต่ 2026-10-19 job ทั้งหมดใน `.github/workflows/ci.yml` และ `deploy.yml` ใช้ `ubuntu-latest` อยู่ และ job ภาพของ ticket 26 อาศัย Chromium ที่ pin ไว้ซึ่งใช้ library ของระบบ การเปลี่ยน image อาจทำให้ภาพ baseline เปลี่ยนโดยไม่ได้แก้อะไร จึง pin runner เป็น `ubuntu-24.04` ทุก job เปลี่ยนไปใช้ image ใหม่ภายหลังเป็น ticket แยกที่ต้องสร้าง baseline ใหม่ด้วย

**Blocked by:** None — can start immediately

**Status:** done

- [x] ทุก job ใน ci.yml และ deploy.yml ใช้ `runs-on: ubuntu-24.04` พร้อม comment บอกเหตุผล
- [x] CI ทั้งสาม job เขียวบน PR

# P1X-12 — UI: Threat zone ในแผง Move preview และ overlay ทั้ง Board

**Owner:** codex

**What to build:** แผง Move preview แสดง "⚠ N" สำหรับช่องที่กำลังดู คือจำนวนศัตรูที่อาจโจมตีช่องนั้นได้ใน Turn หน้า พร้อมคำอธิบายสั้นว่าเป็นค่าประมาณ ไม่ใช่การรับประกัน และมีปุ่มเปิด/ปิด overlay Threat zone ทั้ง Board (ค่าเริ่มต้นปิด) ที่แต้มสีช่องตามจำนวนศัตรูที่อาจโจมตีได้ (spec user stories 7–8, 53)

**Blocked by:** P1X-11 — Threat zone ใน session, P1X-04 — UI: Move preview

**Status:** done

- [x] แผงแสดงจำนวนจาก session (ไม่คำนวณเอง) และไม่แสดงเมื่อเป็น 0 หรือแสดงแบบเด่นน้อย ตามที่ออกแบบใน PR
- [x] ปุ่มเปิด/ปิด overlay ทั้ง Board ค่าเริ่มต้นปิด สีตามจำนวนจาก session อ่านง่ายทั้ง desktop และ 360 px และไม่บังไฮไลต์ช่องที่เดินได้
- [x] สีของ overlay ไม่ชนกับเครื่องหมายดาบบนศัตรูและจุดช่องที่ยืนโจมตีได้ของ Action plan (ticket 24) ถ้า 24 merge แล้ว
- [x] คำอธิบาย "ค่าประมาณ" อยู่ใน strings ของ web มี text test
- [x] screenshot ที่ desktop และ 360 px; CI เขียวทั้งสาม job

## Implementation

- Move preview displays the session count with muted zero and an explicit estimate explanation. The overlay starts off, uses purple shading and numeric counts from session, and preserves movement highlights.
- Integrated P1X-07 and P1X-24 to resolve overlapping UI and baseline changes. Purple Threat zone remains distinct from blue movement and red Action plan markers. Merge PR #59, #60 and #61 first.
- [Inspected desktop/mobile evidence](../evidence/12-threat-zone-ui/README.md). Combined typecheck, 1,035 tests passed (1 skipped), build and check-replays pass. Pinned Chromium baseline refresh passed 36/36; the final comparison and CI are recorded in the PR.
- Final vector-warning refinement passed all 36 local visual comparisons and all three CI jobs, including actual screenshot comparisons (run 39209076655). All acceptance criteria are complete.

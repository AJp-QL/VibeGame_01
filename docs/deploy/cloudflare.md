# Deploy build สำหรับ playtest ไป Cloudflare (ขั้นตอนของคน)

ทุกขั้นในหน้านี้เป็นขั้นที่คนต้องทำเอง (ต้องใช้ account Cloudflare) agent ไม่ login ไม่สร้าง account ไม่ใส่ secret และไม่ deploy

> ตามบันทึกการตัดสินใจ 2026-10-16 (`docs/decisions/decision-log.md`): build ได้แล้ว แต่ **ยังไม่แจกลิงก์ให้ playtester ภายนอก** จนกว่าจะปรับสมดุลเสร็จ deploy ไปลองเองหรือให้คนในทีมดูได้

เลือก Cloudflare Workers static assets เพราะ repo เป็น private (GitHub Pages ฟรีใช้กับ repo private ไม่ได้) ตัว build เป็นเว็บ static ล้วน ไม่มี Worker code: `packages/web/wrangler.jsonc` บอกให้ Cloudflare เสิร์ฟโฟลเดอร์ `packages/web/dist`

ตรวจกับเอกสาร Cloudflare ปัจจุบันเมื่อ 2026-10-16:
- https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/ (`assets.directory` + `assets.not_found_handling: "single-page-application"` ตรงกับ `wrangler.jsonc`)
- https://developers.cloudflare.com/workers/static-assets/get-started/ (`npx wrangler deploy` ขึ้น `*.workers.dev` หรือ Custom Domain)
- https://developers.cloudflare.com/workers/wrangler/commands/general/ (`wrangler login`, `wrangler whoami`)

## 0. ก่อนเริ่ม (ครั้งเดียว)

1. มี account Cloudflare (สมัครที่ https://dash.cloudflare.com/sign-up ถ้ายังไม่มี) ครั้งแรกที่ใช้ Workers dashboard จะให้ตั้งชื่อ subdomain `<ชื่อ>.workers.dev`
2. Node 24+ และ repo ติดตั้งแล้ว: ที่ root ของ repo รัน `corepack pnpm install`
3. (ถ้าต้องการ) ตั้งลิงก์แบบฟอร์มความเห็น ดูหัวข้อ "แบบฟอร์มความเห็น" ด้านล่าง

## 1. Login (ครั้งแรกในเครื่องนั้น)

```sh
cd packages/web
npx wrangler login        # เปิดเบราว์เซอร์ให้ยืนยันสิทธิ์ (OAuth)
npx wrangler whoami       # ตรวจว่า login เป็น account ที่ถูกต้อง
```

`npx` จะดาวน์โหลด wrangler มาเองครั้งแรก (wrangler ไม่ได้อยู่ใน dependency ของ repo) บนเครื่องที่ไม่มีเบราว์เซอร์ใช้ `npx wrangler login --device`

## 2. ติด tag ให้ build

ทุก build ที่ deploy ต้องติด tag (spec) และเวอร์ชันที่แสดงในเกมมาจาก tag นี้

```sh
git status                      # ต้องสะอาด ไม่อย่างนั้นเวอร์ชันจะลงท้าย -dirty
git tag -a v0.1.0-playtest.1 -m "Playtest build 1"
git describe --tags --always --dirty   # ต้องได้ v0.1.0-playtest.1 ตรงๆ
```

(ถ้าจะเก็บ tag ไว้ที่ remote ด้วย: `git push origin v0.1.0-playtest.1`)

## 3. Build

```sh
cd <root ของ repo>
corepack pnpm build
```

ได้โฟลเดอร์ static ที่ `packages/web/dist` (`index.html` + `assets/`) `vite.config.ts` ใส่เวอร์ชันจาก `git describe --tags --always --dirty` หรือจาก env `APP_VERSION` ถ้าตั้งไว้ (ใช้เมื่อ build จากที่ที่ไม่มี tag เช่น CI ที่ clone ตื้น: `APP_VERSION=v0.1.0-playtest.1 corepack pnpm build`)

ดู build ในเครื่องก่อนได้: `corepack pnpm preview` แล้วเปิดลิงก์ที่ขึ้น

## 4. Deploy ครั้งแรก (และทุกครั้ง)

```sh
cd packages/web
npx wrangler deploy
```

wrangler อ่าน `wrangler.jsonc` (ชื่อ Worker `monster-tactics`) แล้วอัปโหลด `./dist` ทั้งโฟลเดอร์ จบแล้วจะพิมพ์ URL เช่น `https://monster-tactics.<subdomain>.workers.dev`

ไม่ต้องใส่ secret หรือ environment variable ใดๆ ที่ Cloudflare (เกมไม่มี server และไม่ส่งข้อมูลออก)

## 5. ตรวจหลัง deploy

1. เปิด URL ที่ได้ ท้ายหน้าทุกหน้ามี "เวอร์ชัน v0.1.0-playtest.1" ต้องตรงกับ tag ในขั้นที่ 2
2. เมนูมีกล่อง "สำหรับ playtester": ปุ่ม "วิธีเล่น", "ส่งออกสถิติการเล่น" และ (ถ้าตั้งไว้) "ส่งความเห็น"
3. เล่นกับ AI จนจบ 1 Battle บนคอมและบนมือถือ (จอ 360 px) แล้วกด "Export Replay" ที่หน้าสรุปผล ไฟล์ .json ที่ได้มี `meta.stats` และ `meta.appVersion` เท่ากับ tag
4. เปิดไฟล์ Replay นั้นจากเมนู "เปิดไฟล์ Replay" ต้องเล่นซ้ำได้

## แบบฟอร์มความเห็น

ลิงก์ซ่อนอยู่จนกว่าจะตั้ง URL ตั้งได้ 2 ทาง (ทางที่ 2 ชนะถ้าตั้งทั้งคู่):
1. แก้ `FEEDBACK_FORM_URL` ใน `packages/web/src/config.ts` แล้ว commit ก่อนติด tag
2. ตั้ง env ตอน build: `VITE_FEEDBACK_FORM_URL=https://forms.gle/... corepack pnpm build`

ลิงก์ต้องขึ้นต้นด้วย `https://` หรือ `http://` ปุ่มอยู่ที่เมนู หน้า "วิธีเล่น" และหน้าสรุปผล

## Deploy อัตโนมัติเมื่อ push tag (GitHub Actions)

ทางหลักหลังตั้งครั้งแรก (decision log 2026-10-16: deploy ด้วย GitHub Action เมื่อ push tag `v*`, Claude เป็นคนติด tag) workflow อยู่ที่ `.github/workflows/deploy.yml`: checkout commit ที่ติด tag → `pnpm install --frozen-lockfile` → typecheck + test → `pnpm build` ด้วย `APP_VERSION=<ชื่อ tag>` → `npx wrangler@4.146.0 deploy` ใน `packages/web` ต้องมี secret 2 ตัวที่คนตั้งเองครั้งเดียว agent ไม่สร้าง token ไม่ใส่ secret และ repo ไม่มีค่าทั้งสอง

ตรวจกับเอกสารปัจจุบันเมื่อ 2026-10-16:
- https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/ (token จาก template "Edit Cloudflare Workers", secret `CLOUDFLARE_API_TOKEN` และ `CLOUDFLARE_ACCOUNT_ID`)
- https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/ (หา account ID)
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets (สร้าง repository secret)

### 1. สร้าง Cloudflare API token (สิทธิ์น้อยที่สุดสำหรับ deploy Worker)

1. Cloudflare dashboard → **Account API tokens** (https://dash.cloudflare.com/?to=/:account/api-tokens) → **Create Token**
2. ใต้ **Permission policies** เปิด dropdown **Custom** แล้วเลือก template **Edit Cloudflare Workers** (เป็นชุดสิทธิ์ที่ Cloudflare แนะนำสำหรับ `wrangler deploy` ใน CI)
3. ตั้งชื่อ token เช่น `monster-tactics-github-deploy`
4. จำกัดขอบเขตให้แคบที่สุด: Account Resources เลือก **เฉพาะ account ที่จะ deploy** (ไม่ใช่ All accounts) Zone Resources เลือกเฉพาะ zone ที่ใช้ ถ้าใช้แค่ `*.workers.dev` ไม่ต้องให้ zone ใด (ตามที่ dashboard อนุญาต) ตั้งวันหมดอายุได้ถ้าต้องการ
5. **Continue to summary** → **Create Token** แล้ว copy ค่า token ทันที (dashboard แสดงครั้งเดียว) อย่าวางในไฟล์ใน repo หรือในแชต

### 2. หา account ID

ทางใดก็ได้:
- dashboard: **Workers & Pages** → ส่วน **Account Details** → ปุ่ม copy ข้าง **Account ID** (หรือกด `Ctrl+K` พิมพ์ `Copy account ID`)
- เครื่องที่ login wrangler ไว้แล้ว: `cd packages/web && npx wrangler@4 whoami` ตารางที่พิมพ์ออกมามีคอลัมน์ Account ID

account ID ไม่ใช่ความลับเท่า token แต่ก็เก็บเป็น secret เพื่อไม่ต้องใส่ในไฟล์

### 3. ใส่เป็น repository secret ของ GitHub

1. หน้า repo บน GitHub → **Settings** → (ส่วน Security) **Secrets and variables** → **Actions** → แท็บ **Secrets** → **New repository secret**
2. สร้าง 2 ตัว ชื่อต้องตรงตัวอักษร:
   - `CLOUDFLARE_API_TOKEN` = token จากข้อ 1
   - `CLOUDFLARE_ACCOUNT_ID` = account ID จากข้อ 2

หรือใช้ `gh` (ติดตั้งใน ticket 22): `gh secret set CLOUDFLARE_API_TOKEN` แล้ววางค่าเมื่อถาม (ไม่ใส่ค่าใน command line เพื่อไม่ให้ค้างใน history) ทำซ้ำกับ `CLOUDFLARE_ACCOUNT_ID` ตรวจด้วย `gh secret list`

### 4. ติด tag แล้ว push เพื่อ deploy

```sh
git switch main && git pull
git tag -a v0.1.0-playtest.2 -m "Playtest build 2"
git push origin v0.1.0-playtest.2
```

push tag ที่ขึ้นต้นด้วย `v` จะเริ่ม workflow **Deploy** (ดูที่แท็บ Actions) เวอร์ชันท้ายหน้าเกมเท่ากับชื่อ tag เพราะ build ตั้ง `APP_VERSION` จาก `github.ref_name` จบแล้วตรวจตาม "5. ตรวจหลัง deploy" ด้านบน

- ถ้า secret ยังไม่ตั้ง ขั้น deploy จะ fail แต่ไม่มีอะไรขึ้น Cloudflare
- ถ้า typecheck หรือ test ไม่ผ่าน จะไม่ build และไม่ deploy
- deploy ซ้ำ tag เดิม: Actions → run นั้น → **Re-run jobs** (อย่าย้าย tag เดิมไป commit อื่น ให้ติด tag ใหม่)
- token รั่วหรือไม่ใช้แล้ว: Account API tokens → **Roll** หรือ **Delete** แล้วอัปเดต secret

## ทางเลือก: deploy อัตโนมัติจาก Git (Workers Builds)

เชื่อม repo กับ Cloudflare ใน dashboard (Workers & Pages → Create → Import a repository) แล้วตั้ง:
- Root directory: root ของ repo
- Build command: `corepack enable && pnpm install --frozen-lockfile && pnpm build`
- Deploy command: `cd packages/web && npx wrangler deploy`
- Environment variable `APP_VERSION` = tag ที่จะ deploy (CI มัก clone ตื้น `git describe` อาจไม่เห็น tag)

ดูเอกสาร https://developers.cloudflare.com/workers/ci-cd/builds/ ก่อนตั้ง ทางนี้ยังไม่ได้ทดลอง

## ถ้าไม่อยากให้ใครก็เปิดได้

URL `*.workers.dev` เปิดได้ทุกคนที่มีลิงก์ ถ้าต้องการจำกัดคนเข้า ใช้ Cloudflare Access (Zero Trust) กับ Worker นั้น ยังไม่ได้ตั้งหรือทดลองใน repo นี้

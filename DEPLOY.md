# Deploying JAMAS

The live store runs on **Vercel** (the site) with a **TiDB Cloud Starter**
database (free, MySQL-compatible) in Frankfurt, next to the site's servers
(`vercel.json` pins the site to Frankfurt, `fra1`). Photos and videos stay in
**Cloudflare R2**, payments in **Stripe**, emails in **Resend**.

Do the steps in order. Every setting name below is listed in `.env.example`.

---

## 1. Create the database (TiDB Cloud Starter)

1. Sign up at <https://tidbcloud.com> and create a **Starter** instance.
   Pick **AWS · Frankfurt (eu-central-1)**.
2. Open **SQL Editor** and run:
   ```sql
   CREATE DATABASE fashion_store;
   ```
3. Click **Connect**, choose **Prisma**, generate a password and copy the
   connection string. Change the database name at the end to `fashion_store`
   and keep `?sslaccept=strict`:
   ```
   mysql://XXXX.root:PASSWORD@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/fashion_store?sslaccept=strict
   ```
   This is the live `DATABASE_URL`. Keep it private.

## 2. Create the tables

On your computer, in the project folder (stop `npm run dev` first), point
Prisma at the live database **for this one command** and apply every migration.

PowerShell:
```powershell
$env:DATABASE_URL="mysql://...your live string..."; npx prisma migrate deploy; Remove-Item Env:DATABASE_URL
```
macOS / Linux / Git Bash:
```bash
DATABASE_URL="mysql://...your live string..." npx prisma migrate deploy
```
It should list all migrations as applied. Your `.env` (local database) is unchanged.

## 3. Put data in

Choose **one**:

**A. Copy what you already have locally** (products, categories, markets,
your admin account, uploaded image links). First make sure your local database
is fully up to date (`npx prisma migrate deploy` with your normal `.env`), then
export only the data:
```bash
mysqldump -u root -p --no-create-info --complete-insert --skip-triggers \
  --ignore-table=fashion_store._prisma_migrations fashion_store > jamas-data.sql
```
and load it into TiDB (host / user from step 1):
```bash
mysql -h gateway01.eu-central-1.prod.aws.tidbcloud.com -P 4000 -u "XXXX.root" -p \
  --ssl-mode=VERIFY_IDENTITY fashion_store < jamas-data.sql
```
(On Windows these tools are in `C:\Program Files\MySQL\MySQL Server 8.x\bin`.
MySQL Workbench › Server › Data Export / Data Import works too: export
"Dump Data Only".)

**B. Start fresh with the sample catalogue** (markets, shipping, categories,
demo products) plus your admin account:
```powershell
$env:DATABASE_URL="mysql://...live..."; $env:ADMIN_EMAIL="you@example.com"; $env:ADMIN_PASSWORD="a-strong-password"; npx prisma db seed
```
Then replace the demo products in the admin.

## 4. Create the site on Vercel

1. <https://vercel.com/new> › Import **collins-30/Atoms-clothen** (branch `main`).
   Framework: Next.js (detected). Leave build settings as they are.
2. Before the first deploy, open **Environment Variables** and add every name
   from `.env.example` with its **live** value:
   - `DATABASE_URL`: the TiDB string from step 1
   - `NEXT_PUBLIC_APP_URL`: `https://<project-name>.vercel.app` (update later if you add a domain)
   - `AUTH_SECRET`: a **new** secret (`npx auth secret`), not your local one
   - `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`,
     `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL`, all `R2_*`, `STORE_TIMEZONE`
   - `STRIPE_WEBHOOK_SECRET` comes in step 5; add it then and redeploy.
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` are only for the seed: not needed on Vercel.
3. Deploy. The build runs `prisma generate` automatically (`postinstall`).

## 5. Connect the services to the live address

Replace `https://SITE` with your live address.

| Service | Where | What to set |
|---|---|---|
| Google sign-in | Google Cloud Console › Credentials › your OAuth client | Authorised JavaScript origin `https://SITE`; redirect URI `https://SITE/api/auth/callback/google` |
| Stripe | Developers › Webhooks › Add endpoint | URL `https://SITE/api/webhooks/stripe`, events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`. Copy the signing secret into Vercel as `STRIPE_WEBHOOK_SECRET`, then **Redeploy**. |
| Cloudflare R2 | Bucket › Settings › CORS policy | Allow the live site to upload (see below) |
| Resend | Domains | Verify the domain used in `EMAIL_FROM` |

R2 CORS policy (keep localhost for development):
```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://SITE"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

## 6. Check the live store

- Home, shop (Grid / Rail, Night mode, search), a product page.
- Sign in with email and with Google; password-reset email arrives.
- Admin › Products: upload a photo, a model video and a rail image.
- A test order with Stripe test card `4242 4242 4242 4242`; the order shows in
  Admin › Orders and both emails arrive.
- Only then switch Stripe to live keys.

## Later changes

- Push to `main` = live deploy. Other branches get their own preview link.
- Previews use the same environment variables. To keep test orders out of the
  live database, give the **Preview** environment its own `DATABASE_URL`
  (a second free TiDB instance) and Stripe test keys.
- New database migrations: run step 2 again **before** merging the code that
  needs them.

# Deploying Till Next Election to Vercel

This app lives in the `client/` subdirectory and runs on the **Node** runtime (mongoose + `node:crypto`,
not edge). It uses `@sveltejs/adapter-vercel`.

## 1. Get it into git

The repo root isn't a git repo yet (only `sma/` is). From `client/`:

```bash
cd client
git init
git add .
git commit -m "Till Next Election"
# create a repo on GitHub, then:
git remote add origin git@github.com:<you>/till-next-election.git
git push -u origin main
```

> Or skip GitHub and deploy straight from the CLI: `npm i -g vercel && vercel`.

## 2. Create the Vercel project

- Import the repo.
- **Root Directory → `client`** (critical — otherwise Vercel builds the wrong folder).
  - If you push the *parent* folder instead of `client/`, set Root Directory to `client`. If you push
    `client/` itself as the repo root, leave it as `./`.
- Framework preset: **SvelteKit** (auto-detected). Build command / output are handled by the adapter.

## 3. Environment variables (Project → Settings → Environment Variables)

| Variable            | Notes                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| `SECRET_MONGO_URI`  | MongoDB Atlas connection string                                             |
| `LOCKET_SECRET`     | 32+ random bytes. **Set once, never change** — changing it makes every sealed locket unreadable |
| `RESEND_API_KEY`    | From resend.com                                                             |
| `LOCKET_FROM_EMAIL` | Verified Resend sender, e.g. `Till Next Election <hi@yourdomain.com>`        |
| `CRON_SECRET`       | Random string. Vercel auto-sends it as `Authorization: Bearer …` on cron calls (see step 5) |
| `PUBLIC_BASE_URL`   | Your **stable production domain**, e.g. `https://tillnextelection.app` — used for links inside emails. Do not use a per-deploy `*.vercel.app` URL |

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Add them to **Production** (and Preview, if you test there). Redeploy after changing env vars.

## 4. MongoDB Atlas

- **Network Access → allow `0.0.0.0/0`.** Vercel's serverless functions use dynamic egress IPs, so a
  narrow allowlist will block every connection. (Or use the Vercel ↔ Atlas integration.)
- The connection is cached on `globalThis` (`src/lib/db.ts`) so warm/concurrent invocations don't
  exhaust your Atlas connection limit. On the free M0 tier (500 conns) keep an eye on it under load.

## 5. The reminder cron

`vercel.json` already declares a daily job:

```json
{ "crons": [{ "path": "/api/cron/send-reminders", "schedule": "0 9 * * *" }] }
```

- Runs daily at **09:00 UTC**. Adjust the cron expression if you like.
- Because the env var is named exactly `CRON_SECRET`, Vercel automatically attaches
  `Authorization: Bearer $CRON_SECRET` to the request, which the endpoint requires — so the job is
  authenticated and outsiders can't trigger it.
- **Hobby plan:** cron is limited to once per day, which is all we need. You can also trigger it manually:
  `curl "https://<your-domain>/api/cron/send-reminders?key=$CRON_SECRET"`.

## 6. Resend

Verify your sending domain in Resend before go-live, or reminder emails won't deliver. Until
`RESEND_API_KEY`/`LOCKET_FROM_EMAIL` are set the app logs reminders to the function logs instead of
sending (handy for a first smoke test).

## Post-deploy smoke test

1. Open `/`, seal a locket → you get a `/l/<token>` link with a future unlock date.
2. Open the link → countdown renders; `GET /api/lockets/<token>` returns `locked: true` with **no**
   `message`.
3. (Optional) Temporarily lower `LOCK_YEARS` in `src/lib/utils/duration.ts`, redeploy, and confirm a
   locket reveals + the cron endpoint emails the reminder and sets `reminderSentAt`. Revert afterward.

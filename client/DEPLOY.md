# Deploying Till Next Election to Vercel

This app lives in the `client/` subdirectory and runs on the **Node** runtime (mongoose + `node:crypto`,
not edge). It uses `@sveltejs/adapter-vercel`.

## 1. Git

Already done — the git repo is rooted at the **parent** folder (`tillNextElection`), with this app in the
`client/` subdirectory, pushed to GitHub. Just keep committing and pushing as normal.

> Prefer the CLI instead of GitHub? `npm i -g vercel && vercel` from `client/`.

## 2. Create the Vercel project

- Import the repo.
- **Root Directory → `client`** (critical — the repo root is the parent folder, so Vercel must build
  `client/`, not the root).
- Framework preset: **SvelteKit** (auto-detected). Build command / output are handled by the adapter.

## 3. Environment variables (Project → Settings → Environment Variables)

| Variable                       | Notes                                                                       |
| ------------------------------ | --------------------------------------------------------------------------- |
| `SECRET_MONGO_URI`             | MongoDB Atlas connection string                                            |
| `LOCKET_SECRET`                | 32+ random bytes. **Set once, never change** — changing it makes every sealed locket unreadable |
| `TELEGRAM_BOT_TOKEN`           | From @BotFather (see step 6)                                                |
| `PUBLIC_TELEGRAM_BOT_USERNAME` | Your bot's @username **without** the @ — used for the "Connect Telegram" deep link |
| `TELEGRAM_WEBHOOK_SECRET`      | Random string; must match the `secret_token` you set when registering the webhook |
| `CRON_SECRET`                  | Random string. Vercel auto-sends it as `Authorization: Bearer …` on cron calls (see step 5) |
| `PUBLIC_BASE_URL`              | Your **stable production domain**, e.g. `https://tillnextelection.app` — used for links inside reminders. Do not use a per-deploy `*.vercel.app` URL |

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

## 6. Telegram bot (the reminder channel)

Reminders are opt-in and delivered via a Telegram bot — no email/domain needed for them.

1. In Telegram, talk to **@BotFather** → `/newbot` → pick a name and a `@username`. Copy the **token**
   → `TELEGRAM_BOT_TOKEN`. Put the username (without `@`) in `PUBLIC_TELEGRAM_BOT_USERNAME`.
2. Choose any random `TELEGRAM_WEBHOOK_SECRET`.
3. After your first deploy (so `PUBLIC_BASE_URL` is live), register the webhook **once**:

   ```bash
   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=$PUBLIC_BASE_URL/api/telegram/webhook&secret_token=$TELEGRAM_WEBHOOK_SECRET"
   ```

How it works: after sealing, the user taps **Connect Telegram**, which opens
`t.me/<bot>?start=<token>`. Pressing **Start** sends `/start <token>` to the bot; the webhook stamps
their chat id onto that locket. Pressing Start is what *authorises the bot to DM them* — without it,
Telegram blocks the message. In 5 years the cron sends the link to that chat id.

> Until `TELEGRAM_BOT_TOKEN` is set, the app logs reminders to the function logs instead of sending —
> fine for a first smoke test. The webhook only works on a public HTTPS URL (i.e. after deploy), not on
> localhost.

## 7. Longevity — making the 5-year promise real

The domain is the *easy* part. For a capsule that must survive 5 years, watch these, roughly in order of risk:

- **MongoDB Atlas free tier (M0):** the real weak link. Free clusters can be **paused after inactivity
  and eventually deleted**. The daily cron keeps it active, but free data isn't *guaranteed* for 5 years —
  plan to move to a cheap paid tier, or take periodic backups.
- **`LOCKET_SECRET`:** lose it or change it and **every locket becomes permanently unreadable**. Back it
  up in a password manager, separate from the code.
- **Accounts must outlive the capsule:** the Vercel project, the MongoDB cluster, and the Telegram bot
  (don't delete it in BotFather, don't let the token be revoked) all need to still exist in 5 years.
- **Domain:** register it **multi-year up front** (most registrars allow 5–10 years) with auto-renew, so
  it can't lapse. One domain covers `PUBLIC_BASE_URL`.

## Post-deploy smoke test

1. Open `/`, seal a locket → you get a `/l/<token>` link with a future unlock date.
2. Open the link → countdown renders; `GET /api/lockets/<token>` returns `locked: true` with **no**
   `message`.
3. Tap **Connect Telegram** → press Start in the bot → you should get a "Connected" reply. Check the
   locket now has a `telegramChatId`.
4. (Optional) Temporarily lower `LOCK_YEARS` in `src/lib/utils/duration.ts`, redeploy, and confirm the
   locket reveals + the cron endpoint sends the Telegram reminder and sets `reminderSentAt`. Revert after.

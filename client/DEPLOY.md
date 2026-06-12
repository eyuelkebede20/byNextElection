# Deploying Till Next Election to cPanel (senaycreatives)

This app lives in the `client/` subdirectory and is a **single SvelteKit SSR app** — the UI and its
`/api/...` routes are the *same* Node server (mongoose + `node:crypto`, so Node runtime, not edge).
It is **not** a static frontend + separate backend; there is nothing to split across two subdomains.

It is built with **`@sveltejs/adapter-node`** into a standalone `build/index.js` server and runs as
one cPanel **Passenger Node app** on **`bynextelection.senaycreatives.com`**. The `-ap` subdomain
(`bynextelectionap.senaycreatives.com`) just 301-redirects to it.

> Previously this app targeted Vercel (`@sveltejs/adapter-vercel` + `vercel.json` cron). Those are
> gone — the adapter is now `adapter-node` and the cron is a cPanel cron job (steps 5–6 below).

## 1. CI/CD — GitHub Actions → FTP

`.github/workflows/deploy.yml` runs on every push to `main`:

- builds the app in `client/` with `adapter-node`,
- stages the runtime payload (`build/`, `package.json`, `package-lock.json`, `tmp/restart.txt`),
- FTP-uploads it to the app's Application Root, and
- rewrites `tmp/restart.txt` with changing content so Passenger restarts and picks up the new build.

The build needs **no secrets** — all config is read at runtime from the Passenger app's environment.

### GitHub repo secrets (Settings → Secrets and variables → Actions)

| Secret           | Value                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| `FTP_SERVER`     | The cPanel FTP host (e.g. `senaycreatives.com` or `ftp.senaycreatives.com`) |
| `FTP_USERNAME`   | The **bynextelection** (main app) FTP account username                |
| `FTP_PASSWORD`   | That account's password                                               |
| `FTP_SERVER_DIR` | *Optional.* Defaults to `./` (the FTP account's home). Set only if the account is not jailed directly to the app's Application Root. |

## 2. cPanel — Setup the Node app

cPanel → **Setup Node.js Application** → **Create Application**:

- **Node version:** 20+
- **Application mode:** Production
- **Application root:** the directory the **bynextelection** FTP account lands in (where `build/` and
  `package.json` will be uploaded)
- **Application URL:** `bynextelection.senaycreatives.com`
- **Application startup file:** `build/index.js`

## 3. Environment variables (set in the Node.js App UI → "Environment variables")

These are read at runtime via `$env/dynamic/*`:

| Variable                       | Notes                                                                       |
| ------------------------------ | --------------------------------------------------------------------------- |
| `SECRET_MONGO_URI`             | MongoDB Atlas connection string                                             |
| `LOCKET_SECRET`                | 32+ random bytes. **Set once, never change** — changing it makes every sealed locket unreadable |
| `TELEGRAM_BOT_TOKEN`           | From @BotFather (see step 7)                                                |
| `PUBLIC_TELEGRAM_BOT_USERNAME` | Your bot's @username **without** the @ — used for the "Connect Telegram" deep link |
| `TELEGRAM_WEBHOOK_SECRET`      | Random string; must match the `secret_token` you set when registering the webhook |
| `CRON_SECRET`                  | Random string guarding the reminder cron endpoint (see step 5)              |
| `PUBLIC_BASE_URL`              | `https://bynextelection.senaycreatives.com` — used for links inside reminders. **Must be the stable production domain.** |
| `ORIGIN`                       | `https://bynextelection.senaycreatives.com` — **required by adapter-node** so form POSTs / CSRF checks pass behind Passenger |

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

## 4. Install production dependencies on the server

The CI ships `package.json`/`package-lock.json` but **not** `node_modules` (adapter-node externalizes
them). In the Node.js App UI click **"Run NPM Install"** once after the first deploy — and again
**whenever dependencies change**. Then **Restart** the app.

## 5. The reminder cron (replaces Vercel cron)

cPanel → **Cron Jobs** → add a daily job (e.g. `0 9 * * *` for 09:00 server time):

```bash
curl -s "https://bynextelection.senaycreatives.com/api/cron/send-reminders?key=YOUR_CRON_SECRET" >/dev/null
```

The endpoint requires the secret (accepted as `?key=`, `x-cron-secret`, or `Authorization: Bearer`),
so outsiders can't trigger it. It finds unlocked, Telegram-opted-in, not-yet-reminded lockets and DMs
each creator their link, stamping `reminderSentAt` so it never double-sends.

## 6. Redirect the `-ap` subdomain → main

Because the app is one server, its API is served at `bynextelection.senaycreatives.com/api/...`. Point
the `-ap` subdomain at the app so old/expected `…ap/...` links still resolve: in the
`bynextelectionap.senaycreatives.com` document root add an `.htaccess`:

```apache
RewriteEngine On
RewriteRule ^(.*)$ https://bynextelection.senaycreatives.com/$1 [R=301,L]
```

## 7. Telegram bot (the reminder channel)

Reminders are opt-in and delivered via a Telegram bot — no email/domain needed for them.

1. In Telegram, talk to **@BotFather** → `/newbot` → pick a name and a `@username`. Copy the **token**
   → `TELEGRAM_BOT_TOKEN`. Put the username (without `@`) in `PUBLIC_TELEGRAM_BOT_USERNAME`.
2. Choose any random `TELEGRAM_WEBHOOK_SECRET`.
3. After your first deploy (so the URL is live), register the webhook **once**:

   ```bash
   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=https://bynextelection.senaycreatives.com/api/telegram/webhook&secret_token=$TELEGRAM_WEBHOOK_SECRET"
   ```

How it works: after sealing, the user taps **Connect Telegram**, which opens
`t.me/<bot>?start=<token>`. Pressing **Start** sends `/start <token>` to the bot; the webhook stamps
their chat id onto that locket. Pressing Start is what *authorises the bot to DM them* — without it,
Telegram blocks the message. In 5 years the cron sends the link to that chat id.

> Until `TELEGRAM_BOT_TOKEN` is set, the app logs reminders instead of sending — fine for a first
> smoke test. The webhook only works on a public HTTPS URL (i.e. after deploy), not on localhost.

## 8. MongoDB Atlas

- **Network Access → allow `0.0.0.0/0`** (or your cPanel server's outbound IP if it's static). A
  narrow allowlist will block connections.
- The connection is cached on `globalThis` (`src/lib/db.ts`) so concurrent requests don't exhaust
  your Atlas connection limit. On the free M0 tier (500 conns) keep an eye on it under load.

## 9. Longevity — making the 5-year promise real

For a capsule that must survive 5 years, watch these, roughly in order of risk:

- **MongoDB Atlas free tier (M0):** the real weak link. Free clusters can be **paused after inactivity
  and eventually deleted**. The daily cron keeps it active, but free data isn't *guaranteed* for 5 years —
  plan to move to a cheap paid tier, or take periodic backups.
- **`LOCKET_SECRET`:** lose it or change it and **every locket becomes permanently unreadable**. Back it
  up in a password manager, separate from the code.
- **Accounts must outlive the capsule:** the cPanel hosting, the MongoDB cluster, and the Telegram bot
  (don't delete it in BotFather, don't let the token be revoked) all need to still exist in 5 years.
- **Domain:** register `senaycreatives.com` **multi-year up front** with auto-renew so it can't lapse.

## Post-deploy smoke test

1. Open `/`, seal a locket → you get a `/l/<token>` link with a future unlock date.
2. Open the link → countdown renders; `GET /api/lockets/<token>` returns `locked: true` with **no**
   `message`.
3. Tap **Connect Telegram** → press Start in the bot → you should get a "Connected" reply. Check the
   locket now has a `telegramChatId`.
4. Confirm `https://bynextelectionap.senaycreatives.com/` 301-redirects to the main domain.
5. Manually hit the cron URL with the secret and confirm it returns JSON `{ due, sent, failed }`.
6. (Optional) Temporarily lower `LOCK_YEARS` in `src/lib/utils/duration.ts`, redeploy, and confirm the
   locket reveals + the cron sends the Telegram reminder and sets `reminderSentAt`. Revert after.

# Till Next Election

Write **one** message, seal it for **5 years**, and get a single link. Until the unlock date the
link shows a live countdown (and is freely shareable). The creator can optionally connect a **Telegram**
bot; when the 5 years are up the bot messages them the link. Anyone with the link can then read it.

Built on the same stack as [S.M.A](https://sma.robi.work) by [robi](https://github.com/RobiMez):
SvelteKit + TypeScript + MongoDB + Tailwind v4 / shadcn-svelte. Uses **npm** (not pnpm).

## How the "lock" works

A true cryptographic 5-year time-lock isn't practical, so the lock is **server-enforced**:

- The message is encrypted at rest with **AES-256-GCM**. The key is derived per-locket via
  `HKDF(LOCKET_SECRET, salt = token)` (see `src/lib/server/crypto.ts`), so a database dump alone —
  without `LOCKET_SECRET` — reveals nothing.
- No endpoint returns the plaintext until `now >= unlockAt`. Before that, the API and page only ever
  expose the unlock date and a countdown.

## Reminders (optional, via Telegram)

No email or sending domain needed. After sealing, the user can tap **Connect Telegram**, which deep-links
to your bot (`t.me/<bot>?start=<token>`). Pressing **Start** both authorises the bot to DM them and lets
the webhook (`/api/telegram/webhook`) record their chat id on the locket. The daily cron then messages
that chat id when the locket unlocks. Skipping it just means no reminder — the link still works.

## Setup

```bash
npm install
cp .env.example .env   # then fill it in
npm run dev            # http://localhost:5173
```

### Environment

| Variable                       | Purpose                                                              |
| ------------------------------ | -------------------------------------------------------------------- |
| `SECRET_MONGO_URI`             | MongoDB connection string                                           |
| `LOCKET_SECRET`                | 32+ random bytes; derives AES keys. **Never change it after launch** |
| `TELEGRAM_BOT_TOKEN`           | Bot token from @BotFather                                            |
| `PUBLIC_TELEGRAM_BOT_USERNAME` | Bot @username without the @ (used for the Connect deep link)         |
| `TELEGRAM_WEBHOOK_SECRET`      | Random string; must match the webhook's `secret_token`              |
| `CRON_SECRET`                  | Guards the reminder endpoint                                         |
| `PUBLIC_BASE_URL`              | Base URL for links in reminders, e.g. `https://tillnextelection.app` |

Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`

> If `TELEGRAM_BOT_TOKEN` is unset, reminders are logged to the console instead of sent, so local dev
> works without a bot. The webhook needs a public HTTPS URL, so Telegram connect only works once deployed.

See **DEPLOY.md** for the full Vercel + BotFather + longevity checklist.

## Routes

| Route                          | What it does                                                |
| ------------------------------ | ----------------------------------------------------------- |
| `/`                            | Compose + seal a locket; shows the link + Telegram opt-in   |
| `/l/[token]`                   | Locket page — countdown while locked, message once unlocked |
| `POST /api/lockets`            | Seal a locket → `{ token, unlockAt }`                       |
| `GET /api/lockets/[token]`     | Metadata; includes `message` only after unlock              |
| `POST /api/telegram/webhook`   | Captures the creator's chat id on `/start <token>`          |
| `GET /api/cron/send-reminders` | Sends due Telegram reminders (secret-protected)             |

## The reminder job

No in-process scheduler (so it works on serverless). `vercel.json` declares a daily Vercel cron hitting
`/api/cron/send-reminders`; since the env var is named `CRON_SECRET`, Vercel auto-sends it as a bearer
token. The job is idempotent — it stamps `reminderSentAt`, so repeated calls won't double-send. Manual
trigger: `GET /api/cron/send-reminders?key=$CRON_SECRET`.

## Testing the time-lock locally

Set `LOCK_YEARS` to a tiny value (or seed a locket with a past `unlockAt`) in `src/lib/utils/duration.ts`
to watch a locket flip from countdown to revealed, then call the cron endpoint to see the reminder fire.
Revert before committing.

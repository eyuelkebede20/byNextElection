# Till Next Election

Write **one** message, seal it for **5 years**, and get a single link. Until the unlock date the
link shows a live countdown (and is freely shareable); after 5 years the creator gets an email
reminder and anyone with the link can read the message.

Built on the same stack as [S.M.A](https://sma.robi.work) by [robi](https://github.com/RobiMez):
SvelteKit + TypeScript + MongoDB + Tailwind v4 / shadcn-svelte.

## How the "lock" works

A true cryptographic 5-year time-lock isn't practical, so the lock is **server-enforced**:

- The message is encrypted at rest with **AES-256-GCM**. The key is derived per-locket via
  `HKDF(LOCKET_SECRET, salt = token)` (see `src/lib/server/crypto.ts`), so a database dump alone —
  without `LOCKET_SECRET` — reveals nothing.
- No endpoint returns the plaintext until `now >= unlockAt`. Before that, the API and page only ever
  expose the unlock date and a countdown.

## Setup

```bash
pnpm i
cp .env.example .env   # then fill it in
pnpm dev               # http://localhost:5173
```

### Environment

| Variable           | Purpose                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `SECRET_MONGO_URI` | MongoDB connection string                                            |
| `LOCKET_SECRET`    | 32+ random bytes; derives AES keys. **Never change it after launch** |
| `RESEND_API_KEY`   | [Resend](https://resend.com) key for the reminder email              |
| `LOCKET_FROM_EMAIL`| Verified Resend sender, e.g. `Till Next Election <hi@yourdomain>`     |
| `CRON_SECRET`      | Guards the reminder endpoint                                         |
| `PUBLIC_BASE_URL`  | Base URL for links in emails, e.g. `https://tillnextelection.app`    |

Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`

> If `RESEND_API_KEY` / `LOCKET_FROM_EMAIL` are unset, reminders are logged to the console instead of
> sent, so local dev works without an email account.

## Routes

| Route                              | What it does                                                |
| ---------------------------------- | ----------------------------------------------------------- |
| `/`                                | Compose + seal a locket; shows the resulting link           |
| `/l/[token]`                       | Locket page — countdown while locked, message once unlocked |
| `POST /api/lockets`                | Seal a locket → `{ token, unlockAt }`                       |
| `GET /api/lockets/[token]`         | Metadata; includes `message` only after unlock              |
| `GET /api/cron/send-reminders`     | Sends due reminder emails (secret-protected)                |

## The reminder job

There is **no in-process scheduler** (so it works under `adapter-auto` / serverless). Instead, hit the
endpoint once a day from any external scheduler:

```
GET https://your-host/api/cron/send-reminders?key=YOUR_CRON_SECRET
```

The secret may also be passed as an `x-cron-secret` header or `Authorization: Bearer ...`. The job is
idempotent — it stamps `reminderSentAt`, so repeated calls won't double-send.

- **cron-job.org / EasyCron**: create a daily GET to the URL above.
- **Vercel**: add a `vercel.json` with a `crons` entry pointing at `/api/cron/send-reminders` and pass
  the secret via a header.

## Testing the time-lock locally

Set `LOCK_YEARS` to a tiny value (or seed a locket with a past `unlockAt`) in `src/lib/utils/duration.ts`
to watch a locket flip from countdown to revealed, then call the cron endpoint to see the reminder fire.
Revert before committing.

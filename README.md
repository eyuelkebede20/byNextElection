# Till Next Election

**A locket for your future self.** Write down what you want to accomplish, seal it for **5 years —
roughly one election cycle — and come back to find out whether you actually did it.**

## Why this exists

We all make quiet promises about the kind of person we want to become and the things we want to get
done. Then life moves on and we forget we ever made them. **Till Next Election** turns one of those
promises into a sealed locket:

- You write **one message** to your future self — your goals, hopes, the things you want to have
  accomplished by the next election.
- It gets **sealed for 5 years**. You can't peek early, and neither can anyone else.
- When the time finally hits, you reopen the locket and **evaluate yourself**: did you do the things
  you set out to do? How much has changed? Who were you, and who did you become?

It's a small ritual for honest self-reflection on a timescale long enough to actually matter.

## What you get

- **A single shareable link.** Seal a message and receive one link — that's your locket.
- **A live countdown.** Until the unlock date, the link only ever shows how long is left, never the
  contents. You can share the link freely without giving anything away.
- **It's secure.** The message is encrypted at rest with **AES-256-GCM**, with a key derived per
  locket from a server secret. No part of the system can hand back the plaintext until the 5 years
  are up — not the API, not the page, not a database dump on its own. The lock is real, not just a
  "please don't look" date.
- **Telegram tells you when it's time.** Reminders are opt-in: after sealing, tap **Connect
  Telegram** and the bot will message you the link the moment your 5 years are up — so you don't have
  to remember to check. If you'd rather not, skip it; the link still works on its own.
- **You can review whenever you like.** Once unlocked, open your locket any time to read what you
  wrote and reflect.

## How it works (the short version)

1. Compose your message on the home page and seal it.
2. Get your link (`/l/<token>`) and, optionally, connect the Telegram bot.
3. For 5 years the link shows a countdown and nothing else.
4. On the unlock date, the Telegram bot pings you — and the locket opens for reading.

The lock is **server-enforced**: the message is encrypted and no endpoint returns the plaintext
before `now >= unlockAt`. See [`client/README.md`](client/README.md) for the technical details and
[`client/DEPLOY.md`](client/DEPLOY.md) for deployment.

## Screenshots

> **Where to put your screenshots:** drop the image files into `docs/screenshots/` (create the folder
> if it doesn't exist yet) and they'll render below. Suggested filenames are referenced here already —
> name your files to match, or send them to me and tell me which is which and I'll wire them in.

| Screen | Preview |
| ------ | ------- |
| Compose & seal a message | `docs/screenshots/compose.png` |
| The link + Telegram opt-in | `docs/screenshots/sealed.png` |
| Locked locket (countdown) | `docs/screenshots/countdown.png` |
| Unlocked locket (your message) | `docs/screenshots/unlocked.png` |
| Telegram reminder | `docs/screenshots/telegram.png` |

<!--
Once the files are in docs/screenshots/, replace the table above (or add below) with:

![Compose & seal](docs/screenshots/compose.png)
![Sealed — link + Telegram](docs/screenshots/sealed.png)
![Locked — countdown](docs/screenshots/countdown.png)
![Unlocked — your message](docs/screenshots/unlocked.png)
![Telegram reminder](docs/screenshots/telegram.png)
-->

## Project layout

| Folder    | What it is                                                                       |
| --------- | -------------------------------------------------------------------------------- |
| `client/` | The Till Next Election app (SvelteKit + TypeScript + MongoDB + Tailwind v4).     |
| `sma/`    | "Send Messages Anonymously" by [robi](https://github.com/RobiMez) — the reference/inspiration. |

## Getting started

```bash
cd client
npm install
cp .env.example .env   # then fill it in
npm run dev            # http://localhost:5173
```

Full setup, environment variables, and the Vercel + BotFather checklist live in
[`client/README.md`](client/README.md) and [`client/DEPLOY.md`](client/DEPLOY.md).

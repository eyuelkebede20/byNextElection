import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import Locket from '../../../../models/locket.schema';
import { dbConnect } from '$lib/db';
import { sendTelegramMessage } from '$lib/server/telegram';
import { formatRemaining, isUnlocked } from '$lib/utils/duration';

/**
 * Telegram webhook. Register it once (see DEPLOY.md):
 *   https://api.telegram.org/bot<TOKEN>/setWebhook
 *     ?url=<PUBLIC_BASE_URL>/api/telegram/webhook
 *     &secret_token=<TELEGRAM_WEBHOOK_SECRET>
 *
 * We only act on the deep-link "/start <token>" a user triggers by tapping
 * "Connect Telegram". Pressing Start both authorises the bot to DM them and
 * tells us their chat id, which we stamp onto the matching locket.
 *
 * Always returns 200 quickly so Telegram doesn't retry.
 */
export const POST: RequestHandler = async ({ request }) => {
  // Verify Telegram's secret-token header (set when registering the webhook).
  if (env.TELEGRAM_WEBHOOK_SECRET) {
    const provided = request.headers.get('x-telegram-bot-api-secret-token');
    if (provided !== env.TELEGRAM_WEBHOOK_SECRET) {
      return json({ ok: false }, { status: 401 });
    }
  }

  let update: { message?: { text?: string; chat?: { id?: number | string } } };
  try {
    update = await request.json();
  } catch {
    return json({ ok: true });
  }

  const text = update.message?.text ?? '';
  const chatId = update.message?.chat?.id;

  // Only handle "/start <payload>".
  if (chatId === undefined || chatId === null || !text.startsWith('/start')) {
    return json({ ok: true });
  }

  const payload = text.split(/\s+/)[1] ?? '';
  if (!payload) {
    await sendTelegramMessage(chatId, 'Tap "Connect Telegram" on a locket to link it for a reminder.');
    return json({ ok: true });
  }

  await dbConnect();
  const locket = await Locket.findOne({ token: payload });

  if (!locket) {
    await sendTelegramMessage(chatId, "I couldn't find that locket — double-check the link?");
    return json({ ok: true });
  }

  locket.telegramChatId = String(chatId);
  await locket.save();

  const when = isUnlocked(locket.unlockAt)
    ? 'It is already open — go read it!'
    : `I'll message you in about ${formatRemaining(locket.unlockAt)}, when it opens.`;
  await sendTelegramMessage(chatId, `🔒 Connected. ${when}`);

  return json({ ok: true });
};

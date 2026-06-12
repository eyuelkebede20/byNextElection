import { env } from '$env/dynamic/private';

/**
 * Minimal Telegram Bot API helper (no SDK — just fetch).
 *
 * The bot token comes from BotFather. A bot can only message a user who has
 * already pressed "Start", which is exactly what our deep-link Connect flow
 * guarantees before we ever store a chat id.
 */

function apiUrl(method: string): string {
  return `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;
}

/**
 * Sends a plain-text message to a chat. Returns true if dispatched. If the bot
 * token isn't configured the message is logged instead (so dev works offline).
 */
export async function sendTelegramMessage(chatId: string | number, text: string): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN not set — logging message instead of sending.');
    console.info(`[telegram] To ${chatId}: ${text}`);
    return false;
  }

  const res = await fetch(apiUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error(`[telegram] sendMessage failed: ${res.status} ${detail}`);
    throw new Error(`Telegram sendMessage failed: ${res.status}`);
  }
  return true;
}

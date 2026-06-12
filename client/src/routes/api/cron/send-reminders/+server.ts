import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import Locket from '../../../../models/locket.schema';
import { dbConnect } from '$lib/db';
import { sendTelegramMessage } from '$lib/server/telegram';

/**
 * Daily reminder job. Trigger it from a scheduler (Vercel cron in vercel.json)
 * with the shared secret:
 *
 *   GET /api/cron/send-reminders?key=$CRON_SECRET
 *   (Vercel cron auto-sends `Authorization: Bearer $CRON_SECRET` when the env
 *    var is named CRON_SECRET; the header / x-cron-secret are also accepted.)
 *
 * Finds lockets that have unlocked, opted into Telegram reminders, and haven't
 * been reminded yet; messages each creator their link via the bot and stamps
 * reminderSentAt so it never double-sends.
 */
export const GET: RequestHandler = async ({ url, request }) => {
  if (!privateEnv.CRON_SECRET) {
    return json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  const provided =
    url.searchParams.get('key') ??
    request.headers.get('x-cron-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    '';

  if (provided !== privateEnv.CRON_SECRET) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const baseUrl = (publicEnv.PUBLIC_BASE_URL ?? url.origin).replace(/\/$/, '');

  const due = await Locket.find({
    unlockAt: { $lte: new Date() },
    reminderSentAt: null,
    telegramChatId: { $ne: null }
  });

  let sent = 0;
  let failed = 0;

  for (const locket of due) {
    const link = `${baseUrl}/l/${locket.token}`;
    const text = `🔓 It's time. The locket you sealed five years ago can be opened now:\n${link}`;
    try {
      await sendTelegramMessage(locket.telegramChatId, text);
      locket.reminderSentAt = new Date();
      await locket.save();
      sent++;
    } catch (err) {
      console.error(`[cron] reminder failed for ${locket.token}:`, err);
      failed++;
    }
  }

  return json({ due: due.length, sent, failed });
};

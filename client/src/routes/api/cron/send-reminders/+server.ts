import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import Locket from '../../../../models/locket.schema';
import { dbConnect } from '$lib/db';
import { sendUnlockReminder } from '$lib/server/email';

/**
 * Daily reminder job. Trigger it from an external scheduler (cron-job.org,
 * platform cron, etc.) with the shared secret:
 *
 *   GET /api/cron/send-reminders?key=$CRON_SECRET
 *   (or send it as the `x-cron-secret` header / `Authorization: Bearer $CRON_SECRET`)
 *
 * Finds lockets that have unlocked but haven't been reminded yet, emails each
 * creator their link, and stamps reminderSentAt so it never double-sends.
 */
export const GET: RequestHandler = async ({ url, request }) => {
  if (!env.CRON_SECRET) {
    return json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  const provided =
    url.searchParams.get('key') ??
    request.headers.get('x-cron-secret') ??
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    '';

  if (provided !== env.CRON_SECRET) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const baseUrl = (env.PUBLIC_BASE_URL ?? url.origin).replace(/\/$/, '');

  const due = await Locket.find({
    unlockAt: { $lte: new Date() },
    reminderSentAt: null
  });

  let sent = 0;
  let failed = 0;

  for (const locket of due) {
    const link = `${baseUrl}/l/${locket.token}`;
    try {
      await sendUnlockReminder(locket.email, link);
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

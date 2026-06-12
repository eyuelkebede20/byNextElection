import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Locket from '../../../../models/locket.schema';
import { dbConnect } from '$lib/db';
import { decryptMessage } from '$lib/server/crypto';
import { isUnlocked } from '$lib/utils/duration';

/**
 * Fetch a locket by token.
 *
 * Always returns { token, createdAt, unlockAt, locked }.
 * The decrypted `message` is included ONLY once the unlock moment has passed —
 * before that the plaintext never leaves the server.
 */
export const GET: RequestHandler = async ({ params }) => {
  await dbConnect();
  const locket = await Locket.findOne({ token: params.token });

  if (!locket) {
    return json({ error: 'Locket not found' }, { status: 404 });
  }

  const unlocked = isUnlocked(locket.unlockAt);

  const payload: Record<string, unknown> = {
    token: locket.token,
    createdAt: new Date(locket.createdAt).toISOString(),
    unlockAt: new Date(locket.unlockAt).toISOString(),
    locked: !unlocked
  };

  if (unlocked) {
    payload.message = decryptMessage(
      { ciphertext: locket.ciphertext, iv: locket.iv, authTag: locket.authTag },
      locket.token
    );

    // Record the first open (best-effort; never block the read on it).
    if (!locket.openedAt) {
      locket.openedAt = new Date();
      locket.save().catch((err: unknown) => console.error('[lockets] openedAt save failed:', err));
    }
  }

  return json(payload);
};

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import Locket from '../../../models/locket.schema';
import { dbConnect } from '$lib/db';
import { decryptMessage } from '$lib/server/crypto';
import { isUnlocked } from '$lib/utils/duration';

export const load: PageServerLoad = async ({ params }) => {
  await dbConnect();
  const locket = await Locket.findOne({ token: params.token });

  if (!locket) {
    throw error(404, 'This locket does not exist.');
  }

  const unlocked = isUnlocked(locket.unlockAt);

  // Only ever decrypt and ship the message to the client once it has unlocked.
  let message: string | null = null;
  if (unlocked) {
    message = decryptMessage(
      { ciphertext: locket.ciphertext, iv: locket.iv, authTag: locket.authTag },
      locket.token
    );
    if (!locket.openedAt) {
      locket.openedAt = new Date();
      locket.save().catch((err: unknown) => console.error('[lockets] openedAt save failed:', err));
    }
  }

  return {
    token: locket.token,
    createdAt: new Date(locket.createdAt).toISOString(),
    unlockAt: new Date(locket.unlockAt).toISOString(),
    locked: !unlocked,
    message
  };
};

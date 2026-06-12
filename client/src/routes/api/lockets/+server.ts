import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Locket from '../../../models/locket.schema';
import { dbConnect } from '$lib/db';
import { encryptMessage } from '$lib/server/crypto';
import { generateToken } from '$lib/server/token';
import { unlockDateFrom } from '$lib/utils/duration';

const MAX_MESSAGE_LENGTH = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Seal a new locket.
 *
 * Body: { message: string, email: string }
 * Returns: { token, unlockAt }  — the plaintext is never echoed back.
 */
export const POST: RequestHandler = async ({ request }) => {
  let body: { message?: unknown; email?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';

  if (!message) {
    return json({ error: 'Message cannot be empty' }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return json({ error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return json({ error: 'A valid email is required for the reminder' }, { status: 400 });
  }

  await dbConnect();

  const createdAt = new Date();
  const unlockAt = unlockDateFrom(createdAt);

  // Mint a unique token, retrying on the (astronomically rare) collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateToken();
    const { ciphertext, iv, authTag } = encryptMessage(message, token);

    try {
      await Locket.create({
        token,
        ciphertext,
        iv,
        authTag,
        email,
        createdAt,
        unlockAt
      });
      return json({ token, unlockAt: unlockAt.toISOString() }, { status: 201 });
    } catch (err: unknown) {
      // Duplicate key on `token` — try again with a fresh one.
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
        continue;
      }
      console.error('[lockets] create failed:', err);
      return json({ error: 'Failed to seal locket' }, { status: 500 });
    }
  }

  return json({ error: 'Could not generate a unique token, please retry' }, { status: 500 });
};

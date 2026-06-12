import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';

/**
 * Per-locket encryption at rest.
 *
 * The message is encrypted with AES-256-GCM. The key is derived per-locket via
 * HKDF(LOCKET_SECRET, salt = token). This means:
 *   - A database dump alone (without LOCKET_SECRET) reveals nothing.
 *   - Every locket has a distinct key, so the token doubles as a key salt.
 *
 * The 5-year "lock" itself is enforced in application logic (the API refuses to
 * decrypt before unlockAt) — this layer is defense-in-depth for data at rest.
 */

function deriveKey(token: string): Buffer {
  if (!env.LOCKET_SECRET) {
    throw new Error('LOCKET_SECRET is not set');
  }
  // hkdfSync returns an ArrayBuffer; wrap it as a Buffer for the cipher.
  const key = crypto.hkdfSync('sha256', env.LOCKET_SECRET, token, 'locket-aes-256-gcm', 32);
  return Buffer.from(key);
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function encryptMessage(plaintext: string, token: string): EncryptedPayload {
  const key = deriveKey(token);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

export function decryptMessage(payload: EncryptedPayload, token: string): string {
  const key = deriveKey(token);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final()
  ]);
  return plaintext.toString('utf8');
}

import crypto from 'node:crypto';

/**
 * Mint a URL-safe, hard-to-guess locket token.
 *
 * 9 random bytes -> 12 base64url characters. With ~72 bits of entropy, tokens
 * are unguessable and collisions are astronomically unlikely; the caller still
 * retries against the unique index to be safe.
 */
export function generateToken(): string {
  return crypto.randomBytes(9).toString('base64url');
}

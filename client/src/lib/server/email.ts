import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

/**
 * Sends the "your locket is ready to open" reminder.
 *
 * Returns true if the email was dispatched. If Resend isn't configured the
 * email is logged to the console instead and false is returned, so the app
 * still works in local/dev without credentials.
 */
export async function sendUnlockReminder(to: string, link: string): Promise<boolean> {
  const subject = 'Your locket is ready to open';
  const text = [
    `Five years ago you sealed a message and set it aside.`,
    ``,
    `It's time. Open your locket here:`,
    link,
    ``,
    `— Till Next Election`
  ].join('\n');

  if (!env.RESEND_API_KEY || !env.LOCKET_FROM_EMAIL) {
    console.warn(
      '[email] RESEND_API_KEY / LOCKET_FROM_EMAIL not set — logging reminder instead of sending.'
    );
    console.info(`[email] To: ${to}\nSubject: ${subject}\n${text}`);
    return false;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.LOCKET_FROM_EMAIL,
    to,
    subject,
    text
  });

  if (error) {
    console.error('[email] Resend error:', error);
    throw new Error(`Failed to send reminder: ${error.message ?? 'unknown error'}`);
  }
  return true;
}

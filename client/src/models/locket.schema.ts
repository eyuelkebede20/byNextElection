import mongoose from 'mongoose';

const LocketSchema = new mongoose.Schema({
  // The link id — what goes in /l/[token]. Unique + indexed.
  token: { type: String, required: true, unique: true, index: true },

  // AES-256-GCM encrypted payload, all base64-encoded.
  ciphertext: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },

  // Telegram chat id of the creator, captured when they tap "Connect Telegram"
  // and press Start on the bot. Null = they opted out of reminders.
  telegramChatId: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },
  unlockAt: { type: Date, required: true },

  // Null until the reminder email has been sent (idempotency for the cron job).
  reminderSentAt: { type: Date, default: null },

  // Null until the locket is first opened after unlocking (light analytics).
  openedAt: { type: Date, default: null }
});

export interface ILocket {
  token: string;
  ciphertext: string;
  iv: string;
  authTag: string;
  telegramChatId: string | null;
  createdAt: Date;
  unlockAt: Date;
  reminderSentAt: Date | null;
  openedAt: Date | null;
}

export default mongoose.models.Locket || mongoose.model('Locket', LocketSchema);

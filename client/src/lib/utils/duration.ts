import prettyMilliseconds from 'pretty-ms';

/** Lockets unlock exactly this many years after they are sealed. */
export const LOCK_YEARS = 5;

/** Returns a new Date `LOCK_YEARS` calendar years after the given date. */
export function unlockDateFrom(createdAt: Date): Date {
  const d = new Date(createdAt.getTime());
  d.setFullYear(d.getFullYear() + LOCK_YEARS);
  return d;
}

/** True once the unlock moment has passed. */
export function isUnlocked(unlockAt: Date | string, now: Date = new Date()): boolean {
  return new Date(unlockAt).getTime() <= now.getTime();
}

/** Human-readable remaining time, e.g. "4 years 11 months 3 days". */
export function formatRemaining(unlockAt: Date | string, now: Date = new Date()): string {
  const ms = new Date(unlockAt).getTime() - now.getTime();
  if (ms <= 0) return 'now';
  return prettyMilliseconds(ms, {
    verbose: true,
    unitCount: 4,
    secondsDecimalDigits: 0
  });
}

/**
 * `yyyy-MM-dd` for the user's local calendar day. Local parts, not `toISOString()`, which is the
 * UTC day and rolls over early or late away from UTC.
 */
export const localDateKey = (date = new Date()): string =>
  `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

/** The `yyyy-MM-dd` day of an API date string, with or without a time part. */
export const toDateKey = (isoDate: string): string => isoDate.slice(0, 10);

/** The local-midnight `Date` for a `yyyy-MM-dd` key (time part ignored) — the inverse of
 *  `localDateKey`. `new Date(key)` would parse it as UTC midnight and land on the wrong day west
 *  of UTC. */
export const fromDateKey = (key: string | null): Date | null => {
  if (!key) {
    return null;
  }
  const [year, month, day] = key.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

import { localDateKey } from '@shared/utilities/date-key';

/** `localDateKey` for the institution-policies date pickers, which hold `null` while blank. */
export function ymd(value: Date | null): string | null {
  return value ? localDateKey(value) : null;
}

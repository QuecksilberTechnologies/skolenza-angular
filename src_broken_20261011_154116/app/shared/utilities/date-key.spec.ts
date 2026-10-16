import { localDateKey, toDateKey } from './date-key';

describe('localDateKey', () => {
  it('pads month and day from the local calendar parts', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('toDateKey', () => {
  it('drops a time part', () => {
    expect(toDateKey('2026-08-15T00:00:00')).toBe('2026-08-15');
  });

  it('keeps a date-only string as-is', () => {
    expect(toDateKey('2026-08-15')).toBe('2026-08-15');
  });
});

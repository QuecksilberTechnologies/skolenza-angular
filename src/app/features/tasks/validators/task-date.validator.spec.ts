import { describe, expect, it } from 'vitest';

import { isDueBeforeStart } from './task-date.validator';

describe('isDueBeforeStart', () => {
  it('is false when either date is missing', () => {
    expect(isDueBeforeStart(null, new Date('2026-07-01'))).toBe(false);
    expect(isDueBeforeStart(new Date('2026-07-01'), null)).toBe(false);
    expect(isDueBeforeStart(null, null)).toBe(false);
  });

  it('is true when due precedes start', () => {
    expect(isDueBeforeStart(new Date('2026-06-30'), new Date('2026-07-01'))).toBe(true);
  });

  it('is false when due equals or follows start', () => {
    expect(isDueBeforeStart(new Date('2026-07-01'), new Date('2026-07-01'))).toBe(false);
    expect(isDueBeforeStart(new Date('2026-07-05'), new Date('2026-07-01'))).toBe(false);
  });
});

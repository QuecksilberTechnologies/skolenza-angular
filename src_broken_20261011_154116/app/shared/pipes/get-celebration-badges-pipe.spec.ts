import { GetCelebrationBadgesPipe } from './get-celebration-badges-pipe';

describe('GetCelebrationBadgesPipe', () => {
  const pipe = new GetCelebrationBadgesPipe();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 4, 10));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a birthday badge only on the birthday', () => {
    expect(pipe.transform('1990-10-04', undefined)).toEqual([
      {
        kind: 'birthday',
        icon: 'pi-gift text-pink-700 dark:text-pink-400',
        label: 'Birthday today',
      },
    ]);
    expect(pipe.transform('1990-10-05', undefined)).toEqual([]);
  });

  it('reads the API UTC timestamp format', () => {
    const utcMidnight = new Date(1997, 9, 4);
    const pad = (n: number) => String(n).padStart(2, '0');
    const api = `${pad(utcMidnight.getUTCMonth() + 1)}/${pad(utcMidnight.getUTCDate())}/${utcMidnight.getUTCFullYear()} ${pad(utcMidnight.getUTCHours())}:${pad(utcMidnight.getUTCMinutes())}:00`;
    expect(pipe.transform(api, '10/01/2026 12:32:34').map((b) => b.kind)).toEqual(['birthday']);
  });

  it('shows a work anniversary from the first full year', () => {
    expect(pipe.transform(undefined, '2023-10-04T00:00:00')).toEqual([
      {
        kind: 'anniversary',
        icon: 'pi-crown text-amber-700 dark:text-amber-400',
        label: '3 yr work anniversary',
      },
    ]);
    expect(pipe.transform(undefined, '2026-10-04')).toEqual([]);
  });

  it('returns both badges when both fall today', () => {
    expect(pipe.transform('1990-10-04', '2020-10-04').map((b) => b.kind)).toEqual([
      'birthday',
      'anniversary',
    ]);
  });

  it('ignores empty or invalid dates', () => {
    expect(pipe.transform('', '')).toEqual([]);
    expect(pipe.transform('not-a-date', '2020-13-04')).toEqual([]);
  });

  it('celebrates Feb 29 on Feb 28 in non-leap years', () => {
    vi.setSystemTime(new Date(2027, 1, 28, 10));
    expect(pipe.transform('2000-02-29', undefined).map((b) => b.kind)).toEqual(['birthday']);
  });
});

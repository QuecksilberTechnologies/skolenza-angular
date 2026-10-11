import { progressTone } from './progress-tone';

describe('progressTone', () => {
  it('returns the complete band at and above 80', () => {
    expect(progressTone(80).stroke).toBe('#15803d');
    expect(progressTone(100).stroke).toBe('#15803d');
  });

  it('returns the partial band between 70 and 79', () => {
    expect(progressTone(70).stroke).toBe('#b45309');
    expect(progressTone(79).stroke).toBe('#b45309');
  });

  it('returns the incomplete band below 70', () => {
    expect(progressTone(69).stroke).toBe('#dc2626');
    expect(progressTone(0).stroke).toBe('#dc2626');
  });

  it('falls back to the incomplete band for NaN', () => {
    expect(progressTone(Number.NaN).stroke).toBe('#dc2626');
  });

  it('pairs every stroke with text and bar classes', () => {
    for (const percent of [0, 75, 90]) {
      const tone = progressTone(percent);

      expect(tone.text).toMatch(/^text-\S+ dark:text-\S+$/);
      expect(tone.bar).toMatch(/^bg-\S+ dark:bg-\S+$/);
    }
  });
});

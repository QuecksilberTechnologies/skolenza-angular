import { percentOf } from './percent-of';

describe('percentOf', () => {
  it('floors so an unfinished total never reads 100%', () => {
    expect(percentOf(995_000, 1_000_000)).toBe(99);
    expect(percentOf(199, 200)).toBe(99);
  });

  it('returns 100 only when the part covers the whole', () => {
    expect(percentOf(200, 200)).toBe(100);
  });

  it('clamps over-collection to 100 and negatives to 0', () => {
    expect(percentOf(900_000, 780_000)).toBe(100);
    expect(percentOf(-5, 100)).toBe(0);
  });

  it('returns 0 for an empty or invalid whole', () => {
    expect(percentOf(10, 0)).toBe(0);
    expect(percentOf(10, -1)).toBe(0);
    expect(percentOf(10, Number.NaN)).toBe(0);
  });
});

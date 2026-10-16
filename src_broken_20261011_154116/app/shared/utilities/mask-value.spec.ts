import { maskValue } from './mask-value';

describe('maskValue', () => {
  it('keeps the first two characters and the length by default', () => {
    expect(maskValue('ABCDE1234F')).toBe('AB********');
  });

  it('honours a custom visible count', () => {
    expect(maskValue('₹12,00,000', 1)).toBe('₹*********');
  });

  it('leaves values no longer than the visible part unmasked', () => {
    expect(maskValue('A')).toBe('A');
  });

  it('passes empty values through as null', () => {
    expect(maskValue(null)).toBeNull();
    expect(maskValue(undefined)).toBeNull();
    expect(maskValue('')).toBe('');
  });
});

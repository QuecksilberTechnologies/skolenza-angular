import { normalizeCurrencyCode } from './currency';

describe('normalizeCurrencyCode', () => {
  it('passes through the known ISO codes', () => {
    expect(normalizeCurrencyCode('INR')).toBe('INR');
    expect(normalizeCurrencyCode('USD')).toBe('USD');
    expect(normalizeCurrencyCode('EUR')).toBe('EUR');
    expect(normalizeCurrencyCode('GBP')).toBe('GBP');
  });

  it('takes any three-letter key at face value, so the lookup file drives the list', () => {
    expect(normalizeCurrencyCode('JPY')).toBe('JPY');
    expect(normalizeCurrencyCode('aed')).toBe('AED');
  });

  it('maps bare symbols to their ISO code', () => {
    expect(normalizeCurrencyCode('$')).toBe('USD');
    expect(normalizeCurrencyCode('₹')).toBe('INR');
    expect(normalizeCurrencyCode('€')).toBe('EUR');
    expect(normalizeCurrencyCode('£')).toBe('GBP');
    expect(normalizeCurrencyCode('¥')).toBe('JPY');
  });

  it('ignores casing and surrounding whitespace', () => {
    expect(normalizeCurrencyCode('inr')).toBe('INR');
    expect(normalizeCurrencyCode('  usd  ')).toBe('USD');
    expect(normalizeCurrencyCode(' $ ')).toBe('USD');
  });

  it('returns null for anything it does not recognise', () => {
    expect(normalizeCurrencyCode('rupees')).toBeNull();
    expect(normalizeCurrencyCode('12')).toBeNull();
    expect(normalizeCurrencyCode('')).toBeNull();
    expect(normalizeCurrencyCode('   ')).toBeNull();
    expect(normalizeCurrencyCode(null)).toBeNull();
    expect(normalizeCurrencyCode(undefined)).toBeNull();
  });
});

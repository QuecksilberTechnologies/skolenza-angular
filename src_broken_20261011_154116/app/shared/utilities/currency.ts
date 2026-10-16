/** `currencyKey` is a free-form string on the API, so it arrives as an ISO code on most
 *  rows and as a bare symbol (`$`) on others. */
const SYMBOL_CODES: Record<string, string> = {
  '₹': 'INR',
  $: 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
};

const ISO_CODE_PATTERN = /^[A-Za-z]{3}$/;

/** Returns the ISO code for a currency key, or `null` when it is not recognised. Any three-letter
 *  key is taken at face value — the currency lookup is data-driven now, and Angular's `currency`
 *  pipe resolves the symbol for every ISO code from locale data. */
export function normalizeCurrencyCode(currencyKey: string | null | undefined): string | null {
  const key = currencyKey?.trim();
  if (!key) {
    return null;
  }

  if (ISO_CODE_PATTERN.test(key)) {
    return key.toUpperCase();
  }

  return SYMBOL_CODES[key] ?? null;
}

/**
 * Flag image for a country, from its ISO code.
 *
 * `flagcdn` has no `uk` entry — the ISO code for the United Kingdom is `gb`, and the API
 * answers `UK` for it.
 */
export function countryFlagUrl(countryCode?: string): string {
  const code = countryCode === 'UK' ? 'gb' : (countryCode?.toLowerCase() ?? '');
  return `https://flagcdn.com/16x12/${code}.webp`;
}

/** `flagcdn` has no `uk` entry — the ISO code for the United Kingdom is `gb`. */
export const flagUrl = (countryCode?: string): string => {
  const code = countryCode === 'UK' ? 'gb' : (countryCode?.toLowerCase() ?? '');
  return `https://flagcdn.com/16x12/${code}.webp`;
};

/**
 * V8 still answers `supportedValuesOf` with the tzdb *backward* links, so Chrome offers
 * `Asia/Calcutta` and no `Asia/Kolkata` while Firefox does the opposite. Renaming them here keeps
 * the saved value the same whatever the browser, and lets people find a zone by its current name.
 */
const TIME_ZONE_ALIASES: Readonly<Record<string, string>> = {
  'Africa/Asmera': 'Africa/Asmara',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'America/Catamarca': 'America/Argentina/Catamarca',
  'America/Cordoba': 'America/Argentina/Cordoba',
  'America/Godthab': 'America/Nuuk',
  'America/Indianapolis': 'America/Indiana/Indianapolis',
  'America/Jujuy': 'America/Argentina/Jujuy',
  'America/Louisville': 'America/Kentucky/Louisville',
  'America/Mendoza': 'America/Argentina/Mendoza',
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Atlantic/Faeroe': 'Atlantic/Faroe',
  'Europe/Kiev': 'Europe/Kyiv',
  'Pacific/Ponape': 'Pacific/Pohnpei',
  'Pacific/Truk': 'Pacific/Chuuk',
};

/** The canonical name of a zone, or the name itself when it is already canonical. */
export const canonicalZone = (zone: string): string => TIME_ZONE_ALIASES[zone] ?? zone;

/** ~420 IANA zones. `supportedValuesOf` is absent on older engines, hence the guard. */
export const IANA_TIME_ZONES: string[] =
  typeof Intl.supportedValuesOf === 'function'
    ? [...new Set(Intl.supportedValuesOf('timeZone').map(canonicalZone))].sort()
    : [];

/**
 * The browser's own zone, canonicalised, or `''` when this runtime does not list it. A new record
 * is almost always in the local zone, so forms seed with this rather than starting blank.
 */
export const browserTimeZone = (): string => {
  const zone = canonicalZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  return zone && IANA_TIME_ZONES.includes(zone) ? zone : '';
};

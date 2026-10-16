/** Free-text label: starts with a letter, then letters, digits, `_`, spaces or hyphens. */
export const LABEL_PATTERN = /^[A-Za-z][\w\s-]*$/;

/** Person name: starts with a letter, then letters, spaces or hyphens. */
export const PERSON_NAME_PATTERN = /^[A-Za-z][A-Za-z\s-]*$/;

/** Company name: starts with a letter, then letters, digits, spaces or `. , & -`. */
export const COMPANY_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9 .,&-]*$/;

/**
 * Company email: blocks the well-known consumer mail providers by domain, so a institution signs up
 * with a work address. `gmail.com` is deliberately absent from the blocklist - small institutions
 * often have no company mailbox yet - while the other free providers stay blocked.
 *
 * Provenance only, not shape: callers check {@link EMAIL_PATTERN} first, so someone who mistyped
 * their address is told that instead of being told it looks personal.
 *
 * The blocklist is anchored at the start of the domain, so it only rejects the provider's own
 * domain - a company that happens to host at `user@team.yahoo.com` still passes.
 */
export const COMPANY_EMAIL_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9.-]*@(?!yahoo\.com$|hotmail\.com$|outlook\.com$|aol\.com$|icloud\.com$|mail\.com$|protonmail\.com$|zoho\.com$|yandex\.com$|tuta\.net$|tutanota\.com$|gmx\.com$|live\.com$|msn\.com$|proton\.me$)(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/i;

/** Dotted host name - a domain (`acme.com`) or an SMTP host (`smtp.acme.com`). Rejects a leading `www.`. */
export const HOSTNAME_PATTERN = /^(?!www\.)(?!-)([A-Za-z0-9-]{1,63})(?<!-)(\.[A-Za-z0-9-]{1,63})+$/;

/** Email address, shape only. See {@link COMPANY_EMAIL_PATTERN} for the work-address check. */
export const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** IPv4 dotted quad, each octet 0-255. */
export const IP_ADDRESS_PATTERN =
  /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

/** MAC address, colon or hyphen separated. */
export const MAC_ADDRESS_PATTERN = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

/** http/https URL. */
export const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

/** Six-digit hex colour with the leading `#`, which is what `p-colorpicker` writes in `hex` mode. */
export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * Device user PIN: digits only. No length bound here on purpose - the handoff doc gives no rule
 * and the firmware owns it, so the backend's own message is what a wrong length should produce
 * rather than a guess made in the browser.
 */
export const DEVICE_PIN_PATTERN = /^\d+$/;

/** Physical card/track number: digits only, up to 19 - the length ISO/IEC 7812 allows. */
export const CARD_NUMBER_PATTERN = /^\d{1,19}$/;

/**
 * Aadhaar: exactly 12 digits. UIDAI never issues a number starting with 0 or 1, but that
 * check is deliberately left out - it blocks the seeded test numbers, and the backend is the
 * authority on whether a number really exists.
 */
export const AADHAAR_PATTERN = /^\d{12}$/;

/** PAN: five letters, four digits, one letter. Match against the upper-cased value. */
export const PAN_PATTERN = /^[A-Z]{5}\d{4}[A-Z]$/;

/** Passport: a letter followed by 5-8 alphanumerics. Match against the upper-cased value. */
export const PASSPORT_PATTERN = /^[A-Z][A-Z0-9]{5,8}$/;

/**
 * Driving licence: charset and length only. State formats vary too much to pin down a
 * single shape, so this rejects punctuation and typos without rejecting valid licences.
 */
export const DRIVING_LICENSE_PATTERN = /^[A-Z0-9][A-Z0-9\s-]{6,18}[A-Z0-9]$/;

/** Voter ID (EPIC): three letters then seven digits. Match against the upper-cased value. */
export const VOTER_ID_PATTERN = /^[A-Z]{3}\d{7}$/;

/** UAN: exactly 12 digits. */
export const UAN_PATTERN = /^\d{12}$/;

/**
 * Free-text person or relation as someone actually writes it: starts with a letter, then
 * letters, spaces and the punctuation real names carry - `O'Brien`, `Sr. Ramesh`,
 * `Mother-in-law`, `Father, Spouse`.
 */
export const CONTACT_NAME_PATTERN = /^[A-Za-z][A-Za-z\s.,'-]*$/;

/** ISO 3166-1 alpha-2 country code. Upper-case it before sending. */
export const COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/;

/** ISO 4217 currency code. Upper-case it before sending. */
export const CURRENCY_CODE_PATTERN = /^[A-Za-z]{3}$/;

/** Indian GSTIN: state code, PAN, entity number, `Z`, checksum. Match against the upper-cased value. */
export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Indian PIN code: six digits, never starting with 0. */
export const PIN_CODE_PATTERN = /^[1-9]\d{5}$/;

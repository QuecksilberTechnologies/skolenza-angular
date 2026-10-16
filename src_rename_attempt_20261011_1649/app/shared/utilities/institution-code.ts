/** Single source of truth for the institution code length rule — the generator below pads to it. */
export const MIN_INSTITUTION_CODE_LENGTH = 2;

/**
 * Legal suffixes carry no identity, so they never make it into the initials.
 *
 * Anchored on word boundaries: unanchored, `co` ate the middle of "Cognizant" and `inc` the front
 * of "Incredible", so the initials came from letters nobody typed.
 */
const LEGAL_SUFFIXES = /\b(pvt|private|llp|llc|ltd|limited|inc|corporation|corp|company|co)\b\.?/gi;

/**
 * The institution code a company name implies: its initials, uppercased.
 *
 * Self-service registration derives the code rather than asking for it, and the host institution
 * form offers the same value as a default, so the rule lives here rather than in either.
 */
export function generateInstitutionCode(companyName: string): string {
  const alphanumeric = companyName.replace(/[^A-Za-z0-9\s]/g, '').trim();
  const withoutSuffixes = alphanumeric.replace(LEGAL_SUFFIXES, '').trim();

  // A name that is nothing but suffixes ("Co Ltd.") would otherwise derive an empty code, and the
  // registration form no longer shows the field for anyone to correct it.
  const cleaned = withoutSuffixes || alphanumeric;

  const initials = cleaned
    .split(/\s+/)
    .map((part) => part[0])
    .join('');

  // Only pad when the initials fall short of what the field actually accepts.
  const code =
    initials.length < MIN_INSTITUTION_CODE_LENGTH
      ? cleaned.replace(/\s+/g, '').substring(0, 3)
      : initials;

  return code.toUpperCase();
}

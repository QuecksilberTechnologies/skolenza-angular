import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Expected local phone number lengths (without dial code) per country code. */
const COUNTRY_PHONE_LENGTH: Record<string, { min: number; max: number }> = {
  IN: { min: 10, max: 10 },
  US: { min: 10, max: 10 },
  GB: { min: 10, max: 10 },
  UK: { min: 10, max: 10 },
  CA: { min: 10, max: 10 },
  AU: { min: 9, max: 9 },
  DE: { min: 10, max: 11 },
  FR: { min: 9, max: 9 },
  CN: { min: 11, max: 11 },
  JP: { min: 10, max: 10 },
  BR: { min: 10, max: 11 },
  RU: { min: 10, max: 10 },
  ZA: { min: 9, max: 9 },
  MX: { min: 10, max: 10 },
  AE: { min: 9, max: 9 },
  SG: { min: 8, max: 8 },
  MY: { min: 9, max: 10 },
  NZ: { min: 9, max: 10 },
  PH: { min: 10, max: 10 },
  ID: { min: 10, max: 12 },
  SA: { min: 9, max: 9 },
  KR: { min: 10, max: 11 },
  IT: { min: 9, max: 10 },
  ES: { min: 9, max: 9 },
  NL: { min: 9, max: 9 },
  SE: { min: 9, max: 10 },
  NO: { min: 8, max: 8 },
  DK: { min: 8, max: 8 },
  FI: { min: 9, max: 10 },
  PL: { min: 9, max: 9 },
  BD: { min: 10, max: 10 },
  PK: { min: 10, max: 10 },
  LK: { min: 9, max: 9 },
  NP: { min: 10, max: 10 },
};

const DEFAULT_PHONE_LENGTH = { min: 7, max: 10 };

export function alternateNumberValidator(control: AbstractControl): ValidationErrors | null {
  const contact = control.get('contactNumber')?.value;
  const alternate = control.get('alternateNumber')?.value;

  if (contact && alternate && contact === alternate) {
    return { sameNumber: true };
  }

  return null;
}

export function contactNameValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value?.trim();
  if (!value) return null;

  // Reject 3+ consecutive identical characters (e.g. "palllvi")
  if (/(.)\1{2,}/.test(value)) return { repeatedChars: true };

  return null;
}

/**
 * The country-aware phone rule, free of `AbstractControl` so Signal Forms can use it too.
 * Returns `null` when the number is acceptable.
 */
export function checkContactNumber(value: string, countryCode: string): ValidationErrors | null {
  const trimmed = value?.toString().trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\s/g, '');

  if (!/^[0-9]+$/.test(digits)) return { pattern: true };

  if (/^0+$/.test(digits)) return { pattern: true };

  const { min, max } = COUNTRY_PHONE_LENGTH[countryCode] ?? DEFAULT_PHONE_LENGTH;
  if (digits.length < min || digits.length > max) {
    return { phoneLength: { min, max } };
  }

  return null;
}

export function contactNumberValidator(
  countryCode: string,
): (control: AbstractControl) => ValidationErrors | null {
  return (control: AbstractControl) => checkContactNumber(control.value, countryCode);
}

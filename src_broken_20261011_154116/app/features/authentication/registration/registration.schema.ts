import * as z from 'zod';

import {
  HOSTNAME_PATTERN,
  COMPANY_EMAIL_PATTERN,
  COMPANY_NAME_PATTERN,
  EMAIL_PATTERN,
  PERSON_NAME_PATTERN,
} from '@shared/utilities/validation-regex';
import { checkContactNumber } from '@shared/validators/contact.validators';

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this
 * validates the model in place — the ids stay `number | null` so their placeholders show,
 * and `onRegister()` is still what narrows them for the request body.
 */
const requiredId = (message: string) =>
  z
    .number()
    .nullable()
    .refine((value) => value !== null, message);

/** Country-aware, so it has to be built per selected country rather than declared once. */
const contactNumberSchema = (countryCode: string) =>
  z
    .string()
    .trim()
    .min(1, 'Mobile number is required')
    .superRefine((value, ctx) => {
      const errors = checkContactNumber(value, countryCode);
      if (!errors) {
        return;
      }
      const length = errors['phoneLength'] as { min: number; max: number } | undefined;
      ctx.addIssue({
        code: 'custom',
        message: !length
          ? 'Please enter a valid mobile number (digits only)'
          : length.min === length.max
            ? `Mobile number must be exactly ${length.min} digits`
            : `Mobile number must be ${length.min}-${length.max} digits`,
      });
    });

/**
 * Self-service institution sign-up. The institution code the API also wants is derived from the
 * company name at submit rather than collected, so it is neither in this schema nor in the
 * model — see `generateInstitutionCode` in `@shared/utilities/institution-code`.
 */
export const registrationSchema = (countryCode: string) =>
  z.object({
    companyName: z
      .string()
      .trim()
      .min(1, 'Institution name is required.')
      .min(2, 'Institution name must be at least 2 characters.')
      .regex(
        COMPANY_NAME_PATTERN,
        'Enter a valid institution name (letters, numbers, spaces, hyphens, dots allowed).',
      ),
    companyEmailDomain: z
      .string()
      .trim()
      .min(1, 'Company website domain is required.')
      .regex(HOSTNAME_PATTERN, 'Enter a valid domain, e.g. example.com'),
    institutionEmail: z
      .string()
      .trim()
      .min(1, 'Company email address is required.')
      // Shape first, then provenance: one rule for both would tell someone who mistyped their
      // address that it is a personal one.
      .regex(EMAIL_PATTERN, 'Please enter a valid email address (e.g. user@example.com).')
      .regex(
        COMPANY_EMAIL_PATTERN,
        'Personal email addresses (Yahoo, Outlook, iCloud, etc.) are not allowed. Please use a company or Gmail address.',
      ),
    contactPersonName: z
      .string()
      .trim()
      .min(1, "Please enter the contact person's name.")
      .min(2, 'Name must be at least 2 characters.')
      .max(50, 'Name must not exceed 50 characters.')
      .regex(PERSON_NAME_PATTERN, 'Please enter a valid name. Only letters and spaces are allowed.')
      // Rejects 3+ consecutive identical characters, e.g. "Palllvi".
      .refine(
        (value) => !/(.)\1{2,}/.test(value),
        'Name cannot contain 3 or more consecutive repeated characters.',
      ),
    contactNumber: contactNumberSchema(countryCode),
    countryId: requiredId('Please select a country'),
    genderId: requiredId('Please select a gender'),
    institutionTypeId: requiredId('Please select an institution type'),
    // The same rule the host institution form applies to `staffMemberCodePattern.prefix`.
    prefix: z
      .string()
      .trim()
      .min(1, 'Prefix is required.')
      .max(10, 'Prefix cannot exceed 10 characters.'),
  });

/**
 * `z.input`, not `z.infer` — the trailing `.refine`s narrow null out of the *output* type,
 * but the selects have to keep holding null for their placeholders to show.
 */
export type RegistrationModel = z.input<ReturnType<typeof registrationSchema>>;

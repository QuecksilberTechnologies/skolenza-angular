import * as z from 'zod';

import { MIN_INSTITUTION_CODE_LENGTH } from '@shared/utilities/institution-code';
import {
  HOSTNAME_PATTERN,
  COMPANY_EMAIL_PATTERN,
  COMPANY_NAME_PATTERN,
  HEX_COLOR_PATTERN,
  PERSON_NAME_PATTERN,
  URL_PATTERN,
} from '@shared/utilities/validation-regex';
import { checkContactNumber } from '@shared/validators/contact.validators';

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this validates
 * the model in place — the ids stay `number | null` so their placeholders show, and `onSubmit()`
 * is still what narrows them for the request body.
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
    .min(1, 'Contact number is required')
    .superRefine((value, ctx) => {
      const errors = checkContactNumber(value, countryCode);
      if (!errors) {
        return;
      }
      const length = errors['phoneLength'] as { min: number; max: number } | undefined;
      ctx.addIssue({
        code: 'custom',
        message: !length
          ? 'Enter a valid contact number'
          : length.min === length.max
            ? `Contact number must be ${length.min} digits`
            : `Contact number must be ${length.min}-${length.max} digits`,
      });
    });

/** The flat company and contact fields both DTOs share. Neither form is built from this directly. */
const institutionCoreSchema = (countryCode: string) =>
  z.object({
    companyName: z
      .string()
      .trim()
      .min(1, 'Institution name is required')
      .min(2, 'Institution name must be at least 2 characters')
      .regex(COMPANY_NAME_PATTERN, 'Enter a valid institution name'),
    institutionCode: z
      .string()
      .trim()
      .min(1, 'Institution code is required')
      .min(
        MIN_INSTITUTION_CODE_LENGTH,
        `Institution code must be at least ${MIN_INSTITUTION_CODE_LENGTH} characters`,
      )
      .max(20, 'Institution code cannot exceed 20 characters'),
    companyEmailDomain: z
      .string()
      .trim()
      .min(1, 'Institution domain is required')
      .regex(HOSTNAME_PATTERN, 'Enter a valid domain, e.g. greenfield.edu'),
    institutionEmail: z
      .string()
      .trim()
      .min(1, 'Institution email is required')
      .regex(COMPANY_EMAIL_PATTERN, 'Enter a work email address, not a personal one'),
    contactPersonName: z
      .string()
      .trim()
      .min(1, 'Contact person is required')
      .min(2, 'Contact person must be at least 2 characters')
      .max(50, 'Contact person cannot exceed 50 characters')
      .regex(PERSON_NAME_PATTERN, 'Use only letters, spaces or hyphens, starting with a letter'),
    contactNumber: contactNumberSchema(countryCode),
    countryId: requiredId('Country is required'),
    isActive: z.boolean(),
  });

/** Optional free text with a length cap — the shape the location form already uses. */
const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

/**
 * The two nested blocks below are collected in both modes but only *demanded* on create.
 *
 * Onboarding is where a complete record gets captured. An edit is not: `create-institution` leaves the
 * profile row blank and creates no location at all, so a institution onboarded through self-service
 * hydrates with ~20 empty fields. Demanding them would mean a host could not correct a phone number
 * without also inventing a founding year and a head office. Every field in
 * `NewInstitutionUpdateRequestDTO` is nullable, so the blanks go out as nulls.
 */
type Strictness = 'required' | 'optional';

/** Capped text that is only demanded when the block is. */
const blockText = (strictness: Strictness, max: number, label: string, requiredMessage: string) => {
  const base = optionalText(max, label);
  return strictness === 'required' ? base.min(1, requiredMessage) : base;
};

/** A format rule has nothing to say about an empty field, so it only bites once something is typed. */
const blockPattern = (
  strictness: Strictness,
  max: number,
  label: string,
  requiredMessage: string,
  pattern: RegExp,
  patternMessage: string,
) =>
  blockText(strictness, max, label, requiredMessage).refine(
    (value) => value === '' || pattern.test(value),
    patternMessage,
  );

/**
 * A blank numeric input holds `null` so its placeholder shows, so the bounds go on *before*
 * `.nullable()`. See `.claude/docs/forms.md`.
 */
const boundedNumber = (min: number, max: number, label: string) =>
  z
    .number()
    .int(`${label} must be a whole number`)
    .min(min, `${label} cannot be less than ${min}`)
    .max(max, `${label} cannot exceed ${max}`)
    .nullable();

/** The required message rides a trailing `.refine`, since `.nullable()` has already been applied. */
const requiredNumber = (min: number, max: number, label: string) =>
  boundedNumber(min, max, label).refine((value) => value !== null, `${label} is required`);

/**
 * The trailing `.refine(() => true)` on the optional branch is not a rule — it is what makes both
 * branches the same zod type, so `InstitutionFormModel` stays one shape rather than a union of two.
 */
const blockNumber = (strictness: Strictness, min: number, max: number, label: string) =>
  strictness === 'required'
    ? requiredNumber(min, max, label)
    : boundedNumber(min, max, label).refine(() => true);

/** Same shape as {@link requiredId}, without the demand. See {@link blockNumber} on the no-op. */
const blockId = (strictness: Strictness, requiredMessage: string) =>
  strictness === 'required'
    ? requiredId(requiredMessage)
    : z
        .number()
        .nullable()
        .refine(() => true);

/** A company cannot have been founded after today, so the upper bound moves with the clock. */
const CURRENT_YEAR = new Date().getFullYear();

/**
 * `profile` block of the host DTOs. Its `industry` key is the label for the id the request already
 * carries in `institutionTypeId` — the submit handler fills it from the selected Institution type, so it is
 * neither collected nor validated here.
 */
export const institutionProfileSchema = (strictness: Strictness) =>
  z.object({
    businessType: blockText(
      strictness,
      100,
      'Institution ownership',
      'Institution ownership is required',
    ),
    websiteUrl: blockPattern(
      strictness,
      200,
      'Website',
      'Website is required',
      URL_PATTERN,
      'Enter a full URL, e.g. https://acme.com',
    ),
    logoUrl: blockPattern(
      strictness,
      500,
      'Logo URL',
      'Logo URL is required',
      URL_PATTERN,
      'Enter a full URL, e.g. https://acme.com/logo.png',
    ),
    themeColor: blockPattern(
      strictness,
      7,
      'Theme colour',
      'Theme colour is required',
      HEX_COLOR_PATTERN,
      'Enter a six-digit hex colour, e.g. #2563eb',
    ),
    totalStaffMembers: blockNumber(strictness, 1, 1_000_000, 'Total staffMembers'),
    totalBranches: blockNumber(strictness, 1, 10_000, 'Total branches'),
    foundedYear: blockNumber(strictness, 1800, CURRENT_YEAR, 'Founded year'),
  });

/**
 * `initialLocation` block. The field rules mirror
 * `features/institution-locations/institution-location-form/institution-location-form.schema.ts` minus the three
 * keys this DTO does not carry: `countryId` (the root of the request has it), `isHeadOffice` and
 * `isActive`.
 */
export const initialLocationSchema = (strictness: Strictness) =>
  z
    .object({
      locationCode: blockText(strictness, 50, 'Location code', 'Location code is required'),
      locationName: blockText(strictness, 150, 'Location name', 'Location name is required'),
      locationType: blockId(strictness, 'Location type is required'),

      stateId: blockId(strictness, 'State is required'),
      districtId: blockId(strictness, 'District is required'),
      localityId: z.number().nullable(),
      address: blockText(strictness, 500, 'Address', 'Address is required'),
      landmark: optionalText(200, 'Landmark'),
      postalCode: optionalText(20, 'Postal code'),

      latitude: z
        .number()
        .min(-90, 'Latitude cannot be less than -90')
        .max(90, 'Latitude cannot exceed 90')
        .nullable(),
      longitude: z
        .number()
        .min(-180, 'Longitude cannot be less than -180')
        .max(180, 'Longitude cannot exceed 180')
        .nullable(),
      isGeoFenceEnabled: z.boolean(),
      geoFenceRadiusMeters: z
        .number()
        .int('Geo-fence radius must be a whole number of metres')
        .min(1, 'Geo-fence radius cannot be less than 1')
        .max(10000, 'Geo-fence radius cannot exceed 10000')
        .nullable(),
      timeZoneId: blockText(strictness, 100, 'Time zone', 'Time zone is required'),

      isAttendanceAllowed: z.boolean(),
      isBiometricEnabled: z.boolean(),
    })
    // The geo-fence rules apply in both modes: they are driven by the fence toggle, not by how
    // strictly the rest of the block is demanded.
    .superRefine((value, ctx) => {
      const { isGeoFenceEnabled, geoFenceRadiusMeters, latitude, longitude } = value;

      // A fence needs both a centre and a radius, so these three rules only bite once it is on.
      if (isGeoFenceEnabled) {
        if (geoFenceRadiusMeters === null) {
          ctx.addIssue({
            code: 'custom',
            path: ['geoFenceRadiusMeters'],
            message: 'Geo-fence radius is required when the geo-fence is enabled',
          });
        }
        if (latitude === null) {
          ctx.addIssue({
            code: 'custom',
            path: ['latitude'],
            message: 'Latitude is required when the geo-fence is enabled',
          });
        }
        if (longitude === null) {
          ctx.addIssue({
            code: 'custom',
            path: ['longitude'],
            message: 'Longitude is required when the geo-fence is enabled',
          });
        }
        return;
      }

      // Half a coordinate pair pins nothing; ask for the missing half.
      if (latitude !== null && longitude === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['longitude'],
          message: 'Longitude is required when a latitude is given',
        });
      }
      if (longitude !== null && latitude === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['latitude'],
          message: 'Latitude is required when a longitude is given',
        });
      }
    });

/** `staffMemberCodePattern` block — the same rules the flat create form used to carry at its root. */
export const staffMemberCodePatternSchema = z.object({
  prefix: z
    .string()
    .trim()
    .min(1, 'Prefix is required')
    .max(10, 'Prefix cannot exceed 10 characters'),
  separator: z.string().max(1, 'Separator must be a single character'),
  runningNumberLength: z
    .string()
    .regex(/^[1-9][0-9]?$/, 'Running number length must be between 1 and 99'),
  includeYear: z.boolean(),
  includeMonth: z.boolean(),
  includeDepartment: z.boolean(),
});

/**
 * Both host DTOs carry the same three nested blocks, so both forms validate them — the edit form
 * just does not demand two of them, for the reason recorded on {@link Strictness}.
 *
 * They nest rather than flattening into prefixed root keys the way every other form here does,
 * because the DTOs nest: the model is the request body, so the submit handler hands each block
 * straight to its builder rather than unprefixing a flat model back into shape.
 */
export const institutionEditSchema = (countryCode: string) =>
  institutionCoreSchema(countryCode).extend({
    genderId: requiredId('Gender is required'),
    institutionTypeId: requiredId('Institution type is required'),
    // Nullable rather than required: `null` is what the reads return for a institution that has none,
    // and it is the only value the PUT accepts in that case - `0` is rejected as an invalid
    // configuration reference. `create-institution-by-host` carries no currency at all, so a institution
    // starts here.
    defaultCurrency: z.number().nullable(),
    profile: institutionProfileSchema('optional'),
    initialLocation: initialLocationSchema('optional'),
    // `create-institution` always writes a pattern, so an edit always has one to hydrate from.
    staffMemberCodePattern: staffMemberCodePatternSchema,
  });

/**
 * The plan is the one write-once field: `new-institution-update-by-host` does not carry it, so the edit
 * form displays the institution's plan rather than collecting it. `z.object` strips the keys it does not
 * declare, so leaving it out of `institutionEditSchema` is what keeps it unvalidated there.
 */
export const institutionCreateSchema = (countryCode: string) =>
  institutionEditSchema(countryCode).extend({
    subscriptionPlanId: requiredId('Subscription plan is required'),
    profile: institutionProfileSchema('required'),
    initialLocation: initialLocationSchema('required'),
  });

/**
 * `z.input`, not `z.infer` — the trailing `.refine`s narrow null out of the *output* type, but the
 * selects have to keep holding null for their placeholders to show.
 */
export type InstitutionFormModel = z.input<ReturnType<typeof institutionCreateSchema>>;

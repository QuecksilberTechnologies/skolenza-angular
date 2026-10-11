import * as z from 'zod';

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this validates the
 * model in place — the numbers stay `number | null` so their placeholders show, and the submit
 * handler is what normalises them for the request body.
 */

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

const requiredId = (label: string) =>
  z
    .number()
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

export const campusSchema = z
  .object({
    locationCode: z
      .string()
      .trim()
      .min(1, 'Location code is required')
      .max(50, 'Location code must be at most 50 characters'),
    locationName: z
      .string()
      .trim()
      .min(1, 'Location name is required')
      .max(150, 'Location name must be at most 150 characters'),
    locationType: requiredId('Location type'),
    isHeadOffice: z.boolean(),

    countryId: requiredId('Country'),
    stateId: z.number().nullable(),
    districtId: z.number().nullable(),
    localityId: z.number().nullable(),
    address: optionalText(500, 'Address'),
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
    timeZoneId: z
      .string()
      .trim()
      .min(1, 'Time zone is required')
      .max(100, 'Time zone must be at most 100 characters'),

    isAttendanceAllowed: z.boolean(),
    isBiometricEnabled: z.boolean(),

    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const { isGeoFenceEnabled, geoFenceRadiusMeters, latitude, longitude, countryId, stateId } =
      value;

    // A fence needs both a centre and a radius, so the two rules below only bite once it is on.
    if (isGeoFenceEnabled && geoFenceRadiusMeters === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['geoFenceRadiusMeters'],
        message: 'Geo-fence radius is required when the geo-fence is enabled',
      });
    }

    if (isGeoFenceEnabled) {
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
    } else {
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
    }

    if (stateId !== null && countryId === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['countryId'],
        message: 'Select a country before a state',
      });
    }
  });

/** `z.input`, not `z.infer` — the trailing `.refine`s narrow null out of the output type, but the
 *  model has to keep holding null for the empty selects. */
export type CampusFormModel = z.input<typeof campusSchema>;

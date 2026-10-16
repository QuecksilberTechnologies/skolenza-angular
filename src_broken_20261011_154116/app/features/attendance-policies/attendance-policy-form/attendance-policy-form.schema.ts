import * as z from 'zod';

import { AttendanceLocationScope } from '@shared/interfaces';

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this validates the
 * model in place — the ids stay `number | null` so the empty selects show their placeholder, and the
 * submit handler is what normalises the strings for the request body.
 */

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

const requiredId = (label: string) =>
  z
    .number()
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

export const attendancePolicySchema = z
  .object({
    policyTypeId: requiredId('Policy type'),
    policyName: z
      .string()
      .trim()
      .min(1, 'Policy name is required')
      .max(150, 'Policy name must be at most 150 characters'),
    description: optionalText(2000, 'Description'),
    remark: optionalText(500, 'Remark'),

    attendanceLocationScope: requiredId('Location scope'),
    requireGeoFenceForOffice: z.boolean(),
    requireGpsForRemote: z.boolean(),
    allowOutsideLocationWithApproval: z.boolean(),

    allowBiometric: z.boolean(),
    allowMobile: z.boolean(),
    allowWeb: z.boolean(),
    allowManualAttendance: z.boolean(),
    allowWorkFromHome: z.boolean(),

    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const {
      allowBiometric,
      allowMobile,
      allowWeb,
      allowManualAttendance,
      allowWorkFromHome,
      requireGpsForRemote,
      requireGeoFenceForOffice,
      attendanceLocationScope,
    } = value;

    // A policy that allows no channel at all can never accept a punch.
    if (!allowBiometric && !allowMobile && !allowWeb && !allowManualAttendance) {
      ctx.addIssue({
        code: 'custom',
        path: ['allowBiometric'],
        message: 'At least one attendance channel must be allowed',
      });
    }

    if (requireGpsForRemote && !allowWorkFromHome) {
      ctx.addIssue({
        code: 'custom',
        path: ['requireGpsForRemote'],
        message: 'GPS can only be required for remote work when work from home is allowed',
      });
    }

    if (
      attendanceLocationScope === AttendanceLocationScope.RemoteAnywhere &&
      requireGeoFenceForOffice
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['requireGeoFenceForOffice'],
        message: 'A geo-fence cannot be required when attendance is allowed from anywhere',
      });
    }

    if (
      attendanceLocationScope === AttendanceLocationScope.PrimaryLocationOnly &&
      allowWorkFromHome
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['attendanceLocationScope'],
        message: 'Widen the location scope to allow work from home',
      });
    }
  });

/** `z.input`, not `z.infer` — the trailing `.refine`s narrow null out of the output type, but the
 *  model has to keep holding null for the empty selects. */
export type AttendancePolicyFormModel = z.input<typeof attendancePolicySchema>;

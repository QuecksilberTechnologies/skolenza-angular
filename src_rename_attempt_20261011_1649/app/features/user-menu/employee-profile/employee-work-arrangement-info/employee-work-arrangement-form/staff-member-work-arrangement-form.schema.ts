import * as z from 'zod';

import { WorkMode } from '@shared/interfaces';
import { workModeRequiresPrimaryLocation } from '@shared/utilities/common-data';

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this validates the
 * model in place — the ids and day counts stay `number | null` so their placeholders show, the dates
 * stay `Date | null` for the pickers, and the submit handler serializes them for the request body.
 */

const requiredId = (label: string) =>
  z
    .number()
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

/** Blank stays `null` so the input shows its placeholder; a filled value has to clear the bounds. */
const optionalCount = (label: string, maximum: number) =>
  z
    .number()
    .int(`${label} must be a whole number of days`)
    .min(0, `${label} cannot be negative`)
    .max(maximum, `${label} cannot exceed ${maximum}`)
    .nullable();

export const staffMemberWorkArrangementSchema = z
  .object({
    staffMemberId: z
      .string()
      .nullable()
      .refine((value) => !!value, 'StaffMember is required'),
    policyVersionId: requiredId('Attendance policy'),
    workMode: requiredId('Work mode'),
    hybridType: z.number().nullable(),
    primaryCampusId: z.number().nullable(),

    minimumOfficeDaysPerWeek: optionalCount('Minimum office days per week', 7),
    minimumOfficeDaysPerMonth: optionalCount('Minimum office days per month', 31),
    maximumWFHDaysPerMonth: optionalCount('Maximum work-from-home days per month', 31),

    effectiveFrom: z
      .date()
      .nullable()
      .refine((value) => value !== null, 'Effective from is required'),
    effectiveTo: z.date().nullable(),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const {
      effectiveFrom,
      effectiveTo,
      workMode,
      primaryCampusId,
      minimumOfficeDaysPerWeek,
      minimumOfficeDaysPerMonth,
      hybridType,
    } = value;

    if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) {
      ctx.addIssue({
        code: 'custom',
        path: ['effectiveTo'],
        message: 'Effective to cannot be before effective from',
      });
    }

    // The API requires a primary location for every physical office/client-site arrangement.
    if (
      workModeRequiresPrimaryLocation(workMode as WorkMode | null) &&
      primaryCampusId === null
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['primaryCampusId'],
        message: 'A primary location is required for office and hybrid work',
      });
    }

    if (workMode === WorkMode.Hybrid && hybridType === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['hybridType'],
        message: 'Hybrid type is required for hybrid work',
      });
    }

    if (
      minimumOfficeDaysPerWeek !== null &&
      minimumOfficeDaysPerMonth !== null &&
      minimumOfficeDaysPerMonth < minimumOfficeDaysPerWeek
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['minimumOfficeDaysPerMonth'],
        message: 'The monthly minimum cannot be lower than the weekly one',
      });
    }
  });

/** `z.input`, not `z.infer` — the trailing `.refine`s narrow null out of the output type, but the
 *  model has to keep holding null for the empty selects and date pickers. */
export type StaffMemberWorkArrangementFormModel = z.input<typeof staffMemberWorkArrangementSchema>;

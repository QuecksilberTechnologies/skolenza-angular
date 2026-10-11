import * as z from 'zod';

import { workModeRequiresExecutionLocation } from '@shared/utilities/common-data';

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this validates the
 * model in place — the ids stay `number | null` for the empty selects, and the submit handler is
 * what shapes the request body.
 */

const requiredId = (label: string) =>
  z
    .number()
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

export const staffMemberWorkPatternSchema = z
  .object({
    dayOfWeek: requiredId('Day'),
    workMode: z.number().nullable(),
    campusId: z.number().nullable(),
    isWorkingDay: z.boolean(),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const { workMode, campusId, isWorkingDay } = value;

    // A weekly off has no mode to pick.
    if (isWorkingDay && workMode === null) {
      ctx.addIssue({ code: 'custom', path: ['workMode'], message: 'Work mode is required' });
    }

    // Every location-bound mode has to say where the staffMember works.
    if (isWorkingDay && workModeRequiresExecutionLocation(workMode) && campusId === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['campusId'],
        message: 'A location is required for office and client-site days',
      });
    }
  });

/** `z.input`, not `z.infer` — the trailing `.refine`s narrow null out of the output type, but the
 *  model has to keep holding null for the empty selects. */
export type StaffMemberWorkPatternFormModel = z.input<typeof staffMemberWorkPatternSchema>;

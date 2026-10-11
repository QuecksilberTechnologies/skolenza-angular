import * as z from 'zod';

import {
  workModeRequiresExecutionLocation,
  WORK_MODE_OVERRIDE_REASON_MAX_LENGTH,
} from '@shared/utilities/common-data';

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this validates the
 * model in place — the ids stay `number | null` for the empty selects, the dates stay `Date | null`
 * for the pickers, and the submit handler serializes them for the request body.
 *
 * `approvalStatus` is deliberately absent: the create endpoint sets it server-side and no approval
 * endpoint exists, so the form cannot move it.
 */

const requiredId = (label: string) =>
  z
    .number()
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

export const staffMemberWorkModeOverrideSchema = z
  .object({
    staffMemberId: z
      .string()
      .nullable()
      .refine((value) => !!value, 'StaffMember is required'),
    requestedWorkMode: requiredId('Requested work mode'),
    staffMemberWorkArrangementId: z.number().nullable(),
    campusId: z.number().nullable(),
    fromDate: z
      .date()
      .nullable()
      .refine((value) => value !== null, 'From date is required'),
    toDate: z
      .date()
      .nullable()
      .refine((value) => value !== null, 'To date is required'),
    reason: z
      .string()
      .trim()
      .max(
        WORK_MODE_OVERRIDE_REASON_MAX_LENGTH,
        `Reason must be at most ${WORK_MODE_OVERRIDE_REASON_MAX_LENGTH} characters`,
      ),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const { fromDate, toDate, requestedWorkMode, campusId } = value;

    if (fromDate && toDate && toDate < fromDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['toDate'],
        message: 'To date cannot be before the from date',
      });
    }

    // An override onto an office or client site has to say which one.
    if (workModeRequiresExecutionLocation(requestedWorkMode) && campusId === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['campusId'],
        message: 'A location is required for office and client-site overrides',
      });
    }
  });

/** `z.input`, not `z.infer` — the trailing `.refine`s narrow null out of the output type, but the
 *  model has to keep holding null for the empty selects and date pickers. */
export type StaffMemberWorkModeOverrideFormModel = z.input<typeof staffMemberWorkModeOverrideSchema>;

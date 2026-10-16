import * as z from 'zod';

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this validates the
 * model in place — the ids stay `number | null` for the empty selects, the dates stay `Date | null`
 * for the pickers, and the submit handler is what serializes them for the request body.
 */

const requiredId = (label: string) =>
  z
    .number()
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

export const staffMemberLocationAssignmentSchema = z
  .object({
    staffMemberId: z
      .string()
      .nullable()
      .refine((value) => !!value, 'StaffMember is required'),
    institutionLocationId: requiredId('Location'),
    isPrimary: z.boolean(),
    isAttendanceAllowed: z.boolean(),
    effectiveFrom: z
      .date()
      .nullable()
      .refine((value) => value !== null, 'Effective from is required'),
    effectiveTo: z.date().nullable(),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const { effectiveFrom, effectiveTo } = value;
    if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) {
      ctx.addIssue({
        code: 'custom',
        path: ['effectiveTo'],
        message: 'Effective to cannot be before effective from',
      });
    }
  });

/** `z.input`, not `z.infer` — the trailing `.refine`s narrow null out of the output type, but the
 *  model has to keep holding null for the empty select and date picker. */
export type StaffMemberLocationAssignmentFormModel = z.input<typeof staffMemberLocationAssignmentSchema>;

import * as z from 'zod';

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this validates the
 * model in place — the device id stays `string | null` for the empty select and the access dates
 * stay `Date | null` for the pickers, and the submit handler is what serializes them for the
 * request body.
 *
 * Credentials are deliberately absent. Face, PIN and card each have their own endpoint and are only
 * callable once the enrollment exists, so nothing about them belongs on the create form.
 */

export const staffMemberDeviceEnrollmentSchema = z
  .object({
    staffMemberId: z
      .string()
      .nullable()
      .refine((value) => !!value, 'StaffMember is required'),
    institutionDeviceId: z
      .string()
      .nullable()
      .refine((value) => value !== null && value !== '', 'Device is required'),
    accessEffectiveFromDateTime: z.date().nullable(),
    accessEffectiveToDateTime: z.date().nullable(),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    const { accessEffectiveFromDateTime: from, accessEffectiveToDateTime: to } = value;

    if (from && to && to < from) {
      ctx.addIssue({
        code: 'custom',
        path: ['accessEffectiveToDateTime'],
        message: 'Access end must be on or after the start',
      });
    }

    if (to && !from) {
      ctx.addIssue({
        code: 'custom',
        path: ['accessEffectiveFromDateTime'],
        message: 'Access start is required when an end is set',
      });
    }
  });

/** `z.input`, not `z.infer` — the trailing `.refine` narrows null out of the output type, but the
 *  model has to keep holding null for the empty select. */
export type StaffMemberDeviceEnrollmentFormModel = z.input<typeof staffMemberDeviceEnrollmentSchema>;

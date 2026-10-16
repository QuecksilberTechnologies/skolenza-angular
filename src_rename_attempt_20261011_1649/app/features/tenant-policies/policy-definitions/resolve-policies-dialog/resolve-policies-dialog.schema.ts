import * as z from 'zod';

export const resolvePoliciesSchema = z.object({
  staffMemberId: z
    .string()
    .nullable()
    .refine((value) => value !== null, 'StaffMember is required'),
  effectiveDate: z
    .date()
    .nullable()
    .refine((value) => value !== null, 'Effective date is required'),
});

/** `z.input`, not `z.infer` — the `.refine`s narrow null out of the *output* type, but the model
 *  keeps holding null so the select and the date picker show their placeholders. */
export type ResolvePoliciesModel = z.input<typeof resolvePoliciesSchema>;

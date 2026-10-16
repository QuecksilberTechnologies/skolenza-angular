import * as z from 'zod';

export const assignPolicySchema = z.object({
  /** Encoded staffMember ids are sent unchanged to the policy API. */
  staffMemberIds: z.array(z.string()).min(1, 'Select at least one staffMember'),
  effectiveFrom: z
    .date()
    .nullable()
    .refine((value) => value !== null, 'Effective from is required'),
  effectiveTo: z.date().nullable(),
  isMandatory: z.boolean(),
});

/** `z.input`, not `z.infer` — the `.refine` narrows null out of the *output* type, but the model
 *  keeps holding null so the date picker shows its placeholder. */
export type AssignPolicyModel = z.input<typeof assignPolicySchema>;

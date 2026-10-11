import * as z from 'zod';

export const staffMemberWorkModeOverrideDecisionSchema = z.object({
  remark: z
    .string()
    .trim()
    .min(1, 'Rejection reason is required')
    .max(500, 'Rejection reason must be 500 characters or fewer'),
});

export type StaffMemberWorkModeOverrideDecisionModel = z.input<
  typeof staffMemberWorkModeOverrideDecisionSchema
>;

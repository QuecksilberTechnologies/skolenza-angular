import * as z from 'zod';

export const approvalStageSchema = z.object({
  /** `null` is a global stage: it applies to every category. */
  policyCategoryId: z.number().nullable(),
  stageName: z.string().trim().min(1, 'Stage name is required'),
  stageOrder: z
    .number()
    .min(1, 'Stage order must be at least 1')
    .nullable()
    .refine((value) => value !== null, 'Stage order is required'),
  approverRoleId: z
    .number()
    .nullable()
    .refine((value) => value !== null, 'Approver role is required'),
  minimumApprovals: z
    .number()
    .min(1, 'At least one approval is required')
    .nullable()
    .refine((value) => value !== null, 'Minimum approvals is required'),
  isMandatory: z.boolean(),
  isActive: z.boolean(),
});

/** `z.input`, not `z.infer` — the `.refine`s narrow null out of the *output* type, but the model
 *  keeps holding null so the numeric inputs and the role select start empty. */
export type ApprovalStageModel = z.input<typeof approvalStageSchema>;

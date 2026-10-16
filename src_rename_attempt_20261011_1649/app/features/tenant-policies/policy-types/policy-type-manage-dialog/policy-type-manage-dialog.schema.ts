import * as z from 'zod';

export const institutionPolicyTypeSchema = z.object({
  policyTypeCode: z
    .string()
    .trim()
    .min(1, 'Code is required')
    .max(50, 'Code must be 50 characters or fewer'),
  policyName: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional(),
  policyCategoryId: z
    .number()
    .nullable()
    .refine((value) => value !== null, 'Category is required'),
  defaultCurrencyCode: z.string().min(1, 'Currency is required'),
  isActive: z.boolean(),
});

/** `z.input`, not `z.infer` — the `.refine` narrows null out of the *output* type, but the model
 *  keeps holding null so the category select shows its placeholder until one is chosen. */
export type InstitutionPolicyTypeModel = z.input<typeof institutionPolicyTypeSchema>;

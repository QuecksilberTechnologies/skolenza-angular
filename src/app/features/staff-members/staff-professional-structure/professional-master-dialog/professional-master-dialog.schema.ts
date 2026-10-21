import * as z from 'zod';

/** Validates the model in place; the submit handler trims values for the request body. */
export const professionalMasterSchema = z.object({
  code: z.string().trim().min(1, 'Code is required'),
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string(),
  defaultFrequency: z.string(),
  isActive: z.boolean(),
});

export type ProfessionalMasterFormModel = z.infer<typeof professionalMasterSchema>;

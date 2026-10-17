import * as z from 'zod';

/** Validates the model in place; the submit handler trims values for the request body. */
export const staffCategorySchema = z.object({
  staffCategoryTypeId: z
    .number()
    .nullable()
    .refine((value) => value !== null, 'Category type is required'),
  code: z.string().trim().min(1, 'Code is required'),
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string(),
  staffJobFamilyMasterIds: z.array(z.number()),
  isActive: z.boolean(),
});

export type StaffCategoryFormModel = z.input<typeof staffCategorySchema>;

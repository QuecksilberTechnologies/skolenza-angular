import * as z from 'zod';

export const staffCategoryCatalogueSchema = z.object({
  id: z.number().nullable(),
  code: z.string().trim().min(1, 'Code is required').max(50, 'Code cannot exceed 50 characters'),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters'),
  displayOrder: z
    .number()
    .int('Display order must be a whole number')
    .min(0, 'Display order cannot be negative')
    .max(32767, 'Display order cannot exceed 32767'),
  isActive: z.boolean(),
});

export type StaffCategoryCatalogueModel = z.input<typeof staffCategoryCatalogueSchema>;

import * as z from 'zod';

/** Validates the model in place; the dialog's `form()` adds the date-order rule. */
export const classTeacherSchema = z.object({
  classSectionId: z
    .number()
    .nullable()
    .refine((value) => value !== null, 'Section is required'),
  effectiveFrom: z
    .date()
    .nullable()
    .refine((value) => value !== null, 'Effective from is required'),
  effectiveTo: z.date().nullable(),
  isPrimary: z.boolean(),
  isActive: z.boolean(),
});

export type ClassTeacherFormModel = z.input<typeof classTeacherSchema>;

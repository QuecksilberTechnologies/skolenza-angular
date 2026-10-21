import * as z from 'zod';

const requiredId = (label: string) =>
  z
    .number()
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

/** Validates the model in place; the dialog's `form()` adds the date-order rule. */
export const teachingAssignmentSchema = z.object({
  courseOfferingId: requiredId('Course offering'),
  classSectionId: requiredId('Section'),
  assignmentType: requiredId('Assignment role'),
  contributionPercent: z
    .number()
    .int('Contribution must be a whole number')
    .min(1, 'Contribution must be between 1 and 100')
    .max(100, 'Contribution must be between 1 and 100')
    .nullable()
    .refine((value) => value !== null, 'Contribution is required'),
  effectiveFrom: z
    .date()
    .nullable()
    .refine((value) => value !== null, 'Effective from is required'),
  effectiveTo: z.date().nullable(),
  isPrimary: z.boolean(),
  isActive: z.boolean(),
});

export type TeachingAssignmentFormModel = z.input<typeof teachingAssignmentSchema>;

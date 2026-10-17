import * as z from 'zod';

/**
 * Fields shared by every academic master type. Type-specific rules (session dates, the course
 * offering's group) depend on the dialog's type, so they live in the `form()` callback.
 * Validates the model in place; the submit handler trims values for the request body.
 */
export const academicMasterSchema = z.object({
  code: z.string().trim().min(1, 'Code is required'),
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string(),
  isActive: z.boolean(),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
  level: z.string(),
  academicSessionId: z.number().nullable(),
  academicProgrammeId: z.number().nullable(),
  academicGroupId: z.number().nullable(),
  capacity: z
    .number()
    .int('Capacity must be a whole number')
    .min(0, 'Capacity cannot be negative')
    .nullable(),
  subjectId: z.number().nullable(),
  curriculumVersion: z.string(),
});

export type AcademicMasterFormModel = z.input<typeof academicMasterSchema>;

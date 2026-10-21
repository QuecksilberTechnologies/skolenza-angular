import * as z from 'zod';

const coverageRow = z.object({
  curriculumTopicId: z.number(),
  name: z.string(),
  completionPercent: z
    .number()
    .min(0, 'Completion must be between 0 and 100')
    .max(100, 'Completion must be between 0 and 100')
    .nullable()
    .refine((value) => value !== null, 'Completion is required'),
});

/** Validates the model in place; the submit handler trims values and formats the date. */
export const lessonDeliverySchema = z.object({
  lessonPlanId: z
    .number()
    .nullable()
    .refine((value) => value !== null, 'Approved lesson plan is required'),
  deliveredDate: z
    .date()
    .nullable()
    .refine((value) => value !== null, 'Delivered date is required'),
  coverageNotes: z.string().trim().min(1, 'Coverage notes are required'),
  coverage: z.array(coverageRow),
  homework: z.string(),
  evidenceReference: z.string(),
  exceptionReason: z.string(),
  replanAction: z.string(),
});

export type LessonDeliveryFormModel = z.input<typeof lessonDeliverySchema>;
export type CoverageRow = z.input<typeof coverageRow>;

import * as z from 'zod';

/** Validates the model in place; the submit handler trims values and formats the date. */
export const lessonPlanSchema = z.object({
  staffTeachingAssignmentId: z
    .number()
    .nullable()
    .refine((value) => value !== null, 'Teaching assignment is required'),
  curriculumTopicIds: z.array(z.number()),
  plannedDate: z
    .date()
    .nullable()
    .refine((value) => value !== null, 'Planned date is required'),
  periodReference: z.string(),
  objectives: z.string().trim().min(1, 'Objectives are required'),
  teachingMethod: z.string(),
  resources: z.string(),
  activities: z.string(),
  assessment: z.string(),
  homework: z.string(),
});

export type LessonPlanFormModel = z.input<typeof lessonPlanSchema>;

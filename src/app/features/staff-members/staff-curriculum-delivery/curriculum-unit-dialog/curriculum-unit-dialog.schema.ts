import * as z from 'zod';

const count = (label: string) =>
  z
    .number()
    .int(`${label} must be a whole number`)
    .min(1, `${label} must be at least 1`)
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

/**
 * One schema for units and topics: they share every field except the parent, which is a course
 * offering for a unit and a unit for a topic. The submit handler trims values.
 */
export const curriculumUnitSchema = z.object({
  /** Required, but checked in the dialog so the message can name the parent. */
  parentId: z.number().nullable(),
  code: z.string().trim().min(1, 'Code is required'),
  name: z.string().trim().min(1, 'Name is required'),
  sequence: count('Sequence'),
  plannedPeriods: count('Planned periods'),
  learningOutcome: z.string(),
});

export type CurriculumUnitFormModel = z.input<typeof curriculumUnitSchema>;

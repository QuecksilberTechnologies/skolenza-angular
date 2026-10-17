import * as z from 'zod';

const requiredId = (label: string) =>
  z
    .number()
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

/** Validates the model in place; the submit handler trims values and formats dates. */
export const curriculumFrameworkSchema = z
  .object({
    academicSessionId: requiredId('Academic session'),
    code: z.string().trim().min(1, 'Code is required'),
    name: z.string().trim().min(1, 'Name is required'),
    authorityName: z.string().trim().min(1, 'Board, university or authority is required'),
    version: z.string().trim().min(1, 'Version is required'),
    effectiveFrom: z
      .date()
      .nullable()
      .refine((value) => value !== null, 'Effective from is required'),
    effectiveTo: z.date().nullable(),
    isActive: z.boolean(),
  })
  .refine(
    (value) =>
      !value.effectiveFrom || !value.effectiveTo || value.effectiveTo >= value.effectiveFrom,
    { path: ['effectiveTo'], message: 'Effective to must be on or after effective from' },
  );

export type CurriculumFrameworkFormModel = z.input<typeof curriculumFrameworkSchema>;

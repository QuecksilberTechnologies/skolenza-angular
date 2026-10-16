import * as z from 'zod';

import { LABEL_PATTERN } from '@shared/utilities/validation-regex';

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this validates the
 * model in place — `institutionLocationId` and `holidayDate` stay `null` for the empty select and date
 * picker, and the submit handler is what serializes them for the request body.
 */
export const holidayFormSchema = z.object({
  institutionLocationId: z
    .number()
    .nullable()
    .refine((value) => value !== null, 'Location is required'),
  holidayName: z
    .string()
    .trim()
    .min(1, 'Holiday name is required')
    .min(3, 'Holiday name must be at least 3 characters')
    .regex(
      LABEL_PATTERN,
      'Holiday name must start with a letter and use only letters, numbers, spaces, hyphens, or underscores.',
    ),
  holidayDate: z
    .date()
    .nullable()
    .refine((value) => value !== null, 'Date is required'),
  isOptional: z.boolean(),
  description: z.string().trim().max(250, 'Description cannot exceed 250 characters.'),
  icon: z.string().nullable(),
});

/** `z.input`, not `z.infer` — the trailing `.refine`s narrow null out of the output type, but the
 *  model has to keep holding null for the empty select and date picker. */
export type HolidayFormModel = z.input<typeof holidayFormSchema>;

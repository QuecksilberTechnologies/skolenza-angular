import * as z from 'zod';

import { EMAIL_PATTERN } from '@shared/utilities/validation-regex';

/**
 * Every rule for the demo form, in one place — the convention from
 * `.claude/docs/forms.md`. Nothing here is a real business rule; the point is to
 * show one zod schema driving all sixteen controls through
 * `validateStandardSchema`.
 */
export const formInputsDemoSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .regex(EMAIL_PATTERN, 'Enter a valid email address (e.g. user@example.com)'),
  phone: z.string().trim().max(20, 'Phone number cannot exceed 20 characters'),
  bio: z.string().trim().max(500, 'Bio cannot exceed 500 characters'),

  headcount: z
    .number()
    .min(1, 'Headcount must be at least 1')
    .max(9999, 'Headcount cannot exceed 9999')
    .nullable()
    .refine((value) => value !== null, 'Headcount is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),

  departmentId: z
    .number()
    .nullable()
    .refine((value) => value !== null, 'Department is required'),
  skillIds: z.array(z.number()).min(1, 'Pick at least one skill'),
  employmentType: z.string().min(1, 'Employment type is required'),
  workMode: z.string().min(1, 'Work mode is required'),
  acceptTerms: z.boolean().refine((value) => value, 'You must accept the terms'),
  isActive: z.boolean(),

  joiningDate: z
    .date()
    .nullable()
    .refine((value) => value !== null, 'Joining date is required'),
  /**
   * Optimus writes the partially-picked `[Date, null]` between the two clicks, so the
   * element type carries the same message as the length rule — the half-open range is the
   * state a user actually sees.
   */
  projectWindow: z
    .array(z.date({ error: 'Pick both a start and an end date' }))
    .length(2, 'Pick both a start and an end date')
    .nullable(),

  resume: z.custom<File | File[] | null>().nullable(),
  reportsTo: z.string().nullable(),
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters'),
  brandColor: z.string().regex(/^#[0-9a-f]{6}$/i, 'Enter a 6-digit hex colour'),
});

/** `z.input`, not `z.infer` — the `.refine`s narrow `null` out of the *output* type. */
export type FormInputsDemoModel = z.input<typeof formInputsDemoSchema>;

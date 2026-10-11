import * as z from 'zod';

import { EMAIL_PATTERN } from '@shared/utilities/validation-regex';

/**
 * `.trim()` normalises for validation only — `validateStandardSchema` reads the issue list and
 * discards the parsed value, so the model keeps whatever the user typed and
 * `#buildLoginRequest()` is still what trims it.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Please enter your email address.')
    .regex(EMAIL_PATTERN, 'Please enter a valid email address. (e.g. user@example.com).'),
  password: z.string().min(1, 'Please enter your password.'),
});

export type LoginModel = z.infer<typeof loginSchema>;

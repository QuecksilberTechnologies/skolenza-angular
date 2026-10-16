import { z } from 'zod';

import { HOSTNAME_PATTERN, EMAIL_PATTERN } from '@shared/utilities/validation-regex';

/**
 * Validation for the institution SMTP configuration form.
 *
 * A factory rather than a constant because the password is the one field whose rule depends on the
 * mode: `/create` has to carry it, while `/update` preserves the stored secret whenever the key is
 * absent, so an edit that leaves it blank is a valid edit.
 */
export const institutionEmailConfigSchema = (mode: 'create' | 'edit') =>
  z.object({
    smtpHost: z
      .string()
      .trim()
      .min(1, 'SMTP host is required')
      .max(150, 'SMTP host must be at most 150 characters')
      .regex(HOSTNAME_PATTERN, 'Enter a host name, e.g. smtp.acme.com'),
    // `.min`/`.max` before `.nullable()` so a blank input keeps showing its placeholder.
    smtpPort: z
      .number()
      .min(1, 'SMTP port must be between 1 and 65535')
      .max(65535, 'SMTP port must be between 1 and 65535')
      .nullable()
      .refine((value) => value !== null, 'SMTP port is required'),
    smtpUsername: z
      .string()
      .trim()
      .min(1, 'SMTP username is required')
      .max(150, 'SMTP username must be at most 150 characters'),
    smtpPassword:
      mode === 'create'
        ? z
            .string()
            // `.trim()` only narrows what `.min(1)` measures — a spaces-only entry is not a
            // password, and the submit handler would drop the key and post none at all.
            .trim()
            .min(1, 'SMTP password is required')
            .max(200, 'SMTP password must be at most 200 characters')
        : // Blank means "keep the stored secret"; the submit handler drops the key entirely.
          z.string().max(200, 'SMTP password must be at most 200 characters'),
    fromEmail: z
      .string()
      .trim()
      .min(1, 'From email is required')
      .max(150, 'From email must be at most 150 characters')
      .regex(EMAIL_PATTERN, 'Enter a valid email address'),
    fromName: z
      .string()
      .trim()
      .min(1, 'From name is required')
      .max(100, 'From name must be at most 100 characters'),
    isActive: z.boolean(),
  });

/**
 * `z.input`, not `z.infer` — the trailing `.refine` on `smtpPort` narrows null out of the *output*
 * type, but the numeric input has to keep holding null for its placeholder to show.
 */
export type InstitutionEmailConfigFormModel = z.input<ReturnType<typeof institutionEmailConfigSchema>>;

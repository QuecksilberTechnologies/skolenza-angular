import * as z from 'zod';

import { LABEL_PATTERN } from '@shared/utilities/validation-regex';

/**
 * `.trim()` normalises for validation only — `validateStandardSchema` reads the issue list and
 * discards the parsed value, so the submit handler is still what trims the request body.
 *
 * Lengths follow the bulk-import contract, which is the same server-side rule:
 * `docs/specs/bulk-upload/ai-assisted-bulk-import-reference.md` gives StaffEmploymentType 255 characters
 * for TypeName, Description and Remark alike.
 */
export const staffEmploymentTypeSchema = z.object({
  typeName: z
    .string()
    .trim()
    .min(1, 'StaffMember type name is required')
    .min(3, 'StaffMember type name must be at least 3 characters')
    .max(255, 'StaffMember type name cannot exceed 255 characters')
    .regex(
      LABEL_PATTERN,
      'StaffMember type name must start with a letter and use only letters, numbers, spaces, hyphens, or underscores.',
    ),
  description: z.string().trim().max(255, 'Description cannot exceed 255 characters'),
  remark: z.string().trim().max(255, 'Remark cannot exceed 255 characters'),
  isActive: z.boolean(),
});

export type StaffEmploymentTypeModel = z.input<typeof staffEmploymentTypeSchema>;

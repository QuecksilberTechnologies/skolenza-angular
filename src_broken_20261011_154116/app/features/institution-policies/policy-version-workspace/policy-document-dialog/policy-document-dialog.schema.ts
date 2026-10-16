import * as z from 'zod';

export const policyDocumentSchema = z.object({
  /** `FormFile` writes `File | File[] | null`; single mode only ever hands back one file. */
  file: z
    .custom<File | File[] | null>()
    .nullable()
    .refine((value) => value !== null, 'A document is required'),
  policyDocumentTypeId: z
    .number()
    .nullable()
    .refine((value) => value !== null, 'Document type is required'),
  documentTitle: z.string().trim().min(1, 'Title is required'),
  languageCode: z.string().trim().min(1, 'Language code is required'),
  isStaffMemberVisible: z.boolean(),
});

/** `z.input`, not `z.infer` — the `.refine`s narrow null out of the *output* type. */
export type PolicyDocumentModel = z.input<typeof policyDocumentSchema>;

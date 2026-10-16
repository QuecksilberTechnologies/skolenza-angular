import * as z from 'zod';

export const cloneVersionSchema = z.object({
  effectiveFrom: z
    .date()
    .nullable()
    .refine((value) => value !== null, 'Effective from is required'),
  changeSummary: z.string().trim().min(1, 'A change summary is required'),
});

/** `z.input`, not `z.infer` — the `.refine` narrows null out of the *output* type. */
export type CloneVersionModel = z.input<typeof cloneVersionSchema>;

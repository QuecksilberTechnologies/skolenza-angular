import * as z from 'zod';

export const moveDeviceSchema = z.object({
  institutionLocationId: z
    .number()
    .nullable()
    .refine((value) => value !== null, 'Location is required'),
});

/** `z.input`, not `z.infer` — the `.refine` narrows null out of the output type. */
export type MoveDeviceModel = z.input<typeof moveDeviceSchema>;

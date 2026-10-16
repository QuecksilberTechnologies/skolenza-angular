import * as z from 'zod';

/** The API's own window: a pending replacement URL lives 5 minutes to 24 hours. */
export const replaceGatewayUrlSchema = z.object({
  replacementLifetimeMinutes: z
    .number()
    .min(5, 'Lifetime must be at least 5 minutes')
    .max(1440, 'Lifetime must be 1440 minutes or less')
    .nullable()
    .refine((value) => value !== null, 'Lifetime is required'),
});

/** `z.input`, not `z.infer` — the `.refine` narrows null out of the output type. */
export type ReplaceGatewayUrlModel = z.input<typeof replaceGatewayUrlSchema>;

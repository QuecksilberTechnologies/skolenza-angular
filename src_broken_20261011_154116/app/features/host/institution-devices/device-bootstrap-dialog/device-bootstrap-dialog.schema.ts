import * as z from 'zod';

/**
 * How long the issued gateway URL stays usable.
 *
 * The floor is high enough that a Host walking to the hardware cannot outrun it, and the ceiling
 * keeps a forgotten credential from living past a working day — this URL is a secret, and its
 * lifetime is the only thing bounding the window in which a leaked one still works.
 */
export const deviceBootstrapSchema = z.object({
  lifetimeMinutes: z
    .number()
    .min(5, 'Lifetime must be at least 5 minutes')
    .max(1440, 'Lifetime cannot exceed 1440 minutes')
    .nullable()
    .refine((value) => value !== null, 'Lifetime is required'),
});

/** `z.input`, not `z.infer` — the `.refine` narrows `null` out of the output type. */
export type DeviceBootstrapModel = z.input<typeof deviceBootstrapSchema>;

import * as z from 'zod';

/**
 * The event id stays `number | null` so the input shows its placeholder while blank;
 * `validateStandardSchema` reads the issue list only, so `onRetry()` narrows it for the request.
 */
export const webhookRetrySchema = z.object({
  eventId: z
    .number({ error: 'Event ID is required' })
    .int('Event ID must be a whole number')
    .min(1, 'Event ID must be at least 1')
    .nullable()
    .refine((value) => value !== null, 'Event ID is required'),
});

export type WebhookRetryModel = z.input<typeof webhookRetrySchema>;

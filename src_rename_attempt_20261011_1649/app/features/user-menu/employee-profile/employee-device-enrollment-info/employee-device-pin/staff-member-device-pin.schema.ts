import * as z from 'zod';

import { DEVICE_PIN_PATTERN } from '@shared/utilities/validation-regex';

/**
 * The PIN is write-only: no read returns it, so the form never seeds one and the field starts
 * empty even when the enrollment already has a PIN set.
 */
export const staffMemberDevicePinSchema = z.object({
  pin: z
    .string()
    .trim()
    .min(1, 'PIN is required')
    .regex(DEVICE_PIN_PATTERN, 'PIN must be digits only'),
});

export type StaffMemberDevicePinModel = z.input<typeof staffMemberDevicePinSchema>;

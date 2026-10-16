import * as z from 'zod';

const PIN_PATTERN = /^\d{4,12}$/;

export const deviceSettingsScreenMenuPinSchema = z.object({
  screenMenuPin: z
    .string()
    .min(1, 'PIN is required')
    .refine((value) => PIN_PATTERN.test(value), 'PIN must be 4-12 digits'),
});

export type DeviceSettingsScreenMenuPinModel = z.input<typeof deviceSettingsScreenMenuPinSchema>;

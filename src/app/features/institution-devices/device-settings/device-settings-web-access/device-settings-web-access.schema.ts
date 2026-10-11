import * as z from 'zod';

export const deviceSettingsWebAccessSchema = z.object({
  localWebServerEnabled: z.boolean(),
  // 4-128 characters when supplied - see the handoff doc; blank leaves the password unchanged.
  newWebServerPassword: z
    .string()
    .refine((value) => value.trim() === '' || value.trim().length >= 4, {
      message: 'New password must be at least 4 characters',
    })
    .refine((value) => value.length <= 128, 'New password cannot exceed 128 characters'),
});

export type DeviceSettingsWebAccessModel = z.input<typeof deviceSettingsWebAccessSchema>;

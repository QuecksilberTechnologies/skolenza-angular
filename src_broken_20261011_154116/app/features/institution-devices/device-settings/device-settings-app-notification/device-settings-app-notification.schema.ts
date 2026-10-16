import * as z from 'zod';

export const deviceSettingsAppNotificationSchema = z
  .object({
    appNotificationEnabled: z.boolean(),
    appToken: z.string(),
    // DDL-backed: submits the option's `value` string, converted to a number at request time.
    notificationType: z.string().min(1, 'Notification type is required'),
  })
  // Handoff doc: "Require an app token when enabled; treat it like a password."
  .refine((value) => !value.appNotificationEnabled || value.appToken.trim() !== '', {
    message: 'App token is required while app notifications are enabled',
    path: ['appToken'],
  });

export type DeviceSettingsAppNotificationModel = z.input<
  typeof deviceSettingsAppNotificationSchema
>;

import * as z from 'zod';

const requiredNumber = (label: string) =>
  z
    .number()
    .min(0, `${label} cannot be negative`)
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

/** DDL-backed selects submit the option's `value` string; the request body converts it to a
 *  number - see the "Convert the selected value to a number" rule in the handoff doc. */
const requiredOption = (label: string) => z.string().min(1, `${label} is required`);

export const deviceSettingsDeviceSetupSchema = z.object({
  language: requiredOption('Language'),
  screenWakeUpMethod: requiredOption('Screen wake-up method'),
  resultDisplayStyle: requiredOption('Result display style'),
  faceRecognitionDistance: requiredOption('Face recognition distance'),
  voiceVolume: requiredNumber('Voice volume'),
  resultDisplaySeconds: requiredNumber('Result display seconds'),
  screenSaverIdleSeconds: requiredNumber('Screen saver idle seconds'),
  sleepModeSeconds: requiredNumber('Sleep mode seconds'),
  faceWakeUpSeconds: requiredNumber('Face wake-up seconds'),
  announcePersonName: z.boolean(),
  detectMultipleFaces: z.boolean(),
  livenessDetectionEnabled: z.boolean(),
  showAvatar: z.boolean(),
});

export type DeviceSettingsDeviceSetupModel = z.input<typeof deviceSettingsDeviceSetupSchema>;

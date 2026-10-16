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

export const deviceSettingsAdvancedSchema = z.object({
  verificationMode: requiredOption('Verification mode'),
  qrCodeMode: requiredOption('QR code mode'),
  fillLightMode: requiredOption('Fill light mode'),
  maximumAdministrators: requiredNumber('Maximum administrators'),
  faceMatchThreshold: requiredNumber('Face match threshold'),
  livenessThreshold: requiredNumber('Liveness threshold'),
  fingerprintMatchThreshold: requiredNumber('Fingerprint match threshold'),
  fingerprintsPerUser: requiredNumber('Fingerprints per user'),
  maskThreshold: requiredNumber('Mask threshold'),
  exposureCompensation: requiredNumber('Exposure compensation'),
  palmVeinMatchThreshold: requiredNumber('Palm vein match threshold'),
  palmDetectionThreshold: requiredNumber('Palm detection threshold'),
  constantFillLightPeriod: z.string(),
  hidePrivacyInformation: z.boolean(),
  maskDetectionEnabled: z.boolean(),
  disableFaceRecognition: z.boolean(),
  onlineDebugEnabled: z.boolean(),
});

export type DeviceSettingsAdvancedModel = z.input<typeof deviceSettingsAdvancedSchema>;

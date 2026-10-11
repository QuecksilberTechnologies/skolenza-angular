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

export const deviceSettingsLockSchema = z.object({
  doorSensorMode: requiredOption('Door sensor mode'),
  antiPassbackMode: requiredOption('Anti-passback mode'),
  wiegandOutput: requiredOption('Wiegand output'),
  wiegandFormat: requiredOption('Wiegand format'),
  cardDisplayFormat: requiredOption('Card display format'),
  doorOpenDelaySeconds: requiredNumber('Door open delay'),
  doorSensorDelaySeconds: requiredNumber('Door sensor delay'),
  doorPassword: requiredNumber('Door password'),
  requiredUsersForDoorOpen: requiredNumber('Required users for door open'),
  accessLimit: requiredNumber('Access limit'),
  failedVerificationLimit: requiredNumber('Failed verification limit'),
  timeZonePunchLimit: requiredNumber('Time zone punch limit'),
  blockStrangerAccess: z.boolean(),
  reverseCardPin: z.boolean(),
  reverseWiegandOutput: z.boolean(),
  externalWiegandSnapshotEnabled: z.boolean(),
  interlockEnabled: z.boolean(),
  alarmProcessingEnabled: z.boolean(),
  suppressAccessDeniedLog: z.boolean(),
  denyOutsideNormallyOpenTimeZone: z.boolean(),
});

export type DeviceSettingsLockModel = z.input<typeof deviceSettingsLockSchema>;

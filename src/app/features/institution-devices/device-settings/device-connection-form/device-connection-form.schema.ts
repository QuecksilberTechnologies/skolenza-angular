import * as z from 'zod';

import {
  IP_ADDRESS_PATTERN,
  MAC_ADDRESS_PATTERN,
  URL_PATTERN,
} from '@shared/utilities/validation-regex';

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this validates the
 * model in place — the numbers stay `number | null` so their placeholders show, and `onSubmit()` is
 * what serializes them for the request body.
 *
 * No `institutionId` / `institutionDeviceId` here, unlike the Host catalogue's
 * `institution-device-configuration-form.schema.ts` — both are fixed from the logged-in Institution and the
 * route's device id, never user input on this screen.
 */
const MAX_PORT = 65535;

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

const optionalUrl = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || URL_PATTERN.test(value), `${label} must be a valid URL`);

/** Blank stays `null` so the input shows its placeholder; a filled value has to clear `minimum`. */
const optionalNumber = (label: string, minimum: number, maximum?: number) => {
  const base = z.number().min(minimum, `${label} cannot be less than ${minimum}`);
  return (
    maximum === undefined ? base : base.max(maximum, `${label} cannot exceed ${maximum}`)
  ).nullable();
};

const requiredId = (label: string) =>
  z
    .number()
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

export const deviceConnectionSchema = z.object({
  ipAddress: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || IP_ADDRESS_PATTERN.test(value),
      'IP address must be a valid IPv4 address',
    ),
  macAddress: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || MAC_ADDRESS_PATTERN.test(value),
      'MAC address must look like 00:1A:2B:3C:4D:5E',
    ),
  devicePort: optionalNumber('Device port', 1, MAX_PORT),
  communicationType: requiredId('Communication type'),

  serverHost: optionalText(200, 'Server host'),
  serverPort: optionalNumber('Server port', 1, MAX_PORT),
  serverPath: optionalText(200, 'Server path'),
  serverUrl: optionalUrl('Server URL'),
  pushMode: optionalText(50, 'Push mode'),
  heartbeatIntervalSeconds: optionalNumber('Heartbeat interval', 0),
  timeZoneId: optionalText(100, 'Time zone'),
  configuration: optionalText(2000, 'Configuration'),

  isEnrollmentEnabled: z.boolean(),
  isAttendancePushEnabled: z.boolean(),
  isAutoSyncEnabled: z.boolean(),
});

/** `z.input`, not `z.infer` — the trailing `.refine`s narrow null out of the output type, but the
 *  model has to keep holding null for the empty selects. */
export type DeviceConnectionFormModel = z.input<typeof deviceConnectionSchema>;

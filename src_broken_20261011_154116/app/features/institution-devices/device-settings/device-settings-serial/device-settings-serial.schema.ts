import * as z from 'zod';

const requiredNumber = (label: string, minimum: number) =>
  z
    .number()
    .min(minimum, `${label} must be at least ${minimum}`)
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

/** DDL-backed selects submit the option's `value` string; the request body converts it to a
 *  number - see the "Convert the selected value to a number" rule in the handoff doc. */
const requiredOption = (label: string) => z.string().min(1, `${label} is required`);

export const deviceSettingsSerialSchema = z.object({
  baudRate: requiredOption('Baud rate'),
  serialFunction: requiredOption('Serial function'),
  deviceAddress: requiredNumber('Device address', 0).refine(
    (value) => value === null || value <= 9999,
    'Device address cannot exceed 9999',
  ),
  networkPort: requiredNumber('Network port', 1),
});

export type DeviceSettingsSerialModel = z.input<typeof deviceSettingsSerialSchema>;

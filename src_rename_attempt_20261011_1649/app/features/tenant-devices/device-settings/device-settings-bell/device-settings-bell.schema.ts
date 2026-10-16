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

export const deviceSettingsBellSchema = z.object({
  bellCount: requiredNumber('Bell count'),
  ringStyle: requiredOption('Ring style'),
  bellOutput: requiredOption('Bell output'),
});

export type DeviceSettingsBellModel = z.input<typeof deviceSettingsBellSchema>;

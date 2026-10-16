import * as z from 'zod';

/** DDL-backed selects submit the option's `value` string; the request body converts it to a
 *  number - see the "Convert the selected value to a number" rule in the handoff doc. */
const requiredOption = (label: string) => z.string().min(1, `${label} is required`);

export const deviceSettingsTimeSchema = z.object({
  timeFormat: requiredOption('Time format'),
  dateFormat: requiredOption('Date format'),
  timeZone: requiredOption('Time zone'),
  daylightSavingEnabled: z.boolean(),
  daylightSavingStart: z.string(),
  daylightSavingEnd: z.string(),
  networkTimeEnabled: z.boolean(),
  rebootTime1: z.string(),
  rebootTime2: z.string(),
  rebootTime3: z.string(),
});

export type DeviceSettingsTimeModel = z.input<typeof deviceSettingsTimeSchema>;

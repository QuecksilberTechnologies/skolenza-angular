import * as z from 'zod';

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this validates the
 * model in place — the ids stay `number | null` so their selects show empty, the installation stamp
 * stays a `Date | null` for the picker, and `onSubmit()` is what serializes them for the request
 * body.
 */
const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

const requiredId = (label: string) =>
  z
    .number()
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

/** The institution id is an opaque token, not a number - see `IInstitution.id`. */
const requiredText = (label: string) =>
  z
    .string()
    .nullable()
    .refine((value) => value !== null && value.trim() !== '', `${label} is required`);

export const institutionDeviceSchema = z.object({
  institutionId: requiredText('Institution'),
  institutionLocationId: requiredId('Location'),
  deviceMasterId: requiredId('Device model'),

  deviceCode: z
    .string()
    .trim()
    .min(1, 'Device code is required')
    .max(50, 'Device code must be at most 50 characters'),
  deviceName: z
    .string()
    .trim()
    .min(1, 'Device name is required')
    .max(150, 'Device name must be at most 150 characters'),

  installedDateTime: z.date().nullable(),
  /**
   * An staffMember id the backend sets. No institution-scoped staffMember lookup exists for a host session, so
   * the form renders no control for it and carries whatever came back through untouched.
   */
  installedBy: z.number().nullable(),
  installationRemark: optionalText(500, 'Installation remark'),

  isAttendanceDevice: z.boolean(),

  description: optionalText(2000, 'Description'),
  remark: optionalText(500, 'Remark'),

  isActive: z.boolean(),
});

/** `z.input`, not `z.infer` — the trailing `.refine`s narrow null out of the output type, but the
 *  model has to keep holding null for the empty selects. */
export type InstitutionDeviceFormModel = z.input<typeof institutionDeviceSchema>;

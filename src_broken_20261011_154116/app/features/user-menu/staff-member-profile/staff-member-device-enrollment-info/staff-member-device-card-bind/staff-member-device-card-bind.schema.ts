import * as z from 'zod';

/**
 * The institution picks a card by its opaque id. There is no raw card number on this form, and never
 * one typed by hand — card stock is host-owned.
 */
export const staffMemberDeviceCardBindSchema = z.object({
  institutionCardId: z
    .string()
    .nullable()
    .refine((value) => value !== null && value !== '', 'Card is required'),
});

/** `z.input`, not `z.infer` — the `.refine` narrows null out of the output type, but the model has
 *  to keep holding null for the empty select. */
export type StaffMemberDeviceCardBindModel = z.input<typeof staffMemberDeviceCardBindSchema>;

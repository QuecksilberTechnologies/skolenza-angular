import * as z from 'zod';

import { CARD_NUMBER_PATTERN } from '@shared/utilities/validation-regex';

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this validates the
 * model in place — the numbers stay `number | null` so their placeholders show, the purchase date
 * stays a `Date | null` for the picker, and `onSubmit()` is what serializes them for the request
 * body.
 */
const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} must be at most ${max} characters`);

/** Blank stays `null` so the input shows its placeholder; a filled value has to clear `minimum`. */
const optionalNumber = (label: string, minimum: number) =>
  z.number().min(minimum, `${label} cannot be less than ${minimum}`).nullable();

/** DDL-backed selects submit the option's `value` string; the request body converts it to a
 *  number - see `requiredOption` in `device-settings-advanced.schema.ts` for the same rule. */
const requiredOption = (label: string) => z.string().min(1, `${label} is required`);

/** The institution id is an opaque token, not a number - see `IInstitution.id`. */
const requiredText = (label: string) =>
  z
    .string()
    .nullable()
    .refine((value) => value !== null && value.trim() !== '', `${label} is required`);

export const institutionCardInventorySchema = z.object({
  institutionId: requiredText('Institution'),

  cardNumber: z
    .string()
    .trim()
    .min(1, 'Card number is required')
    .regex(CARD_NUMBER_PATTERN, 'Card number must contain up to 19 digits'),
  cardReference: optionalText(100, 'Card reference'),

  purchaseCurrencyCode: z
    .string()
    .trim()
    .min(1, 'Currency is required')
    .max(10, 'Currency must be at most 10 characters'),
  unitPurchasePriceExcludingTax: z
    .number()
    .min(0, 'Unit price cannot be negative')
    .nullable()
    .refine((value) => value !== null, 'Unit price is required'),
  purchaseInvoiceNumber: optionalText(100, 'Invoice number'),
  purchaseInvoiceDate: z.date().nullable(),

  supplierName: optionalText(150, 'Supplier name'),
  supplierTaxRegistrationNumber: optionalText(50, 'Supplier tax registration number'),
  supplierCountryId: z.number().nullable(),
  supplierStateId: z.number().nullable(),
  placeOfSupplyCountryId: z.number().nullable(),
  placeOfSupplyStateId: z.number().nullable(),

  taxTreatment: requiredOption('Tax treatment'),
  cgstRate: optionalNumber('CGST rate', 0),
  cgstAmount: optionalNumber('CGST amount', 0),
  sgstRate: optionalNumber('SGST rate', 0),
  sgstAmount: optionalNumber('SGST amount', 0),
  igstRate: optionalNumber('IGST rate', 0),
  igstAmount: optionalNumber('IGST amount', 0),
  foreignTaxLabel: optionalText(50, 'Foreign tax label'),
  foreignTaxRate: optionalNumber('Foreign tax rate', 0),
  foreignTaxAmount: optionalNumber('Foreign tax amount', 0),

  customsDutyAmount: optionalNumber('Customs duty', 0),
  freightAmount: optionalNumber('Freight', 0),

  isActive: z.boolean(),
});

/** `z.input`, not `z.infer` — the trailing `.refine`s narrow null out of the output type, but the
 *  model has to keep holding null for the empty selects. */
export type InstitutionCardInventoryFormModel = z.input<typeof institutionCardInventorySchema>;

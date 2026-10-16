import * as z from 'zod';

import { EMAIL_PATTERN, GSTIN_PATTERN, PIN_CODE_PATTERN } from '@shared/utilities/validation-regex';

/** Launch is India-only; the API rejects any other `countryCode` for now. */
export const BILLING_COUNTRY_CODES = ['IN'] as const;

/** Digits with an optional leading `+`, spaces, hyphens and brackets. */
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{6,29}$/;

/** Letters, digits and hyphens - it is stamped onto every invoice number. */
const INVOICE_PREFIX_PATTERN = /^[A-Za-z0-9-]+$/;

/**
 * The ranges mirror the backend's `[Range]` attributes on `HostBillingConfigurationRequestDTO`.
 * Numbers stay `number | null` so a cleared input shows its placeholder; `onSave()` narrows them.
 */
const boundedNumber = (label: string, minimum: number, maximum: number) =>
  z
    .number()
    .int(`${label} must be a whole number`)
    .min(minimum, `${label} must be between ${minimum} and ${maximum}`)
    .max(maximum, `${label} must be between ${minimum} and ${maximum}`)
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

export const billingConfigurationSchema = z.object({
  sellerLegalName: z
    .string()
    .trim()
    .min(1, 'Legal name is required')
    .max(200, 'Legal name must be 200 characters or fewer'),
  sellerBillingEmail: z
    .string()
    .trim()
    .min(1, 'Billing email is required')
    .max(250, 'Billing email must be 250 characters or fewer')
    .regex(EMAIL_PATTERN, 'Enter a valid email address'),
  sellerBillingPhone: z
    .string()
    .trim()
    .max(30, 'Phone must be 30 characters or fewer')
    .refine((value) => value === '' || PHONE_PATTERN.test(value), 'Enter a valid phone number'),
  countryCode: z.enum(BILLING_COUNTRY_CODES, { message: 'Country is required' }),
  stateCode: z
    .string()
    .trim()
    .min(1, 'State code is required')
    .max(20, 'State code must be 20 characters or fewer'),
  postalCode: z
    .string()
    .trim()
    .min(1, 'PIN code is required')
    .regex(PIN_CODE_PATTERN, 'PIN code must be 6 digits'),
  addressLine1: z
    .string()
    .trim()
    .min(1, 'Address line 1 is required')
    .max(300, 'Address line 1 must be 300 characters or fewer'),
  addressLine2: z.string().trim().max(300, 'Address line 2 must be 300 characters or fewer'),
  taxRegistrationNumber: z
    .string()
    .trim()
    .min(1, 'GSTIN is required')
    .refine(
      (value) => GSTIN_PATTERN.test(value.toUpperCase()),
      'Enter a valid 15-character GSTIN, for example 23ABCDE1234F1Z5',
    ),
  invoicePrefix: z
    .string()
    .trim()
    .min(1, 'Invoice prefix is required')
    .max(20, 'Invoice prefix must be 20 characters or fewer')
    .regex(INVOICE_PREFIX_PATTERN, 'Use only letters, numbers and hyphens'),
  paymentRetryCount: boundedNumber('Retry count', 1, 10),
  gracePeriodDays: boundedNumber('Grace period', 0, 30),
  paymentTimeoutMinutes: boundedNumber('Payment timeout', 5, 1440),
  reconciliationLookbackDays: boundedNumber('Reconciliation lookback', 1, 90),
  isActive: z.boolean(),
});

/** `z.input`, not `z.infer` — the `.refine` on each number narrows null out of the output type. */
export type BillingConfigurationModel = z.input<typeof billingConfigurationSchema>;

import * as z from 'zod';

import { COUNTRY_CODE_PATTERN, CURRENCY_CODE_PATTERN } from '@shared/utilities/validation-regex';

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this validates the
 * model in place — the plan, amount and dates stay `null` for the empty select, number and date
 * pickers, and the submit handler is what serializes them for the request body.
 */
export const planPriceFormSchema = z
  .object({
    subscriptionPlanId: z
      .number()
      .nullable()
      .refine((value) => value !== null, 'Plan is required'),
    countryCode: z.string().trim().regex(COUNTRY_CODE_PATTERN, 'Country code must be 2 letters'),
    currencyCode: z.string().trim().regex(CURRENCY_CODE_PATTERN, 'Currency code must be 3 letters'),
    billingCycle: z.enum(['Monthly', 'Yearly'], { message: 'Billing cycle is required' }),
    baseAmount: z
      .number()
      .min(0, 'Amount cannot be negative')
      // The DTO caps at 9999999999999999, which a JS number cannot hold exactly; below 1e16 can.
      .lt(1e16, 'Amount is too large')
      .nullable()
      .refine((value) => value !== null, 'Amount is required'),
    effectiveFrom: z
      .date()
      .nullable()
      .refine((value) => value !== null, 'Effective from is required'),
    effectiveTo: z.date().nullable(),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.effectiveFrom && value.effectiveTo && value.effectiveTo < value.effectiveFrom) {
      ctx.addIssue({
        code: 'custom',
        message: 'Effective to cannot be before effective from',
        path: ['effectiveTo'],
      });
    }
  });

/** `z.input`, not `z.infer` — the trailing `.refine`s narrow null out of the output type, but the
 *  model has to keep holding null for the empty select, number and date pickers. */
export type PlanPriceFormModel = z.input<typeof planPriceFormSchema>;

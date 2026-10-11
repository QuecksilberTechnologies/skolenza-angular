import * as z from 'zod';

import { LABEL_PATTERN } from '@shared/utilities/validation-regex';

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this validates
 * the model in place — the amounts stay `number | null` so their placeholders show, and
 * `onSubmit()` is still what narrows them for the request body.
 */
const requiredNumber = (label: string, minimum: number, minMessage: string) =>
  z
    .number()
    .min(minimum, minMessage)
    .nullable()
    .refine((value) => value !== null, `${label} is required`);

export const subscriptionPlanSchema = z.object({
  planName: z
    .string()
    .trim()
    .min(1, 'Plan name is required')
    .min(3, 'Plan name must be at least 3 characters')
    .regex(
      LABEL_PATTERN,
      'Plan name must start with a letter and use only letters, numbers, spaces, hyphens, or underscores.',
    ),
  currencyKey: z.string().min(1, 'Currency is required'),
  maxUsers: requiredNumber('Max users', 1, 'Max users must be at least 1'),
  perDayPrice: requiredNumber('Per day price', 0, 'Per day price cannot be negative'),
  monthlyPrice: requiredNumber('Monthly price', 0, 'Monthly price cannot be negative'),
  yearlyPrice: requiredNumber('Yearly price', 0, 'Yearly price cannot be negative'),
  isFree: z.boolean(),
  isMostPopular: z.boolean(),
  isCustom: z.boolean(),
  isActive: z.boolean(),
});

/**
 * `z.input`, not `z.infer` — the trailing `.refine` narrows null out of the *output* type, but the
 * model has to keep holding null for the blank amounts to show their placeholders.
 */
export type SubscriptionPlanModel = z.input<typeof subscriptionPlanSchema>;

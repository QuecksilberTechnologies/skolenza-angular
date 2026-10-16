import * as z from 'zod';

import { COUNTRY_CODE_PATTERN } from '@shared/utilities/validation-regex';

/** Empty means "no component configuration"; anything else has to be JSON the API can store. */
const isJsonOrEmpty = (value: string): boolean => {
  if (value.trim() === '') {
    return true;
  }
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * `validateStandardSchema` reads the issue list and discards the parsed value, so this validates the
 * model in place — the rate and dates stay `null` for the empty number and date pickers, and the
 * submit handler is what serializes them for the request body.
 */
export const taxRuleFormSchema = z
  .object({
    countryCode: z.string().trim().regex(COUNTRY_CODE_PATTERN, 'Country code must be 2 letters'),
    taxCode: z
      .string()
      .trim()
      .min(1, 'Tax code is required')
      .max(30, 'Tax code cannot exceed 30 characters'),
    taxName: z
      .string()
      .trim()
      .min(1, 'Tax name is required')
      .max(100, 'Tax name cannot exceed 100 characters'),
    ratePercent: z
      .number()
      .min(0, 'Rate cannot be negative')
      .max(100, 'Rate cannot exceed 100%')
      .nullable()
      .refine((value) => value !== null, 'Rate is required'),
    effectiveFrom: z
      .date()
      .nullable()
      .refine((value) => value !== null, 'Effective from is required'),
    effectiveTo: z.date().nullable(),
    isActive: z.boolean(),
    configurationJson: z.string().refine(isJsonOrEmpty, 'Configuration must be valid JSON'),
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
 *  model has to keep holding null for the empty number and date pickers. */
export type TaxRuleFormModel = z.input<typeof taxRuleFormSchema>;

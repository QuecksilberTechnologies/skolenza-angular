import { describe, expect, it } from 'vitest';

import { PlanPriceFormModel, planPriceFormSchema } from './plan-price-form.schema';

const valid: PlanPriceFormModel = {
  subscriptionPlanId: 1,
  countryCode: 'IN',
  currencyCode: 'INR',
  billingCycle: 'Monthly',
  baseAmount: 999,
  effectiveFrom: new Date(2026, 9, 1),
  effectiveTo: null,
  isActive: true,
};

const messages = (model: PlanPriceFormModel) => {
  const result = planPriceFormSchema.safeParse(model);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('planPriceFormSchema', () => {
  it('accepts an open-ended price', () => {
    expect(messages(valid)).toEqual([]);
  });

  it('requires the plan, amount and start date', () => {
    expect(
      messages({ ...valid, subscriptionPlanId: null, baseAmount: null, effectiveFrom: null }),
    ).toEqual(['Plan is required', 'Amount is required', 'Effective from is required']);
  });

  it('takes ISO-shaped country and currency codes only', () => {
    expect(messages({ ...valid, countryCode: 'IND', currencyCode: 'RS' })).toEqual([
      'Country code must be 2 letters',
      'Currency code must be 3 letters',
    ]);
  });

  it('rejects a negative amount', () => {
    expect(messages({ ...valid, baseAmount: -1 })).toEqual(['Amount cannot be negative']);
  });

  it('rejects an end date before the start date, on the end date', () => {
    const result = planPriceFormSchema.safeParse({ ...valid, effectiveTo: new Date(2026, 8, 30) });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ['effectiveTo'],
      message: 'Effective to cannot be before effective from',
    });
  });

  it('allows a single-day window', () => {
    expect(messages({ ...valid, effectiveTo: new Date(2026, 9, 1) })).toEqual([]);
  });
});

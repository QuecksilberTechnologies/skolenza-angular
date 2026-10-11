import { SubscriptionPlan, InstitutionSubscriptionPlan } from '@shared/interfaces';

import { toPlanRows, toPricing } from './subscriptions.model';

const NOW = Date.parse('2026-08-16T00:00:00Z');
const FUTURE = '2027-01-01T00:00:00Z';
const PAST = '2026-01-01T00:00:00Z';

function createPlan(overrides: Partial<SubscriptionPlan> = {}): SubscriptionPlan {
  return {
    id: 2,
    planName: 'Pro Team Plan',
    maxUsers: 20,
    perDayPrice: 18,
    isFree: false,
    monthlyPrice: 349,
    yearlyPrice: 3999,
    isMostPopular: true,
    isCustom: false,
    currencyKey: 'INR',
    modules: [],
    ...overrides,
  };
}

function createRow(overrides: Partial<InstitutionSubscriptionPlan> = {}): InstitutionSubscriptionPlan {
  return {
    id: 1,
    institutionId: 54,
    subscriptionPlanId: 2,
    subscriptionStartDate: '2026-03-19T00:00:00Z',
    subscriptionEndDate: FUTURE,
    isActive: true,
    paymentTxnId: null,
    paymentMode: null,
    isTrial: false,
    ...overrides,
  };
}

describe('toPlanRows', () => {
  it('counts subscriptions against their own plan', () => {
    const rows = toPlanRows(
      [createPlan({ id: 2 }), createPlan({ id: 3, monthlyPrice: 100 })],
      [
        createRow({ id: 1, subscriptionPlanId: 2 }),
        createRow({ id: 2, subscriptionPlanId: 2 }),
        createRow({ id: 3, subscriptionPlanId: 3 }),
      ],
      NOW,
    );

    expect(rows.map((row) => [row.id, row.subscribers, row.mrr])).toEqual([
      [2, 2, 698],
      [3, 1, 100],
    ]);
  });

  it('gives a plan with no subscriptions zeroes rather than undefined', () => {
    const [row] = toPlanRows([createPlan()], [], NOW);

    expect(row.subscribers).toBe(0);
    expect(row.mrr).toBe(0);
  });

  it('counts trials — they are current subscriptions', () => {
    const [row] = toPlanRows([createPlan()], [createRow({ isTrial: true })], NOW);

    expect(row.subscribers).toBe(1);
    expect(row.mrr).toBe(349);
  });

  it('excludes lapsed subscriptions from both figures', () => {
    const [row] = toPlanRows(
      [createPlan()],
      [
        createRow({ id: 1 }),
        createRow({ id: 2, subscriptionEndDate: PAST }),
        createRow({ id: 3, isActive: false }),
      ],
      NOW,
    );

    expect(row.subscribers).toBe(1);
    expect(row.mrr).toBe(349);
  });

  it('leaves a free plan at zero revenue however many subscribers it has', () => {
    const [row] = toPlanRows(
      [createPlan({ monthlyPrice: 0, isFree: true })],
      [createRow({ id: 1 }), createRow({ id: 2 })],
      NOW,
    );

    expect(row.subscribers).toBe(2);
    expect(row.mrr).toBe(0);
  });

  it('carries the original plan fields through untouched', () => {
    const [row] = toPlanRows([createPlan()], [], NOW);

    expect(row.planName).toBe('Pro Team Plan');
    expect(row.currencyKey).toBe('INR');
    expect(row.isMostPopular).toBe(true);
  });
  it('resolves the currency code the grid renders, so search matches what is on screen', () => {
    const rows = toPlanRows(
      [
        createPlan({ id: 1, currencyKey: 'INR' }),
        createPlan({ id: 2, currencyKey: '$' }),
        createPlan({ id: 3, currencyKey: 'rupees' }),
      ],
      [],
      NOW,
    );

    expect(rows.map((row) => row.currencyCode)).toEqual(['INR', 'USD', null]);
  });
});

describe('toPricing', () => {
  it('leads with monthly and files the rest behind it', () => {
    expect(toPricing(createPlan())).toEqual({
      primary: { amount: 349, unit: '/mo', srUnit: 'per month' },
      secondary: [
        { amount: 3999, unit: '/yr', srUnit: 'per year' },
        { amount: 18, unit: '/day', srUnit: 'per day' },
      ],
    });
  });

  it('promotes whatever the plan does price on when monthly is unset', () => {
    const pricing = toPricing(createPlan({ monthlyPrice: 0, yearlyPrice: 0 }));

    expect(pricing.primary).toEqual({ amount: 18, unit: '/day', srUnit: 'per day' });
    expect(pricing.secondary).toEqual([]);
  });

  it('leaves a plan with no prices at all with nothing to show', () => {
    expect(toPricing(createPlan({ perDayPrice: 0, monthlyPrice: 0, yearlyPrice: 0 }))).toEqual({
      primary: null,
      secondary: [],
    });
  });
});

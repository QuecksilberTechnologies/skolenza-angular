import { SubscriptionPlan, InstitutionSubscriptionPlan } from '@shared/interfaces';
import { normalizeCurrencyCode } from '@shared/utilities/currency';

/** The API carries no payment state, so "past due" is not derivable — these three are. */
export type PlanSubscriptionStatus = 'Trial' | 'Active' | 'Expired';

/** Expiry is checked before the trial flag so a lapsed trial reads "Expired" rather than "Trial". */
export function resolveStatus(
  row: InstitutionSubscriptionPlan,
  now: number = Date.now(),
): PlanSubscriptionStatus {
  const endsAt = row.subscriptionEndDate ? Date.parse(row.subscriptionEndDate) : NaN;
  const hasExpired = !row.isActive || (!Number.isNaN(endsAt) && endsAt < now);

  if (hasExpired) return 'Expired';
  return row.isTrial ? 'Trial' : 'Active';
}

/** One price the plan charges. `unit` is shown, `srUnit` is what a screen reader says instead. */
export interface PriceLine {
  amount: number;
  unit: string;
  srUnit: string;
}

/** The grid shows one price per plan and tucks the rest underneath it. */
export interface PlanPricing {
  primary: PriceLine | null;
  secondary: PriceLine[];
}

/** Monthly leads because it is the price plans are compared on; the rest fall in behind it. */
export function toPricing(plan: SubscriptionPlan): PlanPricing {
  const [primary = null, ...secondary] = [
    { amount: plan.monthlyPrice, unit: '/mo', srUnit: 'per month' },
    { amount: plan.yearlyPrice, unit: '/yr', srUnit: 'per year' },
    { amount: plan.perDayPrice, unit: '/day', srUnit: 'per day' },
  ].filter((line) => line.amount > 0);

  return { primary, secondary };
}

/** A plan row decorated with the two figures the grid derives from institution subscriptions. */
export interface SubscriptionPlanRow extends SubscriptionPlan {
  subscribers: number;
  mrr: number;
  pricing: PlanPricing;
  /** `null` when `currencyKey` is unrecognised, so the code chip can be left off rather than
   *  printing the raw key next to the symbol it already produced. */
  currencyCode: string | null;
}

/**
 * Trials count toward MRR — every live subscription currently carries `isTrial: true`, so
 * excluding them would empty the column. Lapsed subscriptions are excluded from both figures.
 */
export function toPlanRows(
  plans: SubscriptionPlan[],
  subscriptions: InstitutionSubscriptionPlan[],
  now: number = Date.now(),
): SubscriptionPlanRow[] {
  const currentByPlan = new Map<number, number>();

  for (const row of subscriptions) {
    if (resolveStatus(row, now) === 'Expired') continue;
    currentByPlan.set(row.subscriptionPlanId, (currentByPlan.get(row.subscriptionPlanId) ?? 0) + 1);
  }

  return plans.map((plan) => {
    const subscribers = currentByPlan.get(plan.id) ?? 0;
    return {
      ...plan,
      subscribers,
      mrr: subscribers * plan.monthlyPrice,
      pricing: toPricing(plan),
      currencyCode: normalizeCurrencyCode(plan.currencyKey),
    };
  });
}

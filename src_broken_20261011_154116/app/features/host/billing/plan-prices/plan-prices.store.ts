import { HostPlanPrice } from '@shared/interfaces';

import { BillingCatalogRow, billingCatalogStore } from '../billing-store';

export type PlanPriceRow = BillingCatalogRow<HostPlanPrice>;

export const PlanPricesStore = billingCatalogStore<HostPlanPrice>({
  load: (api) => api.getPlanPrices(),
  deactivate: (api, id) => api.deletePlanPrice(id),
  matches: (row, term) =>
    [row.planName, row.billingCycle, row.countryCode, row.currencyCode].some((value) =>
      value?.toLowerCase().includes(term),
    ),
});

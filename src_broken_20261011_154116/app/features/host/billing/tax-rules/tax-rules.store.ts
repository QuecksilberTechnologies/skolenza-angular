import { HostTaxRule } from '@shared/interfaces';

import { BillingCatalogRow, billingCatalogStore } from '../billing-store';

export type TaxRuleRow = BillingCatalogRow<HostTaxRule>;

export const TaxRulesStore = billingCatalogStore<HostTaxRule>({
  load: (api) => api.getTaxRules(),
  deactivate: (api, id) => api.deleteTaxRule(id),
  matches: (row, term) =>
    [row.taxCode, row.taxName, row.countryCode].some((value) =>
      value?.toLowerCase().includes(term),
    ),
});

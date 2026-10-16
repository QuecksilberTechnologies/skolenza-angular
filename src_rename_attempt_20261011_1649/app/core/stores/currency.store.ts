import { httpResource } from '@angular/common/http';
import { computed } from '@angular/core';
import { signalStore, withComputed, withProps } from '@ngrx/signals';

import { Currency } from '@shared/interfaces';

export const CurrencyStore = signalStore(
  { providedIn: 'root' },
  withProps(() => ({
    /** Static lookup data, not an API envelope — served straight from `public/`. */
    currenciesResource: httpResource<Currency[]>(() => 'data/currencies.json'),
  })),
  withComputed(({ currenciesResource }) => {
    const currencies = computed<Currency[]>(() => currenciesResource.value() ?? []);

    return {
      currencies,
      isLoading: computed(() => currenciesResource.isLoading()),

      options: computed(() =>
        currencies().map((c) => ({ label: `${c.code} - ${c.name} (${c.symbol})`, value: c.code })),
      ),

      symbols: computed<Record<string, string>>(() =>
        Object.fromEntries(currencies().map((c) => [c.code, c.symbol])),
      ),
    };
  }),
);

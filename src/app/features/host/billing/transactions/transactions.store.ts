import { computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';

import { Common, HostBillingApi } from '@core/services';
import { HostPaymentTransaction, SettledSearchTerm } from '@shared/interfaces';

import { settleBillingList, withBillingPaging } from '../billing-store';

interface TransactionsState {
  transactions: HostPaymentTransaction[];
  /** `null` is the "Any" option. */
  status: string | null;
  /** Already debounced and whitespace-normalised by `TableSearchInput`. Matches institution name or
   *  gateway payment ID server-side. */
  search: string;
}

const initialState: TransactionsState = {
  transactions: [],
  status: null,
  search: '',
};

export const TransactionsStore = signalStore(
  withState(initialState),
  withBillingPaging(),
  withProps((store) => {
    const hostBillingApi = inject(HostBillingApi);
    const commonService = inject(Common);

    const transactionsResource = rxResource({
      params: () => ({
        Search: store.search(),
        Status: store.status(),
        PageNumber: store.pageNumber(),
        PageSize: store.pageSize(),
      }),
      stream: ({ params }) =>
        hostBillingApi
          .getTransactions(params)
          .pipe(
            settleBillingList<HostPaymentTransaction>(commonService, (transactions, totalRecords) =>
              patchState(store, { transactions, totalRecords }),
            ),
          ),
    });

    return { transactionsResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.transactionsResource.isLoading()),
  })),
  withMethods((store) => ({
    reloadTransactions(): void {
      store.transactionsResource.reload();
    },

    setStatus(status: string | null): void {
      patchState(store, { status: status ?? null, pageNumber: 1 });
    },

    setSearch(search: SettledSearchTerm): void {
      patchState(store, { search, pageNumber: 1 });
    },
  })),
);

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
import { HostRefund } from '@shared/interfaces';

import { settleBillingList, withBillingPaging } from '../billing-store';

/**
 * No search term: `GET /host/billing/refunds` accepts `Search` but filters on `Status` only, so a
 * search box here would look like it works and match nothing.
 */
interface RefundsState {
  refunds: HostRefund[];
  /** `null` is the "Any" option. */
  status: string | null;
}

const initialState: RefundsState = {
  refunds: [],
  status: null,
};

export const RefundsStore = signalStore(
  withState(initialState),
  withBillingPaging(),
  withProps((store) => {
    const hostBillingApi = inject(HostBillingApi);
    const commonService = inject(Common);

    const refundsResource = rxResource({
      params: () => ({
        Status: store.status(),
        PageNumber: store.pageNumber(),
        PageSize: store.pageSize(),
      }),
      stream: ({ params }) =>
        hostBillingApi
          .getRefunds(params)
          .pipe(
            settleBillingList<HostRefund>(commonService, (refunds, totalRecords) =>
              patchState(store, { refunds, totalRecords }),
            ),
          ),
    });

    return { refundsResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.refundsResource.isLoading()),
  })),
  withMethods((store) => ({
    reloadRefunds(): void {
      store.refundsResource.reload();
    },

    setStatus(status: string | null): void {
      patchState(store, { status: status ?? null, pageNumber: 1 });
    },
  })),
);

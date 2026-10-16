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
import { HostBillingAuditEntry, SettledSearchTerm } from '@shared/interfaces';

import { settleBillingList, withBillingPaging } from '../billing-store';

interface BillingAuditState {
  entries: HostBillingAuditEntry[];
  /** Already debounced and whitespace-normalised by `TableSearchInput`. */
  search: string;
}

const initialState: BillingAuditState = {
  entries: [],
  search: '',
};

export const BillingAuditStore = signalStore(
  withState(initialState),
  withBillingPaging(),
  withProps((store) => {
    const hostBillingApi = inject(HostBillingApi);
    const commonService = inject(Common);

    const entriesResource = rxResource({
      params: () => ({
        Search: store.search(),
        PageNumber: store.pageNumber(),
        PageSize: store.pageSize(),
      }),
      stream: ({ params }) =>
        hostBillingApi
          .getAudit(params)
          .pipe(
            settleBillingList<HostBillingAuditEntry>(commonService, (entries, totalRecords) =>
              patchState(store, { entries, totalRecords }),
            ),
          ),
    });

    return { entriesResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.entriesResource.isLoading()),
    hasActiveFilters: computed(() => !!store.search()),
  })),
  withMethods((store) => ({
    reload(): void {
      store.entriesResource.reload();
    },

    setSearch(search: SettledSearchTerm): void {
      patchState(store, { search, pageNumber: 1 });
    },
  })),
);

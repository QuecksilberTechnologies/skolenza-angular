import { computed, DestroyRef, inject } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  signalStoreFeature,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { TableLazyLoadEvent } from '@openng/optimus-ui/table';
import { catchError, finalize, map, Observable, of, OperatorFunction, tap } from 'rxjs';

import { Common, HostBillingApi } from '@core/services';
import { HostBillingPage, HostBillingRes } from '@shared/interfaces';

/**
 * Settles a billing list read onto the grid: a failed envelope or a thrown error is toasted and
 * clears the rows, so the grid never keeps stale rows and never fails silently (`handleError`
 * rethrows). `onSettled` receives the rows and the total every time, emptied on failure.
 */
export function settleBillingList<T>(
  commonService: Common,
  onSettled: (rows: T[], totalRecords: number) => void,
): OperatorFunction<HostBillingRes<T[] | HostBillingPage<T>>, T[]> {
  return (source) =>
    source.pipe(
      map((res) => {
        if (!res.isSucceeded) {
          commonService.showMessage(res.message, 'error');
          return { rows: [] as T[], totalRecords: 0 };
        }
        const data = res.data;
        if (Array.isArray(data)) return { rows: data, totalRecords: data.length };
        return { rows: data?.items ?? [], totalRecords: data?.totalRecords ?? 0 };
      }),
      catchError((err) => {
        commonService.showMessage(err.message, 'error');
        return of({ rows: [] as T[], totalRecords: 0 });
      }),
      tap(({ rows, totalRecords }) => onSettled(rows, totalRecords)),
      map(({ rows }) => rows),
    );
}

/** Server-side paging for the transactions, refunds and audit grids. */
export function withBillingPaging() {
  return signalStoreFeature(
    withState({ pageNumber: 1, pageSize: 10, totalRecords: 0 }),
    withMethods((store, commonService = inject(Common)) => ({
      loadPage(event: TableLazyLoadEvent): void {
        const { page, rows } = commonService.getPaginationParam(event);
        patchState(store, { pageNumber: page, pageSize: rows });
      },
    })),
  );
}

/** `isDeactivating` drives the per-row spinner; the API never sends it. */
export type BillingCatalogRow<T> = T & { isDeactivating?: boolean };

interface BillingCatalogConfig<T extends { id: number }> {
  load: (api: HostBillingApi) => Observable<HostBillingRes<T[]>>;
  /** `DELETE` deactivates rather than removes, so the row comes back with its new status. */
  deactivate: (api: HostBillingApi, id: number) => Observable<HostBillingRes<boolean>>;
  /** Everything the client-side search looks at, against a trimmed lower-case term. */
  matches: (row: T, term: string) => boolean;
}

/**
 * The unpaged, deactivate-only catalogs — plan prices and tax rules. Their endpoints take no
 * filters or paging, so the search term filters the rows already in hand.
 */
export function billingCatalogStore<T extends { id: number }>(config: BillingCatalogConfig<T>) {
  return signalStore(
    withState({ rows: [] as BillingCatalogRow<T>[], search: '' }),
    withProps((store) => {
      const api = inject(HostBillingApi);
      const commonService = inject(Common);

      const rowsResource = rxResource({
        stream: () =>
          config
            .load(api)
            .pipe(settleBillingList<T>(commonService, (rows) => patchState(store, { rows }))),
      });

      return { rowsResource };
    }),
    withComputed((store) => ({
      isLoading: computed(() => store.rowsResource.isLoading()),
      /** What the grid renders: the whole list, or the part the search term keeps. */
      visibleRows: computed(() => {
        const term = store.search().trim().toLowerCase();
        return term === '' ? store.rows() : store.rows().filter((row) => config.matches(row, term));
      }),
    })),
    withMethods((store) => {
      const api = inject(HostBillingApi);
      const commonService = inject(Common);
      const destroyRef = inject(DestroyRef);

      const setDeactivating = (id: number, isDeactivating: boolean) =>
        patchState(store, {
          rows: store.rows().map((row) => (row.id === id ? { ...row, isDeactivating } : row)),
        });

      return {
        reload(): void {
          store.rowsResource.reload();
        },

        setSearch(search: string): void {
          patchState(store, { search });
        },

        deactivate(row: T): void {
          setDeactivating(row.id, true);

          config
            .deactivate(api, row.id)
            .pipe(
              finalize(() => setDeactivating(row.id, false)),
              takeUntilDestroyed(destroyRef),
            )
            .subscribe({
              next: (res) => {
                if (res.isSucceeded) {
                  store.rowsResource.reload();
                }
                commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
              },
              error: (err) => commonService.showMessage(err.message, 'error'),
            });
        },
      };
    }),
  );
}

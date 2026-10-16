import { computed, DestroyRef, inject } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { catchError, finalize, map, of, tap } from 'rxjs';

import { Common, DefaultEmailConfigApi } from '@core/services';
import { DefaultEmailConfigRow } from '@shared/interfaces';

interface DefaultEmailConfigState {
  configs: DefaultEmailConfigRow[];
  /** `get-all` takes no `Search` param, so the term filters the rows already in hand. */
  search: string;
}

const initialState: DefaultEmailConfigState = {
  configs: [],
  search: '',
};

/** Everything the client-side search looks at. */
const matches = (config: DefaultEmailConfigRow, term: string): boolean =>
  [config.configName, config.smtpHost, config.smtpUsername, config.fromEmail, config.fromName].some(
    (value) => value?.toLowerCase().includes(term),
  );

export const DefaultEmailConfigStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const api = inject(DefaultEmailConfigApi);
    const commonService = inject(Common);

    const configsResource = rxResource({
      stream: () =>
        api.getDefaultEmailConfigs().pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, { configs: res.isSucceeded ? (res.data ?? []) : [] });
          }),
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { configs: [] });
            return of([] as DefaultEmailConfigRow[]);
          }),
        ),
    });

    return { configsResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.configsResource.isLoading()),
    /** What the grid renders: the whole list, or the part the search term keeps. */
    visibleConfigs: computed(() => {
      const term = store.search().trim().toLowerCase();
      return term === '' ? store.configs() : store.configs().filter((c) => matches(c, term));
    }),
  })),
  withMethods((store) => {
    const api = inject(DefaultEmailConfigApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the delete menu item. */
    const setDeleting = (id: number, isDeleting: boolean) =>
      patchState(store, {
        configs: store.configs().map((row) => (row.id === id ? { ...row, isDeleting } : row)),
      });

    return {
      reloadConfigs(): void {
        store.configsResource.reload();
      },

      setSearch(search: string): void {
        patchState(store, { search });
      },

      /** The API rejects a delete on the active configuration, so the grid disables it there. */
      deleteConfig(row: DefaultEmailConfigRow): void {
        setDeleting(row.id, true);

        api
          .deleteDefaultEmailConfig(row.id)
          .pipe(
            finalize(() => setDeleting(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.configsResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);

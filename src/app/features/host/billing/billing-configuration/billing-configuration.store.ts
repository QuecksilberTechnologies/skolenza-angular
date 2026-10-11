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
import { catchError, finalize, map, of } from 'rxjs';

import { ApiError, Common, HostBillingApi } from '@core/services';
import { HostBillingConfiguration, HostBillingConfigurationReq } from '@shared/interfaces';

/** A stale `version` answers 409: someone else saved first, and only a reload can fix it. */
const VERSION_CONFLICT = 409;

interface BillingConfigurationState {
  isSaving: boolean;
}

const initialState: BillingConfigurationState = {
  isSaving: false,
};

export const BillingConfigurationStore = signalStore(
  withState(initialState),
  withProps(() => {
    const hostBillingApi = inject(HostBillingApi);
    const commonService = inject(Common);

    const configurationResource = rxResource({
      stream: () =>
        hostBillingApi.getConfiguration().pipe(
          map((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
              return null;
            }
            return res.data ?? null;
          }),
          // `handleError` rethrows, so without this the page would sit on its skeleton silently.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            return of(null as HostBillingConfiguration | null);
          }),
        ),
    });

    return { configurationResource };
  }),
  withComputed((store) => ({
    configuration: computed(() => store.configurationResource.value() ?? null),
    isLoading: computed(() => store.configurationResource.isLoading()),
  })),
  withMethods((store) => {
    const hostBillingApi = inject(HostBillingApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      reload(): void {
        store.configurationResource.reload();
      },

      /** Sends the loaded record's `version`; the saved record replaces it in place. */
      save(body: Omit<HostBillingConfigurationReq, 'version'>): void {
        const current = store.configuration();
        if (!current || store.isSaving()) return;

        patchState(store, { isSaving: true });

        hostBillingApi
          .updateConfiguration({ ...body, version: current.version })
          .pipe(
            finalize(() => patchState(store, { isSaving: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
              if (!res.isSucceeded || !res.data) return;

              store.configurationResource.set(res.data);
            },
            error: (err: ApiError) => {
              if (err.status === VERSION_CONFLICT) {
                commonService.showMessage(
                  'Someone else changed the billing configuration. The latest version has been loaded. Review it and save again.',
                  'warn',
                );
                store.configurationResource.reload();
                return;
              }
              commonService.showMessage(err.message, 'error');
            },
          });
      },
    };
  }),
);

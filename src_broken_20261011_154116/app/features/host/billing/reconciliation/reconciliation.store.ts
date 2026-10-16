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

import { Common, HostBillingApi } from '@core/services';
import { HostReconciliationSummary } from '@shared/interfaces';

interface ReconciliationState {
  isRetrying: boolean;
}

const initialState: ReconciliationState = {
  isRetrying: false,
};

export const ReconciliationStore = signalStore(
  withState(initialState),
  withProps(() => {
    const hostBillingApi = inject(HostBillingApi);
    const commonService = inject(Common);

    const summaryResource = rxResource({
      stream: () =>
        hostBillingApi.getReconciliation().pipe(
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
          }),
          map((res) => (res.isSucceeded ? (res.data ?? null) : null)),
          // `handleError` rethrows, so without this the tiles would sit on a resource error.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            return of(null as HostReconciliationSummary | null);
          }),
        ),
    });

    return { summaryResource };
  }),
  withComputed((store) => ({
    summary: computed(() => store.summaryResource.value() ?? null),
    isLoading: computed(() => store.summaryResource.isLoading()),
  })),
  withMethods((store) => {
    const hostBillingApi = inject(HostBillingApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      reload(): void {
        store.summaryResource.reload();
      },

      /**
       * Requeues a failed webhook event. The counts move once it does, so the summary is refetched.
       * Resolves `true` on success so the caller can reset its form.
       */
      retryWebhook(id: number): Promise<boolean> {
        patchState(store, { isRetrying: true });

        return new Promise((resolve) => {
          hostBillingApi
            .retryWebhook(id)
            .pipe(
              finalize(() => patchState(store, { isRetrying: false })),
              takeUntilDestroyed(destroyRef),
            )
            .subscribe({
              next: (res) => {
                if (res.isSucceeded) store.summaryResource.reload();
                commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
                resolve(res.isSucceeded);
              },
              error: (err) => {
                commonService.showMessage(err.message, 'error');
                resolve(false);
              },
            });
        });
      },
    };
  }),
);

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
import { map, tap } from 'rxjs';

import { AssetStatusApi, Common } from '@core/services';
import { AssetStatus, DeleteAssetStatusRequest, GetAssetStatusRequest } from '@shared/interfaces';

interface AssetStatusState {
  assetStatuses: AssetStatus[];
  totalRecords: number;
}

const initialState: AssetStatusState = {
  assetStatuses: [],
  totalRecords: 0,
};

export const AssetStatusStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const assetStatusApi = inject(AssetStatusApi);
    const commonService = inject(Common);

    const statusResource = rxResource({
      params: () => ({}),
      stream: () => {
        const body: GetAssetStatusRequest = { IsActive: true };

        return assetStatusApi.fetchAssetsStatus(body).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              assetStatuses: res.isSucceeded ? res.data : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? res.data.length) : 0,
            });
          }),
          map((res) => res.data),
        );
      },
    });

    return { statusResource };
  }),
  withComputed(({ statusResource }) => ({
    isLoading: computed(() => statusResource.isLoading()),
  })),
  withMethods((store) => {
    const assetStatusApi = inject(AssetStatusApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      reloadStatuses(): void {
        store.statusResource.reload();
      },

      deleteStatus(assetStatus: AssetStatus): void {
        const body: DeleteAssetStatusRequest = { Id: assetStatus.id };

        assetStatusApi
          .deleteAssetStatus(body)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
              if (res.isSucceeded) {
                patchState(store, {
                  assetStatuses: store.assetStatuses().filter((s) => s.id !== assetStatus.id),
                });
              }
            },
            error: (err) => {
              commonService.showMessage(err.message, 'error');
            },
          });
      },
    };
  }),
);

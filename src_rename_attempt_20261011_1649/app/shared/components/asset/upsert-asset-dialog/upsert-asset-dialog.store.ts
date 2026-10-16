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
import { EMPTY, finalize, map, tap } from 'rxjs';

import { AssetCategoriesApi } from '@core/services/asset-categories-api';
import { AssetStatusApi } from '@core/services/asset-status-api';
import { AssetTypesApi } from '@core/services/asset-types-api';
import { AssetsApi } from '@core/services/assets-api';
import { Common } from '@core/services/common';
import {
  Asset,
  AssetRes,
  AssetStatus,
  AssetType,
  GetAssetCategoryReq,
  GetAssetStatusRequest,
  GetAssetTypesRequest,
  IAssetCategory,
} from '@shared/interfaces';

interface UpsertAssetDialogState {
  assetCategories: IAssetCategory[];
  assetTypes: AssetType[];
  assetStatuses: AssetStatus[];
  categoryIdForTypes: number | null;
  isSaving: boolean;
}

const initialState: UpsertAssetDialogState = {
  assetCategories: [],
  assetTypes: [],
  assetStatuses: [],
  categoryIdForTypes: null,
  isSaving: false,
};

export const UpsertAssetDialogStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const assetCategoriesApi = inject(AssetCategoriesApi);
    const assetStatusApi = inject(AssetStatusApi);
    const assetTypesApi = inject(AssetTypesApi);
    const commonService = inject(Common);

    const categoriesResource = rxResource({
      stream: () => {
        const body: GetAssetCategoryReq = { IsActive: true };
        return assetCategoriesApi.getAllAssetCategory(body).pipe(
          tap((res) => {
            patchState(store, {
              assetCategories: res.isSucceeded ? res.data : [],
            });
          }),
          map((res) => res.data),
        );
      },
    });

    const statusResource = rxResource({
      stream: () => {
        const body: GetAssetStatusRequest = { IsActive: true };
        return assetStatusApi.fetchAssetsStatus(body).pipe(
          tap((res) => {
            patchState(store, {
              assetStatuses: res.isSucceeded ? res.data : [],
            });
          }),
          map((res) => res.data),
        );
      },
    });

    const typesResource = rxResource({
      params: () => ({ categoryId: store.categoryIdForTypes() }),
      stream: ({ params }) => {
        if (!params.categoryId) {
          patchState(store, { assetTypes: [] });
          return EMPTY;
        }
        const body: GetAssetTypesRequest = {
          CategoryId: params.categoryId,
          IsActive: true,
        };
        return assetTypesApi.fetchAssetsTypes(body).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              assetTypes: res.isSucceeded ? res.data : [],
            });
          }),
          map((res) => res.data),
        );
      },
    });

    return { categoriesResource, statusResource, typesResource };
  }),
  withComputed(({ categoriesResource, statusResource, typesResource }) => ({
    isLoadingCategories: computed(() => categoriesResource.isLoading()),
    isLoadingStatus: computed(() => statusResource.isLoading()),
    isLoadingTypes: computed(() => typesResource.isLoading()),
  })),
  withMethods((store) => {
    const assetsApi = inject(AssetsApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      setCategoryIdForTypes(categoryId: number | null): void {
        patchState(store, { categoryIdForTypes: categoryId });
      },

      saveAsset(
        fd: FormData,
        existingAsset: Asset | undefined,
        onSuccess: (data: Asset[]) => void,
      ): void {
        const saveRequest$ = existingAsset?.assetId
          ? assetsApi.updateAsset(fd)
          : assetsApi.createAsset(fd);

        patchState(store, { isSaving: true });
        saveRequest$
          .pipe(
            finalize(() => patchState(store, { isSaving: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res: AssetRes) => {
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
              if (res.isSucceeded) {
                onSuccess(res.data);
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

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

import { AssetCategoriesApi, AssetTypesApi, Common } from '@core/services';
import {
  AssetType,
  DeleteAssetTypeRequest,
  GetAssetCategoryReq,
  GetAssetTypesRequest,
  IAssetCategory,
  IAssetFilter,
} from '@shared/interfaces';

interface AssetTypesState {
  assetTypes: AssetType[];
  assetCategories: IAssetCategory[];
  totalRecords: number;
  appliedFilters: IAssetFilter | null;
}

const initialState: AssetTypesState = {
  assetTypes: [],
  assetCategories: [],
  totalRecords: 0,
  appliedFilters: null,
};

export const AssetTypesStore = signalStore(
  withState(initialState),
  withComputed(({ appliedFilters }) => ({
    appliedFilterCount: computed(() => {
      const filters = appliedFilters();
      return filters ? Object.values(filters).filter(Boolean).length : 0;
    }),
  })),
  withProps((store) => {
    const assetTypesApi = inject(AssetTypesApi);
    const assetCategoriesApi = inject(AssetCategoriesApi);
    const commonService = inject(Common);

    const typesResource = rxResource({
      params: () => ({
        filters: store.appliedFilters(),
      }),
      stream: ({ params }) => {
        const body: GetAssetTypesRequest = { IsActive: true };

        if (params.filters?.category) {
          body.CategoryId = params.filters.category;
        }

        return assetTypesApi.fetchAssetsTypes(body).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              assetTypes: res.isSucceeded ? res.data : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? res.data.length) : 0,
            });
          }),
          map((res) => res.data),
        );
      },
    });

    const categoriesResource = rxResource({
      params: () => ({}),
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

    return { typesResource, categoriesResource };
  }),
  withComputed(({ typesResource, categoriesResource }) => ({
    isLoadingTypes: computed(() => typesResource.isLoading()),
    isLoadingCategories: computed(() => categoriesResource.isLoading()),
  })),
  withMethods((store) => {
    const assetTypesApi = inject(AssetTypesApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      reloadTypes(): void {
        store.typesResource.reload();
      },

      updateAppliedFilters(filters: IAssetFilter | null): void {
        patchState(store, { appliedFilters: filters });
      },

      deleteType(assetType: AssetType): void {
        const body: DeleteAssetTypeRequest = { Id: assetType.id };

        assetTypesApi
          .deleteAssetType(body)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
              if (res.isSucceeded) {
                patchState(store, {
                  assetTypes: store.assetTypes().filter((t) => t.id !== assetType.id),
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

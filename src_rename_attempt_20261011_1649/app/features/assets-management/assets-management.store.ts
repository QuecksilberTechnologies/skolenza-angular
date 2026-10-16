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
import { TableLazyLoadEvent } from '@openng/optimus-ui/table';
import { catchError, EMPTY, map, of, tap } from 'rxjs';

import {
  AssetCategoriesApi,
  AssetsApi,
  AssetStatusApi,
  AssetTypesApi,
  Common,
  DashboardApi,
} from '@core/services';
import {
  Asset,
  AssetDeleteReq,
  AssetStatistic,
  AssetStatisticRequest,
  AssetStatus,
  AssetType,
  GetAssetCategoryReq,
  GetAssetsReq,
  GetAssetStatusRequest,
  GetAssetTypesRequest,
  IAssetCategory,
  IAssetFilter,
} from '@shared/interfaces';

interface AssetsManagementState {
  assets: Asset[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  sortBy: string | string[] | null | undefined;
  sortOrder: string | null;
  appliedFilters: IAssetFilter | null;
  selectedAsset: Asset | undefined;
  assetStatistics: AssetStatistic | null;
  assetCategories: IAssetCategory[];
  assetTypes: AssetType[];
  assetStatuses: AssetStatus[];
  categoryIdForTypes: number | null;
}

const initialState: AssetsManagementState = {
  assets: [],
  totalRecords: 0,
  pageNumber: 1,
  pageSize: 10,
  sortBy: undefined,
  sortOrder: 'desc',
  appliedFilters: null,
  selectedAsset: undefined,
  assetStatistics: null,
  assetCategories: [],
  assetTypes: [],
  assetStatuses: [],
  categoryIdForTypes: null,
};

export const AssetsManagementStore = signalStore(
  withState(initialState),
  withComputed(({ appliedFilters }) => ({
    appliedFilterCount: computed(() => {
      const filters = appliedFilters();
      return filters ? Object.values(filters).filter(Boolean).length : 0;
    }),
  })),
  withProps((store) => {
    const assetsApi = inject(AssetsApi);
    const assetCategoriesApi = inject(AssetCategoriesApi);
    const assetTypesApi = inject(AssetTypesApi);
    const assetStatusApi = inject(AssetStatusApi);
    const commonService = inject(Common);

    const assetsResource = rxResource({
      params: () => ({
        pageNumber: store.pageNumber(),
        pageSize: store.pageSize(),
        sortBy: store.sortBy(),
        sortOrder: store.sortOrder(),
        filters: store.appliedFilters(),
      }),
      stream: ({ params }) => {
        const req: GetAssetsReq = {
          IsActive: true,
          PageNumber: params.pageNumber,
          PageSize: params.pageSize,
          SortBy: params.sortBy,
          SortOrder: params.sortOrder,
        };

        if (params.filters?.assetTypeId) {
          req.AssetTypeId = params.filters.assetTypeId;
        }
        if (params.filters?.assetStatusId) {
          req.AssetStatusId = params.filters.assetStatusId;
        }
        if (params.filters?.category) {
          req.CategoryId = params.filters.category;
        }

        return assetsApi.getAssets(req).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              assets: res.isSucceeded ? res.data : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? res.data.length) : 0,
            });
          }),
          map((res) => res.data),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { assets: [], totalRecords: 0 });
            return of([] as Asset[]);
          }),
        );
      },
    });

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
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { assetCategories: [] });
            return of([] as IAssetCategory[]);
          }),
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
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { assetStatuses: [] });
            return of([] as AssetStatus[]);
          }),
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
            patchState(store, {
              assetTypes: res.isSucceeded ? res.data : [],
            });
          }),
          map((res) => res.data),
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { assetTypes: [] });
            return of([] as AssetType[]);
          }),
        );
      },
    });

    return { assetsResource, categoriesResource, statusResource, typesResource };
  }),
  withComputed(({ assetsResource, categoriesResource, statusResource, typesResource }) => ({
    isLoadingAssets: computed(() => assetsResource.isLoading()),
    isLoadingCategories: computed(() => categoriesResource.isLoading()),
    isLoadingStatus: computed(() => statusResource.isLoading()),
    isLoadingTypes: computed(() => typesResource.isLoading()),
  })),
  withMethods((store) => {
    const assetsApi = inject(AssetsApi);
    const dashboardApi = inject(DashboardApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      async loadAssetStatistics(): Promise<void> {
        const loginInfo = await commonService.getLoginInfo();
        const info = loginInfo?.user;
        if (!info) return;
        const param: AssetStatisticRequest = {
          RoleId: +(info?.primaryRole?.roleId ?? 0),
          UserStaffMemberId: info.staffMemberId,
        };

        dashboardApi
          .getAssetStatistics(param)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              patchState(store, { assetStatistics: res });
            },
            error: (err) => {
              commonService.showMessage(err.message, 'error');
            },
          });
      },

      loadAssets(
        event: TableLazyLoadEvent,
        isPageChange = true,
        filters?: IAssetFilter | null,
      ): void {
        const { page, rows, sortField, sortOrder } = commonService.getPaginationParam(event);
        const pageNumber = isPageChange ? page : store.pageNumber();

        patchState(store, {
          pageNumber,
          pageSize: rows,
          sortBy: sortField,
          sortOrder,
          ...(filters !== undefined ? { appliedFilters: filters ?? null } : {}),
        });
      },

      reloadAssets(): void {
        store.assetsResource.reload();
      },

      setSelectedAsset(asset: Asset | undefined): void {
        patchState(store, { selectedAsset: asset });
      },

      setCategoryIdForTypes(categoryId: number | null): void {
        patchState(store, { categoryIdForTypes: categoryId });
      },

      updateAppliedFilters(filters: IAssetFilter | null): void {
        patchState(store, { appliedFilters: filters });
      },

      deleteAsset(asset: Asset): void {
        const body: AssetDeleteReq = { Id: asset.assetId };

        assetsApi
          .deleteAsset(body)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
              if (res.isSucceeded) {
                patchState(store, {
                  assets: store.assets().filter((a) => a.assetId !== asset.assetId),
                });
                store.assetsResource.reload();
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

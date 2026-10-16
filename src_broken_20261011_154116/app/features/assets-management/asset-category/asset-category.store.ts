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
import { map, tap } from 'rxjs';

import { AssetCategoriesApi, Common } from '@core/services';
import { DeleteAssetCategoryReq, GetAssetCategoryReq, IAssetCategory } from '@shared/interfaces';

interface AssetCategoryState {
  assetCategories: IAssetCategory[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  sortBy: string | string[] | null | undefined;
  sortOrder: string | null;
}

const initialState: AssetCategoryState = {
  assetCategories: [],
  totalRecords: 0,
  pageNumber: 1,
  pageSize: 10,
  sortBy: undefined,
  sortOrder: 'desc',
};

export const AssetCategoryStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const assetCategoriesApi = inject(AssetCategoriesApi);
    const commonService = inject(Common);

    const categoriesResource = rxResource({
      params: () => ({
        pageNumber: store.pageNumber(),
        pageSize: store.pageSize(),
        sortBy: store.sortBy(),
        sortOrder: store.sortOrder(),
      }),
      // `/Asset/Category/get` takes the same PascalCase paging params as the other list
      // endpoints; without them every page click refetched page 1.
      stream: ({ params }) => {
        const body: GetAssetCategoryReq = {
          IsActive: true,
          PageNumber: params.pageNumber,
          PageSize: params.pageSize ?? 10,
          SortBy: (params.sortBy as string) ?? '',
          SortOrder: params.sortOrder ?? 'desc',
        };

        return assetCategoriesApi.getAllAssetCategory(body).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              assetCategories: res.isSucceeded ? res.data : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? res.data.length) : 0,
            });
          }),
          map((res) => res.data),
        );
      },
    });

    return { categoriesResource };
  }),
  withComputed(({ categoriesResource }) => ({
    isLoading: computed(() => categoriesResource.isLoading()),
  })),
  withMethods((store) => {
    const assetCategoriesApi = inject(AssetCategoriesApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      loadCategories(event: TableLazyLoadEvent, isPageChange = true): void {
        const { page, rows, sortField, sortOrder } = commonService.getPaginationParam(event);
        const pageNumber = isPageChange ? page : store.pageNumber();

        patchState(store, {
          pageNumber,
          pageSize: rows,
          sortBy: sortField,
          sortOrder,
        });
      },

      reloadCategories(): void {
        store.categoriesResource.reload();
      },

      deleteCategory(assetCategory: IAssetCategory): void {
        const body: DeleteAssetCategoryReq = {
          id: assetCategory.id,
        };

        assetCategoriesApi
          .deleteAssetCategory(body)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
              if (res.isSucceeded) {
                patchState(store, {
                  assetCategories: store.assetCategories().filter((c) => c.id !== assetCategory.id),
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

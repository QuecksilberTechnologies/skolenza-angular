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
import { catchError, finalize, map, of, tap } from 'rxjs';

import { Common, DeviceMasterApi } from '@core/services';
import { DeviceMasterRow, DeviceType, SettledSearchTerm } from '@shared/interfaces';

interface DeviceMastersState {
  deviceMasters: DeviceMasterRow[];
  /** Server-side. `null` is the "All" option — the endpoint takes it as a nullable filter. */
  deviceType: DeviceType | null;
  isActive: boolean | null;
  /** Already debounced and whitespace-normalised by `TableSearchInput`. */
  search: string;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
}

const initialState: DeviceMastersState = {
  deviceMasters: [],
  deviceType: null,
  isActive: null,
  search: '',
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
};

export const DeviceMastersStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const deviceMasterApi = inject(DeviceMasterApi);
    const commonService = inject(Common);

    const deviceMastersResource = rxResource({
      params: () => ({
        Search: store.search(),
        DeviceType: store.deviceType(),
        IsActive: store.isActive(),
        PageNumber: store.pageNumber(),
        PageSize: store.pageSize(),
      }),
      stream: ({ params }) =>
        deviceMasterApi.getDeviceMasters(params).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              deviceMasters: res.isSucceeded ? (res.data ?? []) : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? 0) : 0,
            });
          }),
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { deviceMasters: [], totalRecords: 0 });
            return of([] as DeviceMasterRow[]);
          }),
        ),
    });

    return { deviceMastersResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.deviceMastersResource.isLoading()),
  })),
  withMethods((store) => {
    const deviceMasterApi = inject(DeviceMasterApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        deviceMasters: store
          .deviceMasters()
          .map((row) => (row.id === id ? { ...row, isUpdatingStatus } : row)),
      });

    const setDeleting = (id: number, isDeleting: boolean) =>
      patchState(store, {
        deviceMasters: store
          .deviceMasters()
          .map((row) => (row.id === id ? { ...row, isDeleting } : row)),
      });

    return {
      reloadDeviceMasters(): void {
        store.deviceMastersResource.reload();
      },

      /** `null` is the "All" option. A different filter invalidates the page the grid is on. */
      setDeviceType(deviceType: DeviceType | null): void {
        patchState(store, { deviceType: deviceType ?? null, pageNumber: 1 });
      },

      setIsActive(isActive: boolean | null): void {
        patchState(store, { isActive: isActive ?? null, pageNumber: 1 });
      },

      setSearch(search: SettledSearchTerm): void {
        patchState(store, { search, pageNumber: 1 });
      },

      loadPage(event: TableLazyLoadEvent): void {
        const { page, rows } = commonService.getPaginationParam(event);
        patchState(store, { pageNumber: page, pageSize: rows });
      },

      /**
       * The page is refetched because a row that stops matching the status filter changes both the
       * page contents and the total.
       */
      toggleActive(row: DeviceMasterRow): void {
        const isActive = !row.isActive;
        setUpdatingStatus(row.id, true);

        deviceMasterApi
          .setDeviceMasterStatus({ id: row.id, isActive })
          .pipe(
            finalize(() => setUpdatingStatus(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.deviceMastersResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      /** The row leaves the list, so both the page and the total come back from the server. */
      deleteDeviceMaster(row: DeviceMasterRow): void {
        setDeleting(row.id, true);

        deviceMasterApi
          .deleteDeviceMaster(row.id)
          .pipe(
            finalize(() => setDeleting(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.deviceMastersResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);

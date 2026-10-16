import { computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { TableLazyLoadEvent } from '@openng/optimus-ui/table';
import { catchError, map, of, tap } from 'rxjs';

import { Common, InstitutionDeviceApi } from '@core/services';
import { SettledSearchTerm, InstitutionDeviceRow } from '@shared/interfaces';

interface InstitutionDevicesState {
  institutionDevices: InstitutionDeviceRow[];
  /** The API requires this even though Swagger marks it as optional. */
  institutionId: string | null;
  /** Already debounced and whitespace-normalised by `TableSearchInput`. */
  search: string;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
}

const initialState: InstitutionDevicesState = {
  institutionDevices: [],
  institutionId: null,
  search: '',
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
};

export const InstitutionDevicesStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const institutionDeviceApi = inject(InstitutionDeviceApi);
    const commonService = inject(Common);

    const institutionDevicesResource = rxResource({
      // The endpoint rejects an omitted InstitutionId, despite Swagger documenting it as optional.
      // Returning undefined keeps the resource idle until the session context is available.
      params: () => {
        const institutionId = store.institutionId();
        if (!institutionId) {
          return undefined;
        }

        return {
          Search: store.search(),
          InstitutionId: institutionId,
          PageNumber: store.pageNumber(),
          PageSize: store.pageSize(),
        };
      },
      // `ModuleId` / `OperationId` are `moduleOperationInterceptor`'s job: it reads them off this
      // session's own `GET /Navigation/my-menu` tree, which publishes this page as
      // `INSTITUTION_DEVICE_SETUP`. Resolving them here would pin the page to one id space and go stale
      // the moment the backend renumbers the module.
      stream: ({ params }) =>
        institutionDeviceApi.getInstitutionDevices(params).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              institutionDevices: res.isSucceeded ? (res.data ?? []) : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? 0) : 0,
            });
          }),
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { institutionDevices: [], totalRecords: 0 });
            return of([] as InstitutionDeviceRow[]);
          }),
        ),
    });

    return { institutionDevicesResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.institutionDevicesResource.isLoading()),
  })),
  withMethods((store) => {
    const commonService = inject(Common);

    return {
      setInstitutionId(institutionId: string | null): void {
        patchState(store, { institutionId, pageNumber: 1 });
      },

      setSearch(search: SettledSearchTerm): void {
        patchState(store, { search, pageNumber: 1 });
      },

      reloadInstitutionDevices(): void {
        store.institutionDevicesResource.reload();
      },

      loadPage(event: TableLazyLoadEvent): void {
        const { page, rows } = commonService.getPaginationParam(event);
        patchState(store, { pageNumber: page, pageSize: rows });
      },
    };
  }),
);

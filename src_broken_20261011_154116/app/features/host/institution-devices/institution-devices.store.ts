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

import {
  Common,
  DeviceMasterApi,
  InstitutionDeviceApi,
  InstitutionLocationApi,
  InstitutionsApi,
} from '@core/services';
import {
  DeviceMasterRow,
  IInstitution,
  SettledSearchTerm,
  InstitutionDeviceRow,
  InstitutionLocationRow,
} from '@shared/interfaces';

interface InstitutionDevicesState {
  institutionDevices: InstitutionDeviceRow[];
  /** Server-side filters. `null` is the "Any" option — the endpoint takes them as nullable. */
  institutionId: string | null;
  institutionLocationId: number | null;
  deviceMasterId: number | null;
  isAttendanceDevice: boolean | null;
  isActive: boolean | null;
  /** Already debounced and whitespace-normalised by `TableSearchInput`. */
  search: string;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
}

const initialState: InstitutionDevicesState = {
  institutionDevices: [],
  institutionId: null,
  institutionLocationId: null,
  deviceMasterId: null,
  isAttendanceDevice: null,
  isActive: null,
  search: '',
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
};

/** One page big enough to hold every lookup row — these feed dropdowns, not a grid. */
const LOOKUP_PAGE_SIZE = 500;

export const InstitutionDevicesStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const institutionDeviceApi = inject(InstitutionDeviceApi);
    const institutionsApi = inject(InstitutionsApi);
    const institutionLocationApi = inject(InstitutionLocationApi);
    const deviceMasterApi = inject(DeviceMasterApi);
    const commonService = inject(Common);

    // `makeHttpParams` drops `null`, so an unpicked institution simply omits the param and `get-all`
    // answers with every institution's rows — the same way the filters below widen the list.
    const institutionDevicesResource = rxResource({
      params: () => ({
        Search: store.search(),
        InstitutionId: store.institutionId(),
        InstitutionLocationId: store.institutionLocationId(),
        DeviceMasterId: store.deviceMasterId(),
        IsAttendanceDevice: store.isAttendanceDevice(),
        IsActive: store.isActive(),
        PageNumber: store.pageNumber(),
        PageSize: store.pageSize(),
      }),
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
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { institutionDevices: [], totalRecords: 0 });
            return of([] as InstitutionDeviceRow[]);
          }),
        ),
    });

    /** The three lookups only decorate filters, so a failure degrades to an empty dropdown. */
    const institutionsResource = rxResource({
      stream: () =>
        institutionsApi.getInstitutions({ IsActive: true }).pipe(
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          catchError(() => of([] as IInstitution[])),
        ),
    });

    /**
     * Unlike the grid, this lookup is institution-scoped and stays idle until a institution is picked.
     *
     * `ModuleId` / `OperationId` are `moduleOperationInterceptor`'s job: a host tree publishes work
     * sites as `HOST_CAMPUS_LIST` rather than `INSTITUTION_CAMPUSES`, and the `institutionlocation`
     * row names both so the session's own menu resolves whichever it carries.
     */
    const institutionLocationsResource = rxResource({
      params: () => store.institutionId() ?? undefined,
      stream: ({ params: InstitutionId }) =>
        institutionLocationApi
          .getInstitutionLocations({ InstitutionId, IsActive: true, PageSize: LOOKUP_PAGE_SIZE })
          .pipe(
            map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
            catchError(() => of([] as InstitutionLocationRow[])),
          ),
    });

    const deviceMastersResource = rxResource({
      stream: () =>
        deviceMasterApi.getDeviceMasters({ IsActive: true, PageSize: LOOKUP_PAGE_SIZE }).pipe(
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          catchError(() => of([] as DeviceMasterRow[])),
        ),
    });

    return {
      institutionDevicesResource,
      institutionsResource,
      institutionLocationsResource,
      deviceMastersResource,
    };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.institutionDevicesResource.isLoading()),
    /** Gates the Location filter — locations are listed one institution at a time. */
    hasInstitution: computed(() => store.institutionId() !== null),
    institutions: computed(() => store.institutionsResource.value() ?? []),
    deviceMasters: computed(() => store.deviceMastersResource.value() ?? []),
    /** The lookups resolve after the grid, so their selects say so rather than looking empty. */
    isInstitutionsLoading: computed(() => store.institutionsResource.isLoading()),
    isInstitutionLocationsLoading: computed(() => store.institutionLocationsResource.isLoading()),
    isDeviceMastersLoading: computed(() => store.deviceMastersResource.isLoading()),
    /**
     * The request already carries `InstitutionId`; this repeats the narrowing in case the server ignores
     * it. Rows that carry no `institutionId` stay visible rather than disappearing from the dropdown.
     */
    institutionLocations: computed(() => {
      const locations = store.institutionLocationsResource.value() ?? [];
      const institutionId = store.institutionId();
      if (institutionId === null) {
        return locations;
      }
      return locations.filter(
        (location) => location.institutionId === institutionId || location.institutionId == null,
      );
    }),
  })),
  withMethods((store) => {
    const institutionDeviceApi = inject(InstitutionDeviceApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: string, isUpdatingStatus: boolean) =>
      patchState(store, {
        institutionDevices: store
          .institutionDevices()
          .map((row) => (row.id === id ? { ...row, isUpdatingStatus } : row)),
      });

    const setDeleting = (id: string, isDeleting: boolean) =>
      patchState(store, {
        institutionDevices: store
          .institutionDevices()
          .map((row) => (row.id === id ? { ...row, isDeleting } : row)),
      });

    return {
      reloadInstitutionDevices(): void {
        store.institutionDevicesResource.reload();
      },

      /** `null` is the "Any" option. A location belongs to one institution, so switching institutions
       *  invalidates the location filter. */
      setInstitutionId(institutionId: string | null): void {
        patchState(store, { institutionId: institutionId ?? null, institutionLocationId: null, pageNumber: 1 });
      },

      setInstitutionLocationId(institutionLocationId: number | null): void {
        patchState(store, { institutionLocationId: institutionLocationId ?? null, pageNumber: 1 });
      },

      setDeviceMasterId(deviceMasterId: number | null): void {
        patchState(store, { deviceMasterId: deviceMasterId ?? null, pageNumber: 1 });
      },

      setIsAttendanceDevice(isAttendanceDevice: boolean | null): void {
        patchState(store, { isAttendanceDevice: isAttendanceDevice ?? null, pageNumber: 1 });
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
      toggleActive(row: InstitutionDeviceRow): void {
        const isActive = !row.isActive;
        setUpdatingStatus(row.id, true);

        // The institution comes off the row, not the filter — under "Any institution" the filter is null.
        institutionDeviceApi
          .setInstitutionDeviceStatus({ id: row.id, isActive, institutionId: row.institutionId })
          .pipe(
            finalize(() => setUpdatingStatus(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.institutionDevicesResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      /** The row leaves the list, so both the page and the total come back from the server. */
      deleteInstitutionDevice(row: InstitutionDeviceRow): void {
        setDeleting(row.id, true);

        institutionDeviceApi
          .deleteInstitutionDevice(row.id, row.institutionId)
          .pipe(
            finalize(() => setDeleting(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.institutionDevicesResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);

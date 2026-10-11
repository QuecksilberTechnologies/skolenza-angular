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

import { Common, InstitutionDeviceApi, InstitutionDeviceConfigurationApi, InstitutionsApi } from '@core/services';
import {
  DeviceCommunicationType,
  IInstitution,
  SettledSearchTerm,
  InstitutionDeviceConfigurationRow,
  InstitutionDeviceRow,
} from '@shared/interfaces';

interface InstitutionDeviceConfigurationsState {
  configurations: InstitutionDeviceConfigurationRow[];
  /** Server-side filters. `null` is the "Any" option — the endpoint takes them as nullable. */
  institutionId: string | null;
  institutionDeviceId: string | null;
  communicationType: DeviceCommunicationType | null;
  isEnrollmentEnabled: boolean | null;
  /** Already debounced and whitespace-normalised by `TableSearchInput`. */
  search: string;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
}

const initialState: InstitutionDeviceConfigurationsState = {
  configurations: [],
  institutionId: null,
  institutionDeviceId: null,
  communicationType: null,
  isEnrollmentEnabled: null,
  search: '',
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
};

/** One page big enough to hold every lookup row — these feed dropdowns, not a grid. */
const LOOKUP_PAGE_SIZE = 500;

export const InstitutionDeviceConfigurationsStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const configurationApi = inject(InstitutionDeviceConfigurationApi);
    const institutionDeviceApi = inject(InstitutionDeviceApi);
    const institutionsApi = inject(InstitutionsApi);
    const commonService = inject(Common);

    // `makeHttpParams` drops `null`, so an unpicked institution simply omits the param and `get-all`
    // answers with every institution's rows — the same way the three filters below widen the list.
    const configurationsResource = rxResource({
      params: () => ({
        Search: store.search(),
        InstitutionId: store.institutionId(),
        InstitutionDeviceId: store.institutionDeviceId(),
        CommunicationType: store.communicationType(),
        IsEnrollmentEnabled: store.isEnrollmentEnabled(),
        PageNumber: store.pageNumber(),
        PageSize: store.pageSize(),
      }),
      stream: ({ params }) =>
        configurationApi.getInstitutionDeviceConfigurations(params).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              configurations: res.isSucceeded ? (res.data ?? []) : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? 0) : 0,
            });
          }),
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { configurations: [], totalRecords: 0 });
            return of([] as InstitutionDeviceConfigurationRow[]);
          }),
        ),
    });

    /** Unlike the grid, this lookup is institution-scoped and stays idle until a institution is picked. */
    const institutionDevicesResource = rxResource({
      params: () => store.institutionId() ?? undefined,
      stream: ({ params: InstitutionId }) =>
        institutionDeviceApi
          .getInstitutionDevices({ InstitutionId, IsActive: true, PageSize: LOOKUP_PAGE_SIZE })
          .pipe(
            map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
            catchError(() => of([] as InstitutionDeviceRow[])),
          ),
    });

    /** Feeds the institution filter, so it loads on open. */
    const institutionsResource = rxResource({
      stream: () =>
        institutionsApi.getInstitutions({ IsActive: true }).pipe(
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          catchError(() => of([] as IInstitution[])),
        ),
    });

    return { configurationsResource, institutionDevicesResource, institutionsResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.configurationsResource.isLoading()),
    /** Gates the Device filter — devices are listed one institution at a time. */
    hasInstitution: computed(() => store.institutionId() !== null),
    institutions: computed(() => store.institutionsResource.value() ?? []),
    isInstitutionsLoading: computed(() => store.institutionsResource.isLoading()),
    institutionDevices: computed(() => store.institutionDevicesResource.value() ?? []),
    /** The lookup resolves after the grid, so its select says so rather than looking empty. */
    isInstitutionDevicesLoading: computed(() => store.institutionDevicesResource.isLoading()),
  })),
  withMethods((store) => {
    const commonService = inject(Common);

    return {
      reloadConfigurations(): void {
        store.configurationsResource.reload();
      },

      /** A device belongs to one institution, so switching institutions invalidates the chosen device. */
      setInstitutionId(institutionId: string | null): void {
        patchState(store, { institutionId, institutionDeviceId: null, pageNumber: 1 });
      },

      /** `null` is the "Any" option. A different filter invalidates the page the grid is on. */
      setInstitutionDeviceId(institutionDeviceId: string | null): void {
        patchState(store, { institutionDeviceId: institutionDeviceId ?? null, pageNumber: 1 });
      },

      setCommunicationType(communicationType: DeviceCommunicationType | null): void {
        patchState(store, { communicationType: communicationType ?? null, pageNumber: 1 });
      },

      setIsEnrollmentEnabled(isEnrollmentEnabled: boolean | null): void {
        patchState(store, { isEnrollmentEnabled: isEnrollmentEnabled ?? null, pageNumber: 1 });
      },

      setSearch(search: SettledSearchTerm): void {
        patchState(store, { search, pageNumber: 1 });
      },

      loadPage(event: TableLazyLoadEvent): void {
        const { page, rows } = commonService.getPaginationParam(event);
        patchState(store, { pageNumber: page, pageSize: rows });
      },
    };
  }),
);

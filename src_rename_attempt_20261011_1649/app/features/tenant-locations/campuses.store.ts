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

import { Common, CampusApi, InstitutionsApi } from '@core/services';
import { CurrentUserPermissionsStore } from '@core/stores';
import {
  IInstitution,
  SettledSearchTerm,
  CampusRow,
  CampusType,
} from '@shared/interfaces';

interface CampusesState {
  campuses: CampusRow[];
  /** Host session only — a institution session's own locations are already scoped by the token. */
  institutionId: string | null;
  /** Server-side. `null` is the "All" option — the endpoint takes each as a nullable filter. */
  locationType: CampusType | null;
  countryId: number | null;
  stateId: number | null;
  districtId: number | null;
  isActive: boolean | null;
  /** Already debounced and whitespace-normalised by `TableSearchInput`. */
  search: string;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
}

const initialState: CampusesState = {
  campuses: [],
  institutionId: null,
  locationType: null,
  countryId: null,
  stateId: null,
  districtId: null,
  isActive: null,
  search: '',
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
};

export const CampusesStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const campusApi = inject(CampusApi);
    const institutionsApi = inject(InstitutionsApi);
    const permissionsStore = inject(CurrentUserPermissionsStore);
    const commonService = inject(Common);

    const campusesResource = rxResource({
      params: () => ({
        Search: store.search(),
        InstitutionId: store.institutionId(),
        CountryId: store.countryId(),
        StateId: store.stateId(),
        DistrictId: store.districtId(),
        LocationType: store.locationType(),
        IsActive: store.isActive(),
        PageNumber: store.pageNumber(),
        PageSize: store.pageSize(),
      }),
      stream: ({ params }) => {
        // `ModuleId`/`OperationId` are `moduleOperationInterceptor`'s job. A host session's
        // `GET /Navigation/my-menu` tree carries `HOST_CAMPUS_LIST` where a institution's
        // carries `INSTITUTION_CAMPUSES`, and the `institutionlocation` row names both, so each session
        // resolves the ids off its own menu and a renumbered module needs no change here.
        return campusApi.getCampuses(params).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              campuses: res.isSucceeded ? (res.data ?? []) : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? 0) : 0,
            });
          }),
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { campuses: [], totalRecords: 0 });
            return of([] as CampusRow[]);
          }),
        );
      },
    });

    /** Feeds the Institution filter, host session only — a institution session never renders it. */
    const institutionsResource = rxResource({
      params: () => (permissionsStore.isHostSession() ? true : undefined),
      stream: () =>
        institutionsApi.getInstitutions({ IsActive: true }).pipe(
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          catchError(() => of([] as IInstitution[])),
        ),
    });

    return { campusesResource, institutionsResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.campusesResource.isLoading()),
    institutions: computed(() => store.institutionsResource.value() ?? []),
    isInstitutionsLoading: computed(() => store.institutionsResource.isLoading()),
    appliedFilterCount: computed(
      () =>
        [
          store.locationType(),
          store.countryId(),
          store.stateId(),
          store.districtId(),
          store.isActive(),
        ].filter((value) => value !== null).length,
    ),
  })),
  withMethods((store) => {
    const campusApi = inject(CampusApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        campuses: store
          .campuses()
          .map((row) => (row.id === id ? { ...row, isUpdatingStatus } : row)),
      });

    const setDeleting = (id: number, isDeleting: boolean) =>
      patchState(store, {
        campuses: store
          .campuses()
          .map((row) => (row.id === id ? { ...row, isDeleting } : row)),
      });

    return {
      reloadCampuses(): void {
        store.campusesResource.reload();
      },

      /** Host session only. `null` is "Any institution" — clearing it lists every institution's locations. */
      setInstitutionId(institutionId: string | null): void {
        patchState(store, { institutionId: institutionId ?? null, pageNumber: 1 });
      },

      /** `null` is the "All" option. A different filter invalidates the page the grid is on. */
      setLocationType(locationType: CampusType | null): void {
        patchState(store, { locationType: locationType ?? null, pageNumber: 1 });
      },

      /** Clears the downstream geography filters — a stale state or city would return nothing. */
      setCountryId(countryId: number | null): void {
        patchState(store, {
          countryId: countryId ?? null,
          stateId: null,
          districtId: null,
          pageNumber: 1,
        });
      },

      setStateId(stateId: number | null): void {
        patchState(store, { stateId: stateId ?? null, districtId: null, pageNumber: 1 });
      },

      setDistrictId(districtId: number | null): void {
        patchState(store, { districtId: districtId ?? null, pageNumber: 1 });
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
       * page contents and the total. Deactivation is rejected while devices, assignments,
       * arrangements, patterns or overrides still reference the location — the backend message says so.
       */
      toggleActive(row: CampusRow): void {
        const isActive = !row.isActive;
        setUpdatingStatus(row.id, true);

        campusApi
          .setCampusStatus({ id: row.id, isActive })
          .pipe(
            finalize(() => setUpdatingStatus(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.campusesResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      /** The row leaves the list, so both the page and the total come back from the server. */
      deleteCampus(row: CampusRow): void {
        setDeleting(row.id, true);

        campusApi
          .deleteCampus(row.id)
          .pipe(
            finalize(() => setDeleting(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.campusesResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);


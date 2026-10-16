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

import { AttendancePolicyApi, Common } from '@core/services';
import { AttendancePolicyRow, SettledSearchTerm } from '@shared/interfaces';

interface AttendancePoliciesState {
  attendancePolicies: AttendancePolicyRow[];
  /** Server-side. `null` is the "All" option — the endpoint takes it as a nullable filter. */
  policyTypeId: number | null;
  isActive: boolean | null;
  /** Already debounced and whitespace-normalised by `TableSearchInput`. */
  search: string;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
}

const initialState: AttendancePoliciesState = {
  attendancePolicies: [],
  policyTypeId: null,
  isActive: null,
  search: '',
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
};

export const AttendancePoliciesStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const attendancePolicyApi = inject(AttendancePolicyApi);
    const commonService = inject(Common);

    const attendancePoliciesResource = rxResource({
      params: () => ({
        Search: store.search(),
        PolicyTypeId: store.policyTypeId(),
        IsActive: store.isActive(),
        PageNumber: store.pageNumber(),
        PageSize: store.pageSize(),
      }),
      stream: ({ params }) =>
        attendancePolicyApi.getAttendancePolicies(params).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              attendancePolicies: res.isSucceeded ? (res.data ?? []) : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? 0) : 0,
            });
          }),
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { attendancePolicies: [], totalRecords: 0 });
            return of([] as AttendancePolicyRow[]);
          }),
        ),
    });

    return { attendancePoliciesResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.attendancePoliciesResource.isLoading()),
  })),
  withMethods((store) => {
    const attendancePolicyApi = inject(AttendancePolicyApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        attendancePolicies: store
          .attendancePolicies()
          .map((row) => (row.id === id ? { ...row, isUpdatingStatus } : row)),
      });

    const setDeleting = (id: number, isDeleting: boolean) =>
      patchState(store, {
        attendancePolicies: store
          .attendancePolicies()
          .map((row) => (row.id === id ? { ...row, isDeleting } : row)),
      });

    return {
      reloadAttendancePolicies(): void {
        store.attendancePoliciesResource.reload();
      },

      /** `null` is the "All" option. A different filter invalidates the page the grid is on. */
      setPolicyTypeId(policyTypeId: number | null): void {
        patchState(store, { policyTypeId: policyTypeId ?? null, pageNumber: 1 });
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
       * page contents and the total. Deactivation is rejected while an active work arrangement
       * still uses the policy — the backend message says so.
       */
      toggleActive(row: AttendancePolicyRow): void {
        const isActive = !row.isActive;
        setUpdatingStatus(row.id, true);

        attendancePolicyApi
          .setAttendancePolicyStatus({ id: row.id, isActive })
          .pipe(
            finalize(() => setUpdatingStatus(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.attendancePoliciesResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      /** The row leaves the list, so both the page and the total come back from the server. */
      deleteAttendancePolicy(row: AttendancePolicyRow): void {
        setDeleting(row.id, true);

        attendancePolicyApi
          .deleteAttendancePolicy(row.id)
          .pipe(
            finalize(() => setDeleting(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.attendancePoliciesResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);

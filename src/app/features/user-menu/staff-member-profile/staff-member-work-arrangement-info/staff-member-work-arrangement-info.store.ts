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

import { Common, StaffMemberWorkArrangementApi } from '@core/services';
import { StaffMemberWorkArrangementRow, WorkMode } from '@shared/interfaces';

interface StaffMemberWorkArrangementsState {
  /** The 8-character staffMember code the app holds; empty means "All staffMembers". */
  staffMemberId: string;
  /** Server-side. `null` is the "All" option. */
  workMode: WorkMode | null;
  isActive: boolean | null;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  arrangements: StaffMemberWorkArrangementRow[];
}

const initialState: StaffMemberWorkArrangementsState = {
  staffMemberId: '',
  workMode: null,
  isActive: null,
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
  arrangements: [],
};

export const StaffMemberWorkArrangementsStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const staffMemberWorkArrangementApi = inject(StaffMemberWorkArrangementApi);
    const commonService = inject(Common);

    const arrangementsResource = rxResource({
      params: () => ({
        StaffMemberId: store.staffMemberId() || null,
        WorkMode: store.workMode(),
        IsActive: store.isActive(),
        PageNumber: store.pageNumber(),
        PageSize: store.pageSize(),
      }),
      stream: ({ params }) =>
        staffMemberWorkArrangementApi.getStaffMemberWorkArrangements(params).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              arrangements: res.isSucceeded ? (res.data ?? []) : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? res.data?.length ?? 0) : 0,
            });
          }),
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { arrangements: [], totalRecords: 0 });
            return of([] as StaffMemberWorkArrangementRow[]);
          }),
        ),
    });

    return { arrangementsResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.arrangementsResource.isLoading()),
    /**
     * An staffMember holds at most one active arrangement, and the backend rejects a second one
     * instead of replacing the first. Only knowable with one staffMember chosen and inactive rows not
     * filtered to the exclusion of active ones; the backend rejection covers the rest.
     */
    hasActiveArrangement: computed(
      () => !!store.staffMemberId() && store.arrangements().some((row) => row.isActive),
    ),
  })),
  withMethods((store) => {
    const staffMemberWorkArrangementApi = inject(StaffMemberWorkArrangementApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        arrangements: store
          .arrangements()
          .map((row) => (row.id === id ? { ...row, isUpdatingStatus } : row)),
      });

    const setDeleting = (id: number, isDeleting: boolean) =>
      patchState(store, {
        arrangements: store
          .arrangements()
          .map((row) => (row.id === id ? { ...row, isDeleting } : row)),
      });

    return {
      setStaffMemberId(staffMemberId: string): void {
        patchState(store, { staffMemberId, pageNumber: 1 });
      },

      setWorkMode(workMode: WorkMode | null): void {
        patchState(store, { workMode: workMode ?? null, pageNumber: 1 });
      },

      setIsActive(isActive: boolean | null): void {
        patchState(store, { isActive: isActive ?? null, pageNumber: 1 });
      },

      loadPage(event: TableLazyLoadEvent): void {
        const { page, rows } = commonService.getPaginationParam(event);
        patchState(store, { pageNumber: page, pageSize: rows });
      },

      reloadArrangements(): void {
        store.arrangementsResource.reload();
      },

      /** Activation is rejected while the staffMember already has another active arrangement. */
      toggleActive(row: StaffMemberWorkArrangementRow): void {
        setUpdatingStatus(row.id, true);

        staffMemberWorkArrangementApi
          .setStaffMemberWorkArrangementStatus({ id: row.id, isActive: !row.isActive })
          .pipe(
            finalize(() => setUpdatingStatus(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.arrangementsResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      /** Rejected while work patterns or overrides still hang off the arrangement. */
      deleteArrangement(row: StaffMemberWorkArrangementRow): void {
        setDeleting(row.id, true);

        staffMemberWorkArrangementApi
          .deleteStaffMemberWorkArrangement(row.id)
          .pipe(
            finalize(() => setDeleting(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.arrangementsResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);

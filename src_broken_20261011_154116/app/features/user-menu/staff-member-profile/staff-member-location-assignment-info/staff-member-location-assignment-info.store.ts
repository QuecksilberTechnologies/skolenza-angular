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

import { Common, StaffMemberLocationAssignmentApi } from '@core/services';
import { StaffMemberLocationAssignmentRow } from '@shared/interfaces';

interface StaffMemberLocationAssignmentsState {
  /** The 8-character staffMember code the app holds; empty means "All staffMembers". */
  staffMemberId: string;
  /** Server-side. `null` is the "All" option. */
  institutionLocationId: number | null;
  isActive: boolean | null;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  assignments: StaffMemberLocationAssignmentRow[];
}

const initialState: StaffMemberLocationAssignmentsState = {
  staffMemberId: '',
  institutionLocationId: null,
  isActive: null,
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
  assignments: [],
};

export const StaffMemberLocationAssignmentsStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const staffMemberLocationAssignmentApi = inject(StaffMemberLocationAssignmentApi);
    const commonService = inject(Common);

    const assignmentsResource = rxResource({
      params: () => ({
        StaffMemberId: store.staffMemberId() || null,
        InstitutionLocationId: store.institutionLocationId(),
        IsActive: store.isActive(),
        PageNumber: store.pageNumber(),
        PageSize: store.pageSize(),
      }),
      stream: ({ params }) =>
        staffMemberLocationAssignmentApi.getStaffMemberLocationAssignments(params).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              assignments: res.isSucceeded ? (res.data ?? []) : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? res.data?.length ?? 0) : 0,
            });
          }),
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { assignments: [], totalRecords: 0 });
            return of([] as StaffMemberLocationAssignmentRow[]);
          }),
        ),
    });

    return { assignmentsResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.assignmentsResource.isLoading()),
  })),
  withMethods((store) => {
    const staffMemberLocationAssignmentApi = inject(StaffMemberLocationAssignmentApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        assignments: store
          .assignments()
          .map((row) => (row.id === id ? { ...row, isUpdatingStatus } : row)),
      });

    const setDeleting = (id: number, isDeleting: boolean) =>
      patchState(store, {
        assignments: store
          .assignments()
          .map((row) => (row.id === id ? { ...row, isDeleting } : row)),
      });

    return {
      setStaffMemberId(staffMemberId: string): void {
        patchState(store, { staffMemberId, pageNumber: 1 });
      },

      setInstitutionLocationId(institutionLocationId: number | null): void {
        patchState(store, { institutionLocationId: institutionLocationId ?? null, pageNumber: 1 });
      },

      setIsActive(isActive: boolean | null): void {
        patchState(store, { isActive: isActive ?? null, pageNumber: 1 });
      },

      loadPage(event: TableLazyLoadEvent): void {
        const { page, rows } = commonService.getPaginationParam(event);
        patchState(store, { pageNumber: page, pageSize: rows });
      },

      reloadAssignments(): void {
        store.assignmentsResource.reload();
      },

      /** `/update-status` flips the row, then the grid refetches — the row may leave the filter. */
      toggleActive(row: StaffMemberLocationAssignmentRow): void {
        setUpdatingStatus(row.id, true);

        staffMemberLocationAssignmentApi
          .setStaffMemberLocationAssignmentStatus({ id: row.id, isActive: !row.isActive })
          .pipe(
            finalize(() => setUpdatingStatus(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.assignmentsResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      deleteAssignment(row: StaffMemberLocationAssignmentRow): void {
        setDeleting(row.id, true);

        staffMemberLocationAssignmentApi
          .deleteStaffMemberLocationAssignment(row.id)
          .pipe(
            finalize(() => setDeleting(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.assignmentsResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);

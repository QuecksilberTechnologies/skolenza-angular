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

import { Common, StaffMemberWorkModeOverrideApi } from '@core/services';
import {
  StaffMemberWorkModeOverrideRow,
  SettledSearchTerm,
  WorkModeOverrideApprovalStatus,
} from '@shared/interfaces';

interface StaffMemberWorkModeOverridesState {
  /** The 8-character staffMember code the app holds; empty means "All staffMembers". */
  staffMemberId: string;
  /** Server-side. `null` is the "All" option. */
  approvalStatus: WorkModeOverrideApprovalStatus | null;
  isActive: boolean | null;
  /** Already debounced and whitespace-normalised by `TableSearchInput`. */
  search: string;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  overrides: StaffMemberWorkModeOverrideRow[];
}

const initialState: StaffMemberWorkModeOverridesState = {
  staffMemberId: '',
  approvalStatus: null,
  isActive: null,
  search: '',
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
  overrides: [],
};

export const StaffMemberWorkModeOverridesStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const staffMemberWorkModeOverrideApi = inject(StaffMemberWorkModeOverrideApi);
    const commonService = inject(Common);

    const overridesResource = rxResource({
      params: () => ({
        Search: store.search() || null,
        StaffMemberId: store.staffMemberId() || null,
        ApprovalStatus: store.approvalStatus(),
        IsActive: store.isActive(),
        PageNumber: store.pageNumber(),
        PageSize: store.pageSize(),
      }),
      stream: ({ params }) =>
        staffMemberWorkModeOverrideApi.getStaffMemberWorkModeOverrides(params).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              overrides: res.isSucceeded ? (res.data ?? []) : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? res.data?.length ?? 0) : 0,
            });
          }),
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { overrides: [], totalRecords: 0 });
            return of([] as StaffMemberWorkModeOverrideRow[]);
          }),
        ),
    });

    return { overridesResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.overridesResource.isLoading()),
    /** Bound to the table so a filter reset to page 1 also moves the paginator. */
    first: computed(() => (store.pageNumber() - 1) * store.pageSize()),
  })),
  withMethods((store) => {
    const staffMemberWorkModeOverrideApi = inject(StaffMemberWorkModeOverrideApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        overrides: store
          .overrides()
          .map((row) => (row.id === id ? { ...row, isUpdatingStatus } : row)),
      });

    const setDeleting = (id: number, isDeleting: boolean) =>
      patchState(store, {
        overrides: store.overrides().map((row) => (row.id === id ? { ...row, isDeleting } : row)),
      });

    const setDeciding = (id: number, isDeciding: boolean) =>
      patchState(store, {
        overrides: store.overrides().map((row) => (row.id === id ? { ...row, isDeciding } : row)),
      });

    const isBusy = (id: number) =>
      store.overrides().some((row) => row.id === id && (row.isDeciding || row.isDeleting));

    return {
      setStaffMemberId(staffMemberId: string): void {
        patchState(store, { staffMemberId, pageNumber: 1 });
      },

      setApprovalStatus(approvalStatus: WorkModeOverrideApprovalStatus | null): void {
        patchState(store, { approvalStatus: approvalStatus ?? null, pageNumber: 1 });
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

      reloadOverrides(): void {
        store.overridesResource.reload();
      },

      toggleActive(row: StaffMemberWorkModeOverrideRow): void {
        setUpdatingStatus(row.id, true);

        staffMemberWorkModeOverrideApi
          .setStaffMemberWorkModeOverrideStatus({ id: row.id, isActive: !row.isActive })
          .pipe(
            finalize(() => setUpdatingStatus(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.overridesResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      deleteOverride(row: StaffMemberWorkModeOverrideRow): void {
        if (isBusy(row.id)) return;
        setDeleting(row.id, true);

        staffMemberWorkModeOverrideApi
          .deleteStaffMemberWorkModeOverride(row.id)
          .pipe(
            finalize(() => setDeleting(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.overridesResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      decideOverride(row: StaffMemberWorkModeOverrideRow, approve: boolean, remark?: string): void {
        if (isBusy(row.id)) return;
        setDeciding(row.id, true);
        const request = approve
          ? staffMemberWorkModeOverrideApi.approveStaffMemberWorkModeOverride({ id: row.id, remark })
          : staffMemberWorkModeOverrideApi.rejectStaffMemberWorkModeOverride({ id: row.id, remark });

        request
          .pipe(
            finalize(() => setDeciding(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) store.overridesResource.reload();
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);

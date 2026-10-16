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

import { Common, StaffMemberWorkArrangementApi, StaffMemberWorkPatternApi } from '@core/services';
import {
  StaffMemberWorkArrangementRow,
  StaffMemberWorkPatternRow,
  WorkPatternDay,
} from '@shared/interfaces';

/** One page big enough to hold every arrangement of one staffMember — it feeds a filter, not a grid. */
const ARRANGEMENT_PAGE_SIZE = 100;

interface StaffMemberWorkPatternsState {
  /**
   * The 8-character staffMember code the app holds; empty means "All staffMembers". Sent as-is once
   * chosen; backend rejections surface as a toast.
   */
  staffMemberId: string;
  /** Server-side. `null` is the "All" option. */
  dayOfWeek: WorkPatternDay | null;
  isActive: boolean | null;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  arrangements: StaffMemberWorkArrangementRow[];
  selectedArrangementId: number | null;
  patterns: StaffMemberWorkPatternRow[];
}

const initialState: StaffMemberWorkPatternsState = {
  staffMemberId: '',
  dayOfWeek: null,
  isActive: null,
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
  arrangements: [],
  selectedArrangementId: null,
  patterns: [],
};

/**
 * Work patterns hang off an arrangement, not off the staffMember, so filtering by staffMember resolves
 * that staffMember's current arrangement first and lists its weekdays. With no staffMember chosen the grid
 * lists every pattern in the institution.
 */
export const StaffMemberWorkPatternsStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const staffMemberWorkArrangementApi = inject(StaffMemberWorkArrangementApi);
    const staffMemberWorkPatternApi = inject(StaffMemberWorkPatternApi);
    const commonService = inject(Common);

    const arrangementsResource = rxResource({
      params: () => {
        const staffMemberId = store.staffMemberId();
        return staffMemberId ? { staffMemberId } : undefined;
      },
      stream: ({ params }) =>
        staffMemberWorkArrangementApi
          .getStaffMemberWorkArrangements({
            StaffMemberId: params.staffMemberId,
            PageNumber: 1,
            PageSize: ARRANGEMENT_PAGE_SIZE,
          })
          .pipe(
            tap((res) => {
              if (!res.isSucceeded) {
                commonService.showMessage(res.message, 'error');
              }
              patchState(store, { arrangements: res.isSucceeded ? (res.data ?? []) : [] });
            }),
            map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
            catchError((err) => {
              commonService.showMessage(err.message, 'error');
              patchState(store, { arrangements: [] });
              return of([] as StaffMemberWorkArrangementRow[]);
            }),
          ),
    });

    /** Uses the explicit selection, otherwise the arrangement effective today, then the next usable one. */
    const currentArrangement = computed<StaffMemberWorkArrangementRow | null>(() => {
      const arrangements = store.arrangements().filter((row) => row.isActive);
      const selected = arrangements.find((row) => row.id === store.selectedArrangementId());
      if (selected) return selected;

      const now = new Date();
      const today = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
      return (
        arrangements.find(
          (row) => row.effectiveFrom <= today && (!row.effectiveTo || row.effectiveTo >= today),
        ) ??
        arrangements.find((row) => row.effectiveFrom > today) ??
        arrangements[0] ??
        null
      );
    });

    const patternsResource = rxResource({
      params: () => {
        const arrangementId = currentArrangement()?.id;
        // An staffMember without an arrangement has no patterns — nothing to ask for.
        if (store.staffMemberId() && arrangementId === undefined) {
          return undefined;
        }
        return {
          StaffMemberWorkArrangementId: store.staffMemberId() ? arrangementId : null,
          DayOfWeek: store.dayOfWeek(),
          IsActive: store.isActive(),
          PageNumber: store.pageNumber(),
          PageSize: store.pageSize(),
        };
      },
      stream: ({ params }) =>
        staffMemberWorkPatternApi.getStaffMemberWorkPatterns(params).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              patterns: res.isSucceeded ? (res.data ?? []) : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? res.data?.length ?? 0) : 0,
            });
            // Deleting or deactivating the last row of a later page empties it; step back a page,
            // which refetches.
            if (res.isSucceeded && !res.data?.length && params.PageNumber > 1) {
              patchState(store, { pageNumber: params.PageNumber - 1 });
            }
          }),
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { patterns: [], totalRecords: 0 });
            return of([] as StaffMemberWorkPatternRow[]);
          }),
        ),
    });

    return { arrangementsResource, patternsResource, currentArrangement };
  }),
  withComputed((store) => ({
    /** Keeps the paginator on the page the store actually holds. */
    first: computed(() => (store.pageNumber() - 1) * store.pageSize()),
    isLoading: computed(
      () => store.arrangementsResource.isLoading() || store.patternsResource.isLoading(),
    ),
    /**
     * One row per weekday per arrangement, so a day already configured is not offered again. Only
     * meaningful for a chosen staffMember; a day or status filter can hide rows, in which case the
     * backend's duplicate-day rejection is the backstop.
     */
    takenDays: computed(() =>
      store.staffMemberId() ? store.patterns().map((row) => row.dayOfWeek as WorkPatternDay) : [],
    ),
  })),
  withMethods((store) => {
    const staffMemberWorkPatternApi = inject(StaffMemberWorkPatternApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        patterns: store
          .patterns()
          .map((row) => (row.id === id ? { ...row, isUpdatingStatus } : row)),
      });

    const setDeleting = (id: number, isDeleting: boolean) =>
      patchState(store, {
        patterns: store.patterns().map((row) => (row.id === id ? { ...row, isDeleting } : row)),
      });

    return {
      /** A different staffMember's rows must not linger while their own load. */
      setStaffMemberId(staffMemberId: string): void {
        if (staffMemberId === store.staffMemberId()) {
          return;
        }
        patchState(store, {
          staffMemberId,
          arrangements: [],
          selectedArrangementId: null,
          patterns: [],
          totalRecords: 0,
          pageNumber: 1,
        });
      },

      setArrangementId(selectedArrangementId: number | null): void {
        patchState(store, {
          selectedArrangementId: selectedArrangementId ?? null,
          patterns: [],
          totalRecords: 0,
          pageNumber: 1,
        });
      },

      setDayOfWeek(dayOfWeek: WorkPatternDay | null): void {
        patchState(store, { dayOfWeek: dayOfWeek ?? null, pageNumber: 1 });
      },

      setIsActive(isActive: boolean | null): void {
        patchState(store, { isActive: isActive ?? null, pageNumber: 1 });
      },

      loadPage(event: TableLazyLoadEvent): void {
        const { page, rows } = commonService.getPaginationParam(event);
        patchState(store, { pageNumber: page, pageSize: rows });
      },

      reloadPatterns(): void {
        store.patternsResource.reload();
      },

      /** `/update-status` flips the row without touching schedule history, then the grid refetches. */
      toggleActive(row: StaffMemberWorkPatternRow): void {
        setUpdatingStatus(row.id, true);

        staffMemberWorkPatternApi
          .setStaffMemberWorkPatternStatus({ id: row.id, isActive: !row.isActive })
          .pipe(
            finalize(() => setUpdatingStatus(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.patternsResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      deletePattern(row: StaffMemberWorkPatternRow): void {
        setDeleting(row.id, true);

        staffMemberWorkPatternApi
          .deleteStaffMemberWorkPattern(row.id)
          .pipe(
            finalize(() => setDeleting(row.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.patternsResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);

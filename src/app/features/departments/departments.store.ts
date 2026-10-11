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
import { finalize, map, tap } from 'rxjs';

import { Common, DepartmentsApi } from '@core/services';
import { LookupStore } from '@core/stores';
import {
  DeleteDepartmentRequest,
  Department,
  GetDepartmentsRequest,
  IDepartmentFilter,
  SettledSearchTerm,
  UpdateDepartmentRequest,
} from '@shared/interfaces';

interface DepartmentsState {
  departments: Department[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  sortBy: string | null;
  sortOrder: string | null;
  appliedFilters: IDepartmentFilter | null;
  /**
   * Already debounced and whitespace-normalised by `TableSearchInput`. Sent as `DepartmentName`: the
   * endpoint has no general search, so this matches names only.
   */
  search: string;
  userStaffMemberId: string | null | undefined;
}

const initialState: DepartmentsState = {
  departments: [],
  totalRecords: 0,
  pageNumber: 1,
  pageSize: 10,
  sortBy: null,
  sortOrder: 'desc',
  appliedFilters: null,
  search: '',
  userStaffMemberId: undefined,
};

export const DepartmentsStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const departmentsApi = inject(DepartmentsApi);
    const commonService = inject(Common);

    const departmentsResource = rxResource({
      // Idle until the table's first lazy load supplies both the signed-in user and the paging.
      params: () => {
        const userStaffMemberId = store.userStaffMemberId();
        // `null` means "resolved, but this session has no staffMember" (host users) and must still
        // issue the request; only `undefined` — nothing resolved yet — stays idle.
        if (userStaffMemberId === undefined) return undefined;

        return {
          userStaffMemberId,
          pageNumber: store.pageNumber(),
          pageSize: store.pageSize(),
          sortBy: store.sortBy(),
          sortOrder: store.sortOrder(),
          filters: store.appliedFilters(),
          search: store.search(),
        };
      },
      stream: ({ params }) => {
        const body: GetDepartmentsRequest = {
          // `null` is the explicit "All" choice; `makeHttpParams` drops the undefined param.
          IsActive: params.filters?.status ?? undefined,
          DepartmentName: params.search || undefined,
          PageNumber: params.pageNumber,
          PageSize: params.pageSize,
          SortBy: params.sortBy ?? '',
          SortOrder: params.sortOrder ?? 'desc',
          UserStaffMemberId: params.userStaffMemberId ?? undefined,
        };

        return departmentsApi.getDepartments(body).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              departments: res.isSucceeded ? res.data : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? res.data.length) : 0,
            });
          }),
          map((res) => res.data),
        );
      },
    });

    return { departmentsResource };
  }),
  withComputed(({ appliedFilters, departmentsResource, userStaffMemberId }) => ({
    // Idle before the first lazy load must read as loading, or the grid flashes its empty state.
    isLoading: computed(() => departmentsResource.isLoading() || userStaffMemberId() === undefined),
    appliedFilterCount: computed(() => {
      const filters = appliedFilters();
      return filters ? Object.values(filters).filter(Boolean).length : 0;
    }),
  })),
  withMethods((store) => {
    const departmentsApi = inject(DepartmentsApi);
    const commonService = inject(Common);
    const lookupStore = inject(LookupStore);
    const destroyRef = inject(DestroyRef);

    const getSessionUser = async () => (await commonService.getLoginInfo())?.user;

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        departments: store.departments().map((d) => (d.id === id ? { ...d, isUpdatingStatus } : d)),
      });

    const showResult = (res: { isSucceeded: boolean; message: string }) =>
      commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');

    return {
      async loadDepartments(
        event: TableLazyLoadEvent,
        filters?: IDepartmentFilter | null,
      ): Promise<void> {
        const sessionUser = await getSessionUser();
        const { page, rows, sortField, sortOrder } = commonService.getPaginationParam(event);

        patchState(store, {
          pageNumber: page,
          pageSize: rows,
          sortBy: Array.isArray(sortField) ? (sortField[0] ?? null) : (sortField ?? null),
          sortOrder,
          userStaffMemberId: sessionUser?.staffMemberId ?? null,
          // `undefined` leaves the applied filters untouched; `null` clears them.
          ...(filters !== undefined ? { appliedFilters: filters ?? null } : {}),
        });
      },

      /** A new row lands on page 1: reload when the params would not change, patch when they would. */
      /** A new term invalidates the page the grid is on. */
      setSearch(search: SettledSearchTerm): void {
        patchState(store, { search, pageNumber: 1 });
      },

      reloadFirstPage(): void {
        if (store.pageNumber() === 1) {
          store.departmentsResource.reload();
        } else {
          patchState(store, { pageNumber: 1 });
        }
      },

      reloadDepartments(): void {
        store.departmentsResource.reload();
      },

      async deleteDepartment(department: Department): Promise<void> {
        const sessionUser = await getSessionUser();
        if (!sessionUser) return;
        const departmentId = department.id;

        if (!departmentId) {
          commonService.showMessage('Unable to delete: missing department ID.', 'error');
          return;
        }

        if (sessionUser.departmentId === departmentId) {
          commonService.showMessage('You cannot delete your own department.', 'error');
          return;
        }

        const body: DeleteDepartmentRequest = {
          Id: departmentId,
          UserStaffMemberId: sessionUser.staffMemberId,
        };

        departmentsApi
          .deleteDepartment(body)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, {
                  departments: store.departments().filter((d) => d.id !== departmentId),
                });
              }
              showResult(res);
            },
            error: (err) => {
              commonService.showMessage(err.message, 'error');
            },
          });
      },

      /**
       * There is no department status endpoint, so the toggle is a full update with `isActive`
       * flipped. The list defaults to active-only, so a toggled row must leave the page and the
       * total must come back from the server — hence a reload rather than a local patch.
       */
      async toggleDepartmentStatus(department: Department): Promise<void> {
        const sessionUser = await getSessionUser();
        if (!sessionUser || !department.id) return;

        const body: UpdateDepartmentRequest = {
          id: department.id,
          userStaffMemberId: sessionUser.staffMemberId,
          departmentName: department.departmentName,
          description: department.description ?? '',
          remark: department.remark ?? '',
          isActive: !department.isActive,
        };

        setUpdatingStatus(department.id, true);

        departmentsApi
          .updateDepartment(body)
          .pipe(
            finalize(() => setUpdatingStatus(department.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.departmentsResource.reload();
                lookupStore.reloadDepartmentOptions();
              }
              showResult(res);
            },
            error: (err) => {
              commonService.showMessage(err.message, 'error');
            },
          });
      },
    };
  }),
);

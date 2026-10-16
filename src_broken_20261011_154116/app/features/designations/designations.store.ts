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

import { Common, DesignationsApi } from '@core/services';
import {
  DeleteDesignationRequest,
  GetDesignationsRequest,
  IDepartmentFilter,
  IDesignation,
  SettledSearchTerm,
  UpdateDesignationRequest,
} from '@shared/interfaces';

interface DesignationsState {
  designations: IDesignation[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  sortBy: string | string[] | null | undefined;
  sortOrder: string | null;
  appliedFilters: IDepartmentFilter | null;
  /**
   * Already debounced and whitespace-normalised by `TableSearchInput`. Sent as `DesignationName`: the
   * endpoint has no general search, so this matches names only.
   */
  search: string;
  userStaffMemberId: string | null | undefined;
}

const initialState: DesignationsState = {
  designations: [],
  totalRecords: 0,
  pageNumber: 1,
  pageSize: 10,
  sortBy: undefined,
  sortOrder: 'desc',
  appliedFilters: null,
  search: '',
  userStaffMemberId: undefined,
};

export const DesignationsStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const designationsApi = inject(DesignationsApi);
    const commonService = inject(Common);

    const designationsResource = rxResource({
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
        const body: GetDesignationsRequest = {
          // `null` is the explicit "All" choice; `makeHttpParams` drops the undefined param.
          IsActive: params.filters?.status ?? undefined,
          DesignationName: params.search || undefined,
          PageNumber: params.pageNumber,
          PageSize: params.pageSize ?? 10,
          SortBy: (params.sortBy as string) ?? '',
          SortOrder: params.sortOrder ?? 'desc',
          UserStaffMemberId: params.userStaffMemberId ?? undefined,
        };

        if (params.filters?.departmentId !== undefined) {
          body.DepartmentId = params.filters.departmentId;
        }

        return designationsApi.getDesignations(body).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              designations: res.isSucceeded ? res.data : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? res.data.length) : 0,
            });
          }),
          map((res) => res.data),
        );
      },
    });

    return { designationsResource };
  }),
  withComputed(({ appliedFilters, designationsResource, userStaffMemberId }) => ({
    // Idle before the first lazy load must read as loading, or the grid flashes its empty state.
    isLoading: computed(() => designationsResource.isLoading() || userStaffMemberId() === undefined),
    appliedFilterCount: computed(() => {
      const filters = appliedFilters();
      return filters ? Object.values(filters).filter(Boolean).length : 0;
    }),
  })),
  withMethods((store) => {
    const designationsApi = inject(DesignationsApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        designations: store
          .designations()
          .map((d) => (d.id === id ? { ...d, isUpdatingStatus } : d)),
      });

    return {
      async loadDesignations(
        event: TableLazyLoadEvent,
        isPageChange = true,
        filters?: IDepartmentFilter | null,
      ): Promise<void> {
        const loginInfo = await commonService.getLoginInfo();
        const { page, rows, sortField, sortOrder } = commonService.getPaginationParam(event);
        const pageNumber = isPageChange ? page : store.pageNumber();
        const info = loginInfo?.user;

        patchState(store, {
          pageNumber,
          pageSize: rows,
          sortBy: sortField,
          sortOrder,
          userStaffMemberId: info?.staffMemberId ?? null,
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
          store.designationsResource.reload();
        } else {
          patchState(store, { pageNumber: 1 });
        }
      },

      reloadDesignations(): void {
        store.designationsResource.reload();
      },

      async deleteDesignation(designation: IDesignation): Promise<void> {
        const loginInfo = await commonService.getLoginInfo();
        const sessionUser = loginInfo?.user;
        const designationId = designation?.id;

        if (!designationId) {
          commonService.showMessage('Unable to delete: missing designation ID.', 'error');
          return;
        }

        const body: DeleteDesignationRequest = {
          Id: designationId,
          UserStaffMemberId: sessionUser?.staffMemberId ?? '',
        };

        designationsApi
          .deleteDesignation(body)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, {
                  designations: store.designations().filter((d) => d.id !== designationId),
                });
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => {
              commonService.showMessage(err.message, 'error');
            },
          });
      },

      /**
       * There is no designation status endpoint, so the toggle is a full update with `isActive`
       * flipped. A toggled row can drop out of the current status filter, so the page and the
       * total come back from the server.
       */
      async toggleDesignationStatus(designation: IDesignation): Promise<void> {
        const loginInfo = await commonService.getLoginInfo();
        const sessionUser = loginInfo?.user;
        if (!sessionUser || !designation?.id) return;

        const body: UpdateDesignationRequest = {
          id: designation.id,
          userStaffMemberId: sessionUser.staffMemberId,
          departmentId: Number(designation.departmentId ?? 0),
          designationName: designation.designationName,
          description: designation.description ?? '',
          isActive: !designation.isActive,
        };

        setUpdatingStatus(designation.id, true);

        designationsApi
          .updateDesignation(body)
          .pipe(
            finalize(() => setUpdatingStatus(designation.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.designationsResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => {
              commonService.showMessage(err.message, 'error');
            },
          });
      },

      updateAppliedFilters(filters: IDepartmentFilter | null): void {
        patchState(store, { appliedFilters: filters });
      },
    };
  }),
);

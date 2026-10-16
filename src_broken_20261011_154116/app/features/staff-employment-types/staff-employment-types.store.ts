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

import { Common, StaffEmploymentTypesAPI } from '@core/services';
import { LookupStore } from '@core/stores';
import {
  StaffEmploymentType,
  GetStaffEmploymentTypesRequest,
  UpdateStaffEmploymentTypeRequest,
} from '@shared/interfaces';

interface StaffEmploymentTypesState {
  staffEmploymentTypes: StaffEmploymentType[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  userStaffMemberId: string | null | undefined;
}

const initialState: StaffEmploymentTypesState = {
  staffEmploymentTypes: [],
  totalRecords: 0,
  pageNumber: 1,
  pageSize: 10,
  userStaffMemberId: undefined,
};

export const StaffEmploymentTypesStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const staffEmploymentTypesApi = inject(StaffEmploymentTypesAPI);
    const commonService = inject(Common);

    const staffEmploymentTypesResource = rxResource({
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
        };
      },
      stream: ({ params }) => {
        // `GET /StaffEmploymentType/get` takes paging alone — no sort, no status filter — so the table
        // offers neither rather than sending parameters the API drops.
        const body: GetStaffEmploymentTypesRequest = {
          PageNumber: params.pageNumber,
          PageSize: params.pageSize,
          UserStaffMemberId: params.userStaffMemberId ?? '',
        };

        return staffEmploymentTypesApi.getStaffEmploymentTypes(body).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              staffEmploymentTypes: res.isSucceeded ? res.data : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? res.data.length) : 0,
            });
          }),
          map((res) => res.data),
        );
      },
    });

    return { staffEmploymentTypesResource };
  }),
  withComputed(({ staffEmploymentTypesResource, userStaffMemberId }) => ({
    // Idle before the first lazy load must read as loading, or the grid flashes its empty state.
    isLoading: computed(() => staffEmploymentTypesResource.isLoading() || userStaffMemberId() === undefined),
  })),
  withMethods((store) => {
    const staffEmploymentTypesApi = inject(StaffEmploymentTypesAPI);
    const commonService = inject(Common);
    const lookupStore = inject(LookupStore);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        staffEmploymentTypes: store
          .staffEmploymentTypes()
          .map((type) => (type.id === id ? { ...type, isUpdatingStatus } : type)),
      });

    const showResult = (res: { isSucceeded: boolean; message: string }) =>
      commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');

    return {
      async loadStaffEmploymentTypes(event: TableLazyLoadEvent): Promise<void> {
        const sessionUser = (await commonService.getLoginInfo())?.user;
        const { page, rows } = commonService.getPaginationParam(event);

        patchState(store, {
          pageNumber: page,
          pageSize: rows,
          userStaffMemberId: sessionUser?.staffMemberId ?? null,
        });
      },

      /** A new row lands on page 1: reload when the params would not change, patch when they would. */
      reloadFirstPage(): void {
        if (store.pageNumber() === 1) {
          store.staffEmploymentTypesResource.reload();
        } else {
          patchState(store, { pageNumber: 1 });
        }
      },

      reloadStaffEmploymentTypes(): void {
        store.staffEmploymentTypesResource.reload();
      },

      deleteStaffEmploymentType(staffEmploymentType: StaffEmploymentType): void {
        if (!staffEmploymentType.id) {
          commonService.showMessage('Unable to delete: missing staffMember type ID.', 'error');
          return;
        }

        staffEmploymentTypesApi
          .deleteStaffEmploymentType({ Id: staffEmploymentType.id })
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, {
                  staffEmploymentTypes: store.staffEmploymentTypes().filter((t) => t.id !== staffEmploymentType.id),
                });
                lookupStore.reloadStaffEmploymentTypes();
              }
              showResult(res);
            },
            error: (err) => {
              commonService.showMessage(err.message, 'error');
            },
          });
      },

      /**
       * There is no staffMember type status endpoint, so the toggle is a full update with `isActive`
       * flipped — the same shape the Departments page uses.
       */
      toggleStaffEmploymentTypeStatus(staffEmploymentType: StaffEmploymentType): void {
        if (!staffEmploymentType.id) return;

        const body: UpdateStaffEmploymentTypeRequest = {
          id: staffEmploymentType.id,
          typeName: staffEmploymentType.typeName,
          description: staffEmploymentType.description ?? '',
          remark: staffEmploymentType.remark ?? '',
          isActive: !staffEmploymentType.isActive,
        };

        setUpdatingStatus(staffEmploymentType.id, true);

        staffEmploymentTypesApi
          .updateStaffEmploymentType(body)
          .pipe(
            finalize(() => setUpdatingStatus(staffEmploymentType.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.staffEmploymentTypesResource.reload();
                lookupStore.reloadStaffEmploymentTypes();
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


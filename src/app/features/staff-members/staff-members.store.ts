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

import { Common, StaffMembersApi, RolesApi } from '@core/services';
import { StaffProfessionalStructureApi } from '@core/services/staff-professional-structure-api';
import {
  AssignUserRolesReq,
  DeleeteStaffMemberReq,
  StaffMemberStatistic,
  GetAllStaffMembersReq,
  GetStaffMemberStatisticsReq,
  StaffPositionMaster,
  IStaffMember,
  IStaffMemberFilter,
  SummaryStaffMemberInfo,
  UpdateStaffMemberUpdateStatusReq,
  UserRole,
} from '@shared/interfaces';
import { allPages } from '@shared/utilities/paged-list';

interface StaffMembersState {
  staffMembers: IStaffMember[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  sortBy: string | string[] | null | undefined;
  sortOrder: string | null;
  appliedFilters: IStaffMemberFilter | null;
  userStaffMemberId: string | undefined;
  statistics: StaffMemberStatistic | null;
  isLoadingStatistics: boolean;
  positionOptions: StaffPositionMaster[];
  isLoadingPositions: boolean;
  /**
   * Summaries the avatar popup has fetched, kept out of `staffMembers` so caching one cannot
   * invalidate a row: the table tracks rows by identity, and a rebuilt row takes the open
   * popup's `<ng-template>` down with it.
   */
  summaries: Record<string, SummaryStaffMemberInfo | undefined>;
}

const initialState: StaffMembersState = {
  staffMembers: [],
  totalRecords: 0,
  pageNumber: 0,
  pageSize: 10,
  sortBy: undefined,
  sortOrder: 'desc',
  appliedFilters: null,
  userStaffMemberId: undefined,
  statistics: null,
  isLoadingStatistics: false,
  positionOptions: [],
  isLoadingPositions: false,
  summaries: {},
};

export const StaffMembersStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const staffMembersApi = inject(StaffMembersApi);
    const commonService = inject(Common);

    const staffMembersResource = rxResource({
      // Idle until the table's first lazy load supplies both the signed-in user and the paging.
      params: () => {
        const userStaffMemberId = store.userStaffMemberId();
        if (!userStaffMemberId) return undefined;

        return {
          userStaffMemberId,
          pageNumber: store.pageNumber(),
          pageSize: store.pageSize(),
          sortBy: store.sortBy(),
          sortOrder: store.sortOrder(),
          filters: store.appliedFilters(),
        };
      },
      stream: ({ params }) => {
        const { filters } = params;
        const body: GetAllStaffMembersReq = {
          UserStaffMemberId: params.userStaffMemberId,
          PageNumber: params.pageNumber,
          PageSize: params.pageSize ?? 10,
          SortBy: (params.sortBy as string) ?? 'staffMemberId',
          SortOrder: params.sortOrder ?? 'desc',
          // `makeHttpParams` drops the undefined params, so an unset filter never reaches the API.
          EmployementCode: filters?.staffMemberId || undefined,
          StaffEmploymentTypeId: filters?.staffEmploymentType || undefined,
          DepartmentId: filters?.department || undefined,
          StaffPositionMasterId: filters?.position || undefined,
        };

        return staffMembersApi.getAllStaffMembers(body).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              staffMembers: res.isSucceeded ? res.data : [],
              totalRecords: res.isSucceeded ? res.totalRecords || res.data.length : 0,
            });
          }),
          map((res) => res.data),
        );
      },
    });

    return { staffMembersResource };
  }),
  withComputed(({ appliedFilters, staffMembersResource, userStaffMemberId }) => ({
    // An idle resource reports `isLoading() === false`, and `params` stays undefined until the
    // first lazy load's awaited `getLoginInfo()` patches `userStaffMemberId` — without this term the
    // grid flashes its empty state on entry.
    isLoading: computed(() => !userStaffMemberId() || staffMembersResource.isLoading()),
    appliedFilterCount: computed(() => {
      const filters = appliedFilters();
      return filters ? Object.values(filters).filter(Boolean).length : 0;
    }),
  })),
  withMethods((store) => {
    const staffMembersApi = inject(StaffMembersApi);
    const professionalApi = inject(StaffProfessionalStructureApi);
    const rolesApi = inject(RolesApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Replaces one row so the table sees a new reference instead of a mutated object. */
    const patchStaffMember = (staffMemberId: string, changes: Partial<IStaffMember>) =>
      patchState(store, {
        staffMembers: store
          .staffMembers()
          .map((staffMember) =>
            staffMember.staffMemberId === staffMemberId
              ? { ...staffMember, ...changes }
              : staffMember,
          ),
      });

    const loadStatistics = async (): Promise<void> => {
      const loginInfo = await commonService.getLoginInfo();
      const body: GetStaffMemberStatisticsReq = {
        UserStaffMemberId: loginInfo?.user?.staffMemberId ?? '',
      };

      patchState(store, { isLoadingStatistics: true });
      staffMembersApi
        .getStaffMemberStatistics(body)
        .pipe(
          finalize(() => patchState(store, { isLoadingStatistics: false })),
          takeUntilDestroyed(destroyRef),
        )
        .subscribe({
          next: (res) => patchState(store, { statistics: res.data }),
          error: (err) => commonService.showMessage(err.message, 'error'),
        });
    };

    return {
      async loadStaffMembers(
        event: TableLazyLoadEvent,
        isPageChange = true,
        filters?: IStaffMemberFilter | null,
      ): Promise<void> {
        const loginInfo = await commonService.getLoginInfo();
        const { page, rows, sortField, sortOrder } = commonService.getPaginationParam(event);

        patchState(store, {
          pageNumber: isPageChange ? page : store.pageNumber(),
          pageSize: rows,
          sortBy: sortField,
          sortOrder,
          userStaffMemberId: loginInfo?.user?.staffMemberId,
          ...(filters !== undefined ? { appliedFilters: filters ?? null } : {}),
        });
      },

      /** Applying a filter always sends the user back to the first page. */
      applyFilters(filters: IStaffMemberFilter | null): void {
        patchState(store, { appliedFilters: filters, pageNumber: 1 });
      },

      loadStatistics,

      async loadPositions(departmentId?: number): Promise<void> {
        patchState(store, { isLoadingPositions: true, positionOptions: [] });
        allPages((page) => professionalApi.getPositions(page))
          .pipe(
            finalize(() => patchState(store, { isLoadingPositions: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (positions) => {
              patchState(store, {
                positionOptions: positions.filter(
                  (position) => !position.departmentId || position.departmentId === departmentId,
                ),
              });
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      reloadStaffMembers(): void {
        store.staffMembersResource.reload();
      },

      async deleteStaffMember(staffMember?: IStaffMember): Promise<void> {
        const loginInfo = await commonService.getLoginInfo();
        const sessionUser = loginInfo?.user;
        if (!sessionUser) return;

        const staffMemberId = staffMember?.staffMemberId;

        if (staffMemberId === sessionUser.staffMemberId) {
          commonService.showMessage('You cannot delete your own staffMember record.', 'error');
          return;
        }

        if (!staffMemberId) {
          commonService.showMessage('StaffMemberId ID is required for delete.', 'error');
          return;
        }

        const body: DeleeteStaffMemberReq = {
          UserStaffMemberId: sessionUser.staffMemberId,
          StaffMemberId: staffMemberId,
        };

        staffMembersApi
          .deleteStaffMember(body)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
              if (res.isSucceeded) {
                store.staffMembersResource.reload();
              }
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      async toggleStaffMemberStatus(staffMember: IStaffMember): Promise<void> {
        const loginInfo = await commonService.getLoginInfo();
        const isActive = !staffMember.isActive;
        const body: UpdateStaffMemberUpdateStatusReq = {
          UserStaffMemberId: loginInfo?.user?.staffMemberId ?? '',
          StaffMemberId: staffMember.staffMemberId,
          IsActive: isActive,
        };

        patchStaffMember(staffMember.staffMemberId, { isUpdatingStatus: true });
        staffMembersApi
          .updateStaffMemberUpdateStatus(body)
          .pipe(
            finalize(() =>
              patchStaffMember(staffMember.staffMemberId, { isUpdatingStatus: false }),
            ),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
              if (res.isSucceeded) {
                patchStaffMember(staffMember.staffMemberId, { isActive });
                loadStatistics();
              }
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      assignRoles(staffMember: IStaffMember, userRoles: UserRole[]): void {
        const body: AssignUserRolesReq = {
          staffMemberId: staffMember.staffMemberId,
          userRoles,
        };

        patchStaffMember(staffMember.staffMemberId, { isAssigningRole: true });
        rolesApi
          .assignRolesToUser(body)
          .pipe(
            finalize(() => patchStaffMember(staffMember.staffMemberId, { isAssigningRole: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                commonService.showMessage('Roles assigned successfully', 'success');
                // The list payload's `assignedRoles` is now stale, and an empty `userRoles` would
                // fall back to it.
                patchStaffMember(staffMember.staffMemberId, {
                  userRoles,
                  assignedRoles: undefined,
                });
              } else {
                commonService.showMessage(res.message, 'error');
              }
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      /** Caches the summary the avatar popup fetched, so reopening the popup costs no request. */
      cacheSummary(staffMemberId: string, summary: SummaryStaffMemberInfo): void {
        patchState(store, { summaries: { ...store.summaries(), [staffMemberId]: summary } });
      },
    };
  }),
);

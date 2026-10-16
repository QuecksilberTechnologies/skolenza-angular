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

import { Common, ReportTypeApi } from '@core/services';
import {
  DeleteReportTypeRequest,
  GetReportTypesRequest,
  IReportTypeFilter,
  ReportType,
  SettledSearchTerm,
  UpdateReportTypeRequest,
} from '@shared/interfaces';

interface ReportTypeState {
  reportTypes: ReportType[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  sortBy: string | string[] | null | undefined;
  sortOrder: string | null;
  appliedFilters: IReportTypeFilter | null;
  /**
   * Already debounced and whitespace-normalised by `TableSearchInput`. Sent as `TypeName`: the
   * endpoint has no general search, so this matches names only. The backend matches it case-sensitively.
   */
  search: string;
  userStaffMemberId: string | null | undefined;
}

const initialState: ReportTypeState = {
  reportTypes: [],
  totalRecords: 0,
  pageNumber: 1,
  pageSize: 10,
  sortBy: undefined,
  sortOrder: 'desc',
  appliedFilters: null,
  search: '',
  userStaffMemberId: undefined,
};

export const ReportTypeStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const reportTypeApi = inject(ReportTypeApi);
    const commonService = inject(Common);

    const reportTypesResource = rxResource({
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
        const body: GetReportTypesRequest = {
          // `null` is the explicit "All" choice; `makeHttpParams` drops the undefined param.
          IsActive: params.filters?.status ?? undefined,
          TypeName: params.search || undefined,
          PageNumber: params.pageNumber,
          PageSize: params.pageSize ?? 10,
          SortBy: (params.sortBy as string) ?? '',
          SortOrder: params.sortOrder ?? 'desc',
          UserStaffMemberId: params.userStaffMemberId ?? undefined,
        };

        return reportTypeApi.getReportTypes(body).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              reportTypes: res.isSucceeded ? res.data : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? res.data.length) : 0,
            });
          }),
          map((res) => res.data),
        );
      },
    });

    return { reportTypesResource };
  }),
  withComputed(({ appliedFilters, reportTypesResource, userStaffMemberId }) => ({
    // Idle before the first lazy load must read as loading, or the grid flashes its empty state.
    isLoading: computed(() => reportTypesResource.isLoading() || userStaffMemberId() === undefined),
    appliedFilterCount: computed(() => {
      const filters = appliedFilters();
      return filters ? Object.values(filters).filter(Boolean).length : 0;
    }),
  })),
  withMethods((store) => {
    const reportTypeApi = inject(ReportTypeApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        reportTypes: store.reportTypes().map((r) => (r.id === id ? { ...r, isUpdatingStatus } : r)),
      });

    return {
      async loadReportTypes(
        event: TableLazyLoadEvent,
        isPageChange = true,
        filters?: IReportTypeFilter | null,
      ): Promise<void> {
        const loginInfo = await commonService.getLoginInfo();
        const { page, rows, sortField, sortOrder } = commonService.getPaginationParam(event);
        const pageNumber = isPageChange ? page : store.pageNumber();

        patchState(store, {
          pageNumber,
          pageSize: rows,
          sortBy: sortField,
          sortOrder,
          userStaffMemberId: loginInfo?.user?.staffMemberId ?? null,
          ...(filters !== undefined ? { appliedFilters: filters ?? null } : {}),
        });
      },

      /** A new term invalidates the page the grid is on. */
      setSearch(search: SettledSearchTerm): void {
        patchState(store, { search, pageNumber: 1 });
      },

      reloadReportTypes(): void {
        store.reportTypesResource.reload();
      },

      deleteReportType(reportType: ReportType): void {
        const reportTypeId = reportType?.id;

        if (!reportTypeId) {
          commonService.showMessage('Unable to delete: missing report type ID.', 'error');
          return;
        }

        // `/ReportingType/delete` takes `Id` and nothing else.
        const body: DeleteReportTypeRequest = { Id: reportTypeId };

        reportTypeApi
          .deleteReportType(body)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, {
                  reportTypes: store.reportTypes().filter((r) => r.id !== reportTypeId),
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
       * There is no report type status endpoint, so the toggle is a full update with `isActive`
       * flipped. A toggled row can drop out of the current status filter, so the page and the
       * total come back from the server.
       */
      async toggleReportTypeStatus(reportType: ReportType): Promise<void> {
        const loginInfo = await commonService.getLoginInfo();
        const sessionUser = loginInfo?.user;
        if (!sessionUser || !reportType?.id) return;

        const body: UpdateReportTypeRequest = {
          id: reportType.id,
          staffMemberId: 0,
          roleId: sessionUser.primaryRole?.roleId ?? 0,
          typeName: reportType.typeName,
          description: reportType.description ?? '',
          isActive: !reportType.isActive,
        };

        setUpdatingStatus(reportType.id, true);

        reportTypeApi
          .updateReportType(body)
          .pipe(
            finalize(() => setUpdatingStatus(reportType.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.reportTypesResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => {
              commonService.showMessage(err.message, 'error');
            },
          });
      },

      updateAppliedFilters(filters: IReportTypeFilter | null): void {
        patchState(store, { appliedFilters: filters });
      },
    };
  }),
);

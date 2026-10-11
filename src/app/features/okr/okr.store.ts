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
import { map, tap } from 'rxjs';

import { Common, OkrApi } from '@core/services';
import {
  GetOkrsRequest,
  IOkr,
  IOkrFilter,
  OkrScope,
  OkrStats,
  SettledSearchTerm,
} from '@shared/interfaces';

interface OkrState {
  okrs: IOkr[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  sortBy: string | string[] | null | undefined;
  sortOrder: string | null;
  searchTerm: string;
  scope: OkrScope;
  appliedFilters: IOkrFilter | null;
  userStaffMemberId: string | null | undefined;
}

const initialState: OkrState = {
  okrs: [],
  totalRecords: 0,
  pageNumber: 1,
  pageSize: 10,
  sortBy: undefined,
  sortOrder: 'desc',
  searchTerm: '',
  scope: 'my',
  appliedFilters: null,
  userStaffMemberId: undefined,
};

const TODAY = '2026-06-27';

export const OkrStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const okrApi = inject(OkrApi);
    const commonService = inject(Common);

    const okrsResource = rxResource({
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
          searchTerm: store.searchTerm(),
          scope: store.scope(),
          filters: store.appliedFilters(),
        };
      },
      stream: ({ params }) => {
        const body: GetOkrsRequest = {
          IsActive: true,
          PageNumber: params.pageNumber,
          PageSize: params.pageSize ?? 10,
          SortBy: (params.sortBy as string) ?? '',
          SortOrder: params.sortOrder ?? 'desc',
          SearchTerm: params.searchTerm || undefined,
          Scope: params.scope,
          UserStaffMemberId: params.userStaffMemberId ?? undefined,
          Level: params.filters?.level ?? null,
          DepartmentId: params.filters?.departmentId ?? null,
          Quarter: params.filters?.quarter ?? null,
          Status: params.filters?.status ?? null,
        };

        return okrApi.getOkrs(body).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              okrs: res.isSucceeded ? res.data : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? res.data.length) : 0,
            });
          }),
          map((res) => res.data),
        );
      },
    });

    return { okrsResource };
  }),
  withComputed(({ okrs, okrsResource, appliedFilters, userStaffMemberId }) => ({
    // Idle before the first lazy load must read as loading, or the grid flashes its empty state.
    isLoading: computed(() => okrsResource.isLoading() || userStaffMemberId() === undefined),
    appliedFilterCount: computed(() => {
      const filters = appliedFilters();
      return filters ? Object.values(filters).filter(Boolean).length : 0;
    }),
    stats: computed<OkrStats>(() => {
      const list = okrs();
      return {
        active: list.filter((o) => o.status !== 'Archived' && o.status !== 'Completed').length,
        completed: list.filter((o) => o.status === 'Completed').length,
        onTrack: list.filter((o) => o.status === 'OnTrack').length,
        atRisk: list.filter((o) => o.status === 'Behind').length,
        overdue: list.filter(
          (o) => o.dueDate < TODAY && o.status !== 'Completed' && o.status !== 'Archived',
        ).length,
      };
    }),
  })),
  withMethods((store) => {
    const okrApi = inject(OkrApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Resolve the owner id used to scope "My OKRs". */
    async function resolveUserStaffMemberId(): Promise<string | null> {
      const known = store.userStaffMemberId();
      if (known !== undefined) return known;
      const loginInfo = await commonService.getLoginInfo();
      return loginInfo?.user?.staffMemberId ?? null;
    }

    return {
      setScope(scope: OkrScope): void {
        if (store.scope() !== scope) {
          patchState(store, { scope, pageNumber: 1 });
        }
      },

      async loadOkrs(
        event: TableLazyLoadEvent,
        isPageChange = true,
        filters?: IOkrFilter | null,
      ): Promise<void> {
        const { page, rows, sortField, sortOrder } = commonService.getPaginationParam(event);
        const pageNumber = isPageChange ? page : store.pageNumber();
        const userStaffMemberId = await resolveUserStaffMemberId();

        patchState(store, {
          pageNumber,
          pageSize: rows,
          sortBy: sortField,
          sortOrder,
          userStaffMemberId,
          ...(filters !== undefined ? { appliedFilters: filters ?? null } : {}),
        });
      },

      setSearchTerm(term: SettledSearchTerm): void {
        patchState(store, { searchTerm: term, pageNumber: 1 });
      },

      updateAppliedFilters(filters: IOkrFilter | null): void {
        patchState(store, { appliedFilters: filters, pageNumber: 1 });
      },

      reload(): void {
        store.okrsResource.reload();
      },

      deleteOkr(okr: IOkr): void {
        okrApi
          .deleteOkr({ id: okr.id })
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, {
                  okrs: store.okrs().filter((o) => o.id !== okr.id),
                  totalRecords: Math.max(0, store.totalRecords() - 1),
                });
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err: unknown) =>
              commonService.showMessage(
                err instanceof Error ? err.message : 'Something went wrong',
                'error',
              ),
          });
      },

      archiveOkrs(ids: string[]): void {
        okrApi
          .archiveOkr({ ids })
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                const idSet = new Set(ids);
                patchState(store, {
                  okrs: store
                    .okrs()
                    .map((o) =>
                      idSet.has(o.id) ? { ...o, status: 'Archived', isActive: false } : o,
                    ),
                });
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err: unknown) =>
              commonService.showMessage(
                err instanceof Error ? err.message : 'Something went wrong',
                'error',
              ),
          });
      },

      bulkDelete(ids: string[]): void {
        const idSet = new Set(ids);
        okrApi
          .deleteOkr({ id: ids.join(',') })
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, {
                  okrs: store.okrs().filter((o) => !idSet.has(o.id)),
                  totalRecords: Math.max(0, store.totalRecords() - ids.length),
                });
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err: unknown) =>
              commonService.showMessage(
                err instanceof Error ? err.message : 'Something went wrong',
                'error',
              ),
          });
      },

      duplicateOkr(okr: IOkr): void {
        okrApi
          .duplicateOkr({ id: okr.id })
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.okrsResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err: unknown) =>
              commonService.showMessage(
                err instanceof Error ? err.message : 'Something went wrong',
                'error',
              ),
          });
      },
    };
  }),
);

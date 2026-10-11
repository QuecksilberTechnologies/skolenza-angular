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

import { Common, HostApi } from '@core/services';
import { AuthStore } from '@core/stores';
import { DeleteHostUserRequest, HostUser, UpdateHostUserRequest } from '@shared/interfaces';

interface HostUsersState {
  hostUsers: HostUser[];
  /** Server-side. `null` is the "All" option — the endpoint takes it as a nullable filter. */
  statusFilter: boolean | null;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
}

const initialState: HostUsersState = {
  hostUsers: [],
  statusFilter: null,
  pageNumber: 1,
  pageSize: 10,
  totalRecords: 0,
};

const toUpdateRequest = (hostUser: HostUser, isActive: boolean): UpdateHostUserRequest => ({
  id: hostUser.id,
  hostRoleId: hostUser.hostRoleId,
  name: hostUser.name,
  loginId: hostUser.loginId,
  email: hostUser.email,
  mobileNumber: hostUser.mobileNumber,
  isActive,
});

export const HostUsersStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const hostApi = inject(HostApi);
    const commonService = inject(Common);

    const hostUsersResource = rxResource({
      params: () => ({
        isActive: store.statusFilter(),
        pageNumber: store.pageNumber(),
        pageSize: store.pageSize(),
      }),
      stream: ({ params }) =>
        hostApi.getHostUsers(params).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, {
              hostUsers: res.isSucceeded ? (res.data ?? []) : [],
              totalRecords: res.isSucceeded ? (res.totalRecords ?? 0) : 0,
            });
          }),
          map((res) => (res.isSucceeded ? (res.data ?? []) : [])),
        ),
    });

    return { hostUsersResource };
  }),
  withComputed(({ hostUsersResource }) => ({
    isLoading: computed(() => hostUsersResource.isLoading()),
  })),
  withMethods((store) => {
    const hostApi = inject(HostApi);
    const commonService = inject(Common);
    const authStore = inject(AuthStore);
    const destroyRef = inject(DestroyRef);

    /** A host must not lock themselves out of the platform. `hostUser` hydrates
     *  asynchronously (and stays null when that call fails), so fall back to the
     *  identity the login payload carried synchronously. */
    const currentHostUserId = () => authStore.hostUser()?.id ?? authStore.sessionHost()?.hostUserId;

    const isSelf = (hostUser: HostUser) => currentHostUserId() === hostUser.id;

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        hostUsers: store
          .hostUsers()
          .map((user) => (user.id === id ? { ...user, isUpdatingStatus } : user)),
      });

    return {
      /** Lets the row menu hide the actions a host cannot run on themselves. */
      isSelf,

      reloadHostUsers(): void {
        store.hostUsersResource.reload();
      },

      /** `null` is the "All" option. A different filter invalidates the page the grid is on. */
      setStatusFilter(status: boolean | null): void {
        patchState(store, { statusFilter: status, pageNumber: 1 });
      },

      loadPage(event: TableLazyLoadEvent): void {
        const { page, rows } = commonService.getPaginationParam(event);
        patchState(store, { pageNumber: page, pageSize: rows });
      },

      deleteHostUser(hostUser: HostUser): void {
        if (isSelf(hostUser)) {
          commonService.showMessage('You cannot delete your own account.', 'error');
          return;
        }

        const body: DeleteHostUserRequest = { id: hostUser.id };

        hostApi
          .deleteHostUser(body)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              // The row leaves the list, so both the page and the total come back from the server.
              if (res.isSucceeded) {
                store.hostUsersResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => {
              commonService.showMessage(err.message, 'error');
            },
          });
      },

      /**
       * No dedicated endpoint — active/inactive flips through `update-host-user`. The page is
       * refetched because a row that stops matching the filter changes both the page and the total.
       */
      toggleActive(hostUser: HostUser): void {
        if (isSelf(hostUser)) {
          commonService.showMessage('You cannot deactivate your own account.', 'error');
          return;
        }

        const isActive = !hostUser.isActive;

        setUpdatingStatus(hostUser.id, true);

        hostApi
          .updateHostUser(toUpdateRequest(hostUser, isActive))
          .pipe(
            finalize(() => setUpdatingStatus(hostUser.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                store.hostUsersResource.reload();
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => {
              commonService.showMessage(err.message, 'error');
            },
          });
      },
    };
  }),
);

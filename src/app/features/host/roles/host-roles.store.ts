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
import { finalize, map, tap } from 'rxjs';

import { Common, HostApi } from '@core/services';
import { AuthStore } from '@core/stores';
import { DeleteHostRoleRequest, HostRole, UpdateHostRoleRequest } from '@shared/interfaces';

interface HostRolesState {
  hostRoles: HostRole[];
  /** Client-side status filter — `/Host/get-all-host-roles` takes no query params. */
  statusFilter: boolean | null;
}

const initialState: HostRolesState = {
  hostRoles: [],
  statusFilter: null,
};

const toUpdateRequest = (hostRole: HostRole, isActive: boolean): UpdateHostRoleRequest => ({
  id: hostRole.id,
  name: hostRole.name,
  description: hostRole.description,
  isActive,
});

export const HostRolesStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const hostApi = inject(HostApi);
    const commonService = inject(Common);

    const hostRolesResource = rxResource({
      stream: () =>
        hostApi.getHostRoles().pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, { hostRoles: res.isSucceeded ? (res.data ?? []) : [] });
          }),
          map((res) => res.data ?? []),
        ),
    });

    return { hostRolesResource };
  }),
  withComputed(({ hostRoles, statusFilter, hostRolesResource }) => ({
    isLoading: computed(() => hostRolesResource.isLoading()),
    filteredHostRoles: computed(() => {
      const status = statusFilter();
      return status === null ? hostRoles() : hostRoles().filter((role) => role.isActive === status);
    }),
  })),
  withMethods((store) => {
    const hostApi = inject(HostApi);
    const commonService = inject(Common);
    const authStore = inject(AuthStore);
    const destroyRef = inject(DestroyRef);

    /** A host must not delete or disable the role their own account is assigned to. */
    const isOwnRole = (hostRole: HostRole) =>
      (authStore.hostRole()?.hostRoleId ?? authStore.hostUser()?.hostRoleId) === hostRole.id;

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        hostRoles: store
          .hostRoles()
          .map((role) => (role.id === id ? { ...role, isUpdatingStatus } : role)),
      });

    return {
      /** Lets the row menu hide the actions a host cannot run on their own role. */
      isOwnRole,

      reloadHostRoles(): void {
        store.hostRolesResource.reload();
      },

      setStatusFilter(status: boolean | null): void {
        patchState(store, { statusFilter: status });
      },

      deleteHostRole(hostRole: HostRole): void {
        if (isOwnRole(hostRole)) {
          commonService.showMessage('You cannot delete your own role.', 'error');
          return;
        }

        const body: DeleteHostRoleRequest = { id: hostRole.id };

        hostApi
          .deleteHostRole(body)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, {
                  hostRoles: store.hostRoles().filter((role) => role.id !== hostRole.id),
                });
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => {
              commonService.showMessage(err.message, 'error');
            },
          });
      },

      /** No dedicated endpoint — active/inactive flips through `update-host-role`. */
      toggleActive(hostRole: HostRole): void {
        if (isOwnRole(hostRole)) {
          commonService.showMessage('You cannot deactivate your own role.', 'error');
          return;
        }

        const isActive = !hostRole.isActive;

        setUpdatingStatus(hostRole.id, true);

        hostApi
          .updateHostRole(toUpdateRequest(hostRole, isActive))
          .pipe(
            finalize(() => setUpdatingStatus(hostRole.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, {
                  hostRoles: store
                    .hostRoles()
                    .map((role) => (role.id === hostRole.id ? { ...role, isActive } : role)),
                });
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

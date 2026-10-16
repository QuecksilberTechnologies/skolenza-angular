import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { finalize } from 'rxjs';

import { Common, HostApi } from '@core/services';
import { AuthStore } from '@core/stores';
import { UpdateHostUserRequest } from '@shared/interfaces';

/** Editable slice of the signed-in host user. Role, status and login ID stay
 *  read-only — self-service must not let a host promote or lock out itself. */
export interface HostProfileModel {
  name: string;
  email: string;
  mobileNumber: string;
}

interface HostProfileState {
  isSaving: boolean;
}

const initialState: HostProfileState = {
  isSaving: false,
};

export const HostProfileStore = signalStore(
  withState(initialState),
  withComputed(() => {
    const authStore = inject(AuthStore);

    return {
      hostUser: computed(() => authStore.hostUser()),
      hostRoleName: computed(() => authStore.userPrimaryRoleName()),
      institutionName: computed(() => authStore.institutionName()),
    };
  }),
  withMethods((store) => {
    const hostApi = inject(HostApi);
    const commonService = inject(Common);
    const authStore = inject(AuthStore);
    const destroyRef = inject(DestroyRef);

    return {
      save(model: HostProfileModel): void {
        if (store.isSaving()) return;

        const hostUser = store.hostUser();
        // The record hydrates asynchronously and is left null when that call fails —
        // say so rather than letting Save do nothing.
        if (!hostUser) {
          commonService.showMessage('Your host profile is still loading. Try again.', 'error');
          return;
        }

        const patch = {
          name: model.name.trim(),
          email: model.email.trim(),
          mobileNumber: model.mobileNumber.trim(),
        };

        // `/Host/update-host-user` replaces the whole record, so the untouched
        // fields have to be sent back as they are.
        const body: UpdateHostUserRequest = {
          id: hostUser.id,
          hostRoleId: hostUser.hostRoleId,
          loginId: hostUser.loginId,
          isActive: hostUser.isActive,
          ...patch,
        };

        patchState(store, { isSaving: true });

        hostApi
          .updateHostUser(body)
          .pipe(
            finalize(() => patchState(store, { isSaving: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                authStore.updateHostUserInfo(patch);
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

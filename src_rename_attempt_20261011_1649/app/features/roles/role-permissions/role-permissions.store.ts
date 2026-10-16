import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { finalize, forkJoin } from 'rxjs';

import { Common, RolesApi, InstitutionsApi } from '@core/services';
import { PermissionSavePayload } from '@shared/components/permission-matrix/permission-matrix';
import { GetRolesReq, Role, RolePermissionEntry, InstitutionModule } from '@shared/interfaces';
import { responseApplier, settle } from '@shared/utilities/settled-response';

interface RolePermissionsState {
  role: Role | undefined;
  institutionModules: InstitutionModule[];
  rolePermissions: RolePermissionEntry[];
  isLoadingRole: boolean;
  isLoadingPermissions: boolean;
  isSaving: boolean;
}

const initialState: RolePermissionsState = {
  role: undefined,
  institutionModules: [],
  rolePermissions: [],
  isLoadingRole: false,
  isLoadingPermissions: false,
  isSaving: false,
};

export const RolePermissionsStore = signalStore(
  withState(initialState),
  withMethods((store) => {
    const rolesApi = inject(RolesApi);
    const institutionsApi = inject(InstitutionsApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    const showError = (message: string): void => commonService.showMessage(message, 'error');
    const applyResponse = responseApplier(showError);

    return {
      loadRole(roleId: number, userStaffMemberId: string): void {
        const body: GetRolesReq = {
          IsActive: true,
          PageNumber: 1,
          PageSize: 1,
          UserStaffMemberId: userStaffMemberId,
          Id: roleId,
        };

        patchState(store, { isLoadingRole: true });
        rolesApi
          .getRoles(body)
          .pipe(
            finalize(() => patchState(store, { isLoadingRole: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (!res.isSucceeded) {
                showError(res.message);
                return;
              }
              patchState(store, { role: res.data[0] });
            },
            error: (err) => showError(err.message),
          });
      },

      /**
       * The matrix needs both halves - the modules to draw and the ticks to draw on them - so the
       * one loading flag stays raised until both calls have settled. Flipping it on the modules
       * alone rendered an untouched matrix for as long as the permissions call took.
       */
      loadPermissions(roleId: number): void {
        patchState(store, { isLoadingPermissions: true });

        // Each call is caught on its own, so one failure still lets the other half land.
        forkJoin({
          operations: settle(institutionsApi.getInstitutionOperations()),
          permissions: settle(rolesApi.getRoleBasedPermissions(roleId)),
        })
          .pipe(
            finalize(() => patchState(store, { isLoadingPermissions: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe(({ operations, permissions }) => {
            applyResponse(operations, (data) => patchState(store, { institutionModules: data.modules }));
            applyResponse(permissions, (data) =>
              patchState(store, { rolePermissions: data ?? [] }),
            );
          });
      },

      savePermissions(
        roleId: number,
        payload: PermissionSavePayload,
        onSuccess?: () => void,
      ): void {
        patchState(store, { isSaving: true });
        rolesApi
          .saveRolePermissions({
            roleId,
            moduleOperations: payload.modules.map((institutionModule) => ({
              moduleId: institutionModule.moduleId,
              moduleName: institutionModule.moduleName,
              operations: institutionModule.operations.map((operation) => ({
                operationId: operation.operationId,
                operationName: operation.operationName,
                operationType: operation.operationType,
                hasAccess: operation.hasAccess,
              })),
            })),
          })
          .pipe(
            finalize(() => patchState(store, { isSaving: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (!res.isSucceeded) {
                showError(res.message);
                return;
              }

              onSuccess?.();
              commonService.showMessage('Permissions updated successfully', 'success');
            },
            error: (err) => showError(err.message),
          });
      },
    };
  }),
);

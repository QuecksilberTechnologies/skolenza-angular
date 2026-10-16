import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { finalize } from 'rxjs';

import { Common, HostApi } from '@core/services';
import { PermissionSavePayload } from '@shared/components/permission-matrix/permission-matrix';
import {
  HostRole,
  HostRoleModulePermissionRow,
  RolePermissionEntry,
  SaveHostRoleModulePermissionsRequest,
  InstitutionModule,
} from '@shared/interfaces';

/** `/HostRolePermission/get-role-module-permissions` carries no operation type, and
 *  PermissionMatrix groups its columns by one, so every host operation lands in a single group. */
const CRUD_OPERATION_TYPE = 1;

interface HostRolePermissionsState {
  hostRole: HostRole | undefined;
  hostModules: InstitutionModule[];
  rolePermissions: RolePermissionEntry[];
  isLoadingRole: boolean;
  isLoadingPermissions: boolean;
  isSaving: boolean;
}

const initialState: HostRolePermissionsState = {
  hostRole: undefined,
  hostModules: [],
  rolePermissions: [],
  isLoadingRole: false,
  isLoadingPermissions: false,
  isSaving: false,
};

/** The API already returns only the modules and operations that apply to the role, so everything
 *  it hands back is enabled as far as the matrix is concerned. */
const toMatrixModules = (modules: HostRoleModulePermissionRow[]): InstitutionModule[] =>
  modules.map((mod) => ({
    id: mod.moduleId,
    parentModuleId: 0,
    parentModuleName: '',
    moduleName: mod.moduleName,
    isEnabled: true,
    operations: mod.operations.map((op) => ({
      id: op.operationId,
      operationName: op.operationName,
      operationType: CRUD_OPERATION_TYPE,
      isEnabled: true,
    })),
  }));

/** The matrix pre-selects from flat rows matched by `moduleId` + `operationId`. */
const toPermissionEntries = (modules: HostRoleModulePermissionRow[]): RolePermissionEntry[] =>
  modules.flatMap((mod) =>
    mod.operations.map((op) => ({
      id: op.moduleOperationMappingId,
      moduleId: mod.moduleId,
      operationId: op.operationId,
      hasAccess: op.isAllowed,
      isActive: true,
    })),
  );

export const HostRolePermissionsStore = signalStore(
  withState(initialState),
  withMethods((store) => {
    const hostApi = inject(HostApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      loadHostRole(hostRoleId: number): void {
        patchState(store, { isLoadingRole: true });

        hostApi
          .getHostRoleById(hostRoleId)
          .pipe(
            finalize(() => patchState(store, { isLoadingRole: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (!res.isSucceeded) {
                commonService.showMessage(res.message, 'error');
                return;
              }
              patchState(store, { hostRole: res.data ?? undefined });
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      loadPermissions(hostRoleId: number): void {
        patchState(store, { isLoadingPermissions: true });

        hostApi
          .getHostRoleModulePermissions(hostRoleId)
          .pipe(
            finalize(() => patchState(store, { isLoadingPermissions: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (!res.isSucceeded) {
                commonService.showMessage(res.message, 'error');
                return;
              }

              const modules = res.data?.modules ?? [];
              patchState(store, {
                hostModules: toMatrixModules(modules),
                rolePermissions: toPermissionEntries(modules),
              });
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      savePermissions(
        hostRoleId: number,
        payload: PermissionSavePayload,
        onSuccess?: () => void,
      ): void {
        patchState(store, { isSaving: true });

        /** The endpoint stores the granted pairs only — revoked cells are left out. */
        const body: SaveHostRoleModulePermissionsRequest = {
          hostRoleId,
          permissions: payload.modules.flatMap((mod) =>
            mod.operations
              .filter((op) => op.hasAccess)
              .map((op) => ({ moduleId: mod.moduleId, operationId: op.operationId })),
          ),
        };

        hostApi
          .saveHostRoleModulePermissions(body)
          .pipe(
            finalize(() => patchState(store, { isSaving: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                onSuccess?.();
                commonService.showMessage('Permissions updated successfully', 'success');
              } else {
                commonService.showMessage(res.message, 'error');
              }
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);

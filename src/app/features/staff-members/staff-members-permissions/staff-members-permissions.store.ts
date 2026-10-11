import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { finalize, forkJoin } from 'rxjs';

import { Common, StaffMemberBasicAPI, StaffMembersApi, InstitutionsApi } from '@core/services';
import { PermissionSavePayload } from '@shared/components/permission-matrix/permission-matrix';
import {
  GetStaffMemberBasicReq,
  IStaffMemberBasicInfo,
  RolePermissionEntry,
  InstitutionModule,
} from '@shared/interfaces';
import { responseApplier, settle } from '@shared/utilities/settled-response';

interface StaffMembersPermissionsState {
  staffMember: IStaffMemberBasicInfo | undefined;
  institutionModules: InstitutionModule[];
  staffMemberPermissions: RolePermissionEntry[];
  isLoadingStaffMember: boolean;
  isLoadingPermissions: boolean;
  isSaving: boolean;
}

const initialState: StaffMembersPermissionsState = {
  staffMember: undefined,
  institutionModules: [],
  staffMemberPermissions: [],
  isLoadingStaffMember: false,
  isLoadingPermissions: false,
  isSaving: false,
};

export const StaffMembersPermissionsStore = signalStore(
  withState(initialState),
  withMethods((store) => {
    const staffMemberBasicAPI = inject(StaffMemberBasicAPI);
    const staffMembersApi = inject(StaffMembersApi);
    const institutionsApi = inject(InstitutionsApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    const showError = (message: string): void => commonService.showMessage(message, 'error');
    const applyResponse = responseApplier(showError);

    return {
      loadStaffMember(staffMemberId: string, userStaffMemberId: string): void {
        const body: GetStaffMemberBasicReq = {
          StaffMemberId: staffMemberId,
          UserStaffMemberId: userStaffMemberId,
        };

        patchState(store, { isLoadingStaffMember: true });
        staffMemberBasicAPI
          .getStaffMemberBasics(body)
          .pipe(
            finalize(() => patchState(store, { isLoadingStaffMember: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded && res.data?.length) {
                patchState(store, { staffMember: res.data[0] });
              } else {
                showError(res.message);
              }
            },
            error: (err) => showError(err.message),
          });
      },

      /**
       * The matrix needs both halves - the modules to draw and the ticks to draw on them - so the
       * one loading flag stays raised until both calls have settled. Flipping it on the modules
       * alone rendered an untouched matrix for as long as the permissions call took.
       */
      loadPermissions(staffMemberId: string): void {
        patchState(store, { isLoadingPermissions: true });

        // Each call is caught on its own, so one failure still lets the other half land.
        forkJoin({
          operations: settle(institutionsApi.getInstitutionOperations()),
          permissions: settle(staffMembersApi.getStaffMemberPermissions(staffMemberId)),
        })
          .pipe(
            finalize(() => patchState(store, { isLoadingPermissions: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe(({ operations, permissions }) => {
            applyResponse(operations, (data) => patchState(store, { institutionModules: data.modules }));
            applyResponse(permissions, (data) =>
              patchState(store, { staffMemberPermissions: data ?? [] }),
            );
          });
      },

      savePermissions(
        staffMemberId: string,
        payload: PermissionSavePayload,
        onSuccess?: () => void,
      ): void {
        patchState(store, { isSaving: true });
        staffMembersApi
          .saveStaffMemberPermissions({
            staffMemberId,
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

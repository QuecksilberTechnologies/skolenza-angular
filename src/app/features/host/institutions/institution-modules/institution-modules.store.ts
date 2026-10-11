import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { finalize } from 'rxjs';

import { Common, SubscriptionsApi, InstitutionsApi } from '@core/services';
import { PermissionSavePayload } from '@shared/components/permission-matrix/permission-matrix';
import { RolePermissionEntry, InstitutionModule, InstitutionOperationsData } from '@shared/interfaces';

interface InstitutionModulesState {
  /** The full catalog the matrix renders. */
  modules: InstitutionModule[];
  /** What the institution has switched on today, in the flat shape the matrix pre-selects from. */
  enabled: RolePermissionEntry[];
  isLoading: boolean;
  isSaving: boolean;
}

const initialState: InstitutionModulesState = {
  modules: [],
  enabled: [],
  isLoading: false,
  isSaving: false,
};

/** The endpoint publishes no response schema and answers with either shape. */
function toModules(data: InstitutionOperationsData | InstitutionModule[] | null): InstitutionModule[] {
  if (!data) {
    return [];
  }
  return Array.isArray(data) ? data : (data.modules ?? []);
}

/**
 * The matrix drops modules flagged `isEnabled: false`, but this screen is where they get enabled,
 * so the catalog is forced on and the saved state travels in the entry list instead.
 */
function toCatalog(modules: InstitutionModule[]): InstitutionModule[] {
  return modules.map((module) => ({ ...module, isEnabled: true }));
}

function toEntries(modules: InstitutionModule[]): RolePermissionEntry[] {
  return modules.flatMap((module) =>
    module.isEnabled
      ? module.operations
          .filter((operation) => operation.isEnabled)
          .map((operation) => ({
            id: 0,
            moduleId: module.id,
            operationId: operation.id,
            hasAccess: true,
            isActive: true,
          }))
      : [],
  );
}

export const InstitutionModulesStore = signalStore(
  withState(initialState),
  withMethods((store) => {
    const subscriptionsApi = inject(SubscriptionsApi);
    const institutionsApi = inject(InstitutionsApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      loadModules(institutionId: string): void {
        patchState(store, { isLoading: true });

        subscriptionsApi
          .getInstitutionAccessibleModules({ InstitutionId: institutionId, IsActive: true })
          .pipe(
            finalize(() => patchState(store, { isLoading: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (!res.isSucceeded) {
                commonService.showMessage(res.message, 'error');
                return;
              }
              const modules = toModules(res.data);
              patchState(store, { modules: toCatalog(modules), enabled: toEntries(modules) });
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      saveModules(institutionId: string, payload: PermissionSavePayload, onSuccess?: () => void): void {
        patchState(store, { isSaving: true });

        institutionsApi
          .updateModulesAndOperations({
            institutionId,
            modules: payload.modules.map((module) => ({
              moduleId: module.moduleId,
              isEnabled: module.operations.some((operation) => operation.hasAccess),
              operations: module.operations.map((operation) => ({
                operationId: operation.operationId,
                isEnabled: operation.hasAccess,
                // The backend keeps the two flags apart; nothing on this screen distinguishes them
                // yet, so a checked cell means both.
                isOperationUsed: operation.hasAccess,
              })),
            })),
          })
          .pipe(
            finalize(() => patchState(store, { isSaving: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                onSuccess?.();
                commonService.showMessage('Modules updated successfully', 'success');
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

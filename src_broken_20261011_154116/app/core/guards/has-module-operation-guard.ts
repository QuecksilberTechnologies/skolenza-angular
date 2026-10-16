import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthApi } from '@core/services/auth-api';
import { Common } from '@core/services/common';
import { CurrentUserPermissionsStore } from '@core/stores';

/** Operation-level gate for screens that perform a single privileged action —
 *  `hasModulePermissionGuard` only asks whether the module is reachable at all,
 *  which lets a view-only role open a screen whose whole purpose is to write. */
export const hasModuleOperationGuard = (
  moduleName: string,
  operationName: string,
): CanActivateFn => {
  return async () => {
    const permissionsStore = inject(CurrentUserPermissionsStore);
    const authApi = inject(AuthApi);
    const commonService = inject(Common);
    const router = inject(Router);

    // Wait for permissions to load so the decision can't fail open mid-fetch.
    await permissionsStore.ensureLoaded();

    if (permissionsStore.canPerform(moduleName, operationName)) {
      return true;
    }

    // A failed fetch is a transient error, not a denial — keep sending those to the dashboard.
    if (permissionsStore.hasLoadFailed()) {
      commonService.showMessage('Could not load your permissions. Please try again.', 'error');
      authApi.redirectToDashboard();
      return false;
    }

    return router.createUrlTree(['/app/access-denied'], {
      queryParams: { module: moduleName, operation: operationName },
    });
  };
};

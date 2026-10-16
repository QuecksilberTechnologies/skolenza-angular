import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthApi } from '@core/services/auth-api';
import { Common } from '@core/services/common';
import { CurrentUserPermissionsStore } from '@core/stores';

export const hasModulePermissionGuard = (moduleName: string): CanActivateFn => {
  return async () => {
    const permissionsStore = inject(CurrentUserPermissionsStore);
    const authApi = inject(AuthApi);
    const commonService = inject(Common);
    const router = inject(Router);

    // Wait for permissions to load so the decision can't fail open mid-fetch.
    await permissionsStore.ensureLoaded();

    // canAccessOrUnknown: deny only when the module IS in the catalog but has no
    // granted op. Modules the backend doesn't model (e.g. 'Roles'/'Leaves' are not
    // in institution-operations) are "unknown" → allowed, gated by roleTypeGuard instead.
    if (permissionsStore.canAccessOrUnknown(moduleName)) {
      return true;
    }

    // A failed fetch is a transient error, not a denial — keep sending those to the dashboard.
    if (permissionsStore.hasLoadFailed()) {
      commonService.showMessage('Could not load your permissions. Please try again.', 'error');
      authApi.redirectToDashboard();
      return false;
    }

    // The access-denied page names the module, so a toast on top of it would only repeat itself.
    return router.createUrlTree(['/app/access-denied'], { queryParams: { module: moduleName } });
  };
};

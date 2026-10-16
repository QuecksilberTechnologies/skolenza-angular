import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Common } from '@core/services/common';
import { CurrentUserPermissionsStore } from '@core/stores';

/** Org-wide settings are super-admin-only. Redirects to a sibling tab rather than
 *  the dashboard, so a denied user stays inside the screen they navigated to. */
export const superAdminGuard = (redirectTo: string): CanActivateFn => {
  return async () => {
    const permissionsStore = inject(CurrentUserPermissionsStore);
    const router = inject(Router);
    const commonService = inject(Common);

    // isSuperAdmin is patched inside loadFromStorage(), which ensureLoaded() awaits
    // on a cold start — so this can't race an unresolved flag and deny a super admin.
    await permissionsStore.ensureLoaded();
    if (permissionsStore.isSuperAdmin()) {
      return true;
    }

    commonService.showMessage('Only a super admin can manage these settings', 'error');
    return router.parseUrl(redirectTo);
  };
};

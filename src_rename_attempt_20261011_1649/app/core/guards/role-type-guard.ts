import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { AuthApi } from '@core/services/auth-api';
import { Common } from '@core/services/common';
import { StorageApi } from '@core/services/storage-api';
import { LoginInfo } from '@shared/interfaces';
import { resolveRoleTypeId } from '@shared/utilities/login-info';

export const roleTypeGuard = (allowedRoleTypeIds: number[]): CanActivateFn => {
  return async () => {
    const authApi = inject(AuthApi);
    const common = inject(Common);
    const storageApi = inject(StorageApi);

    const loginInfo = (await storageApi.getItem('loginInfo')) as LoginInfo | null;
    const roleTypeId = resolveRoleTypeId(loginInfo);

    if (roleTypeId != null && allowedRoleTypeIds.includes(roleTypeId)) return true;

    common.showMessage('You do not have access to this page', 'error');

    // Without a role there is no dashboard to fall back to — redirecting would
    // bounce between guarded routes, so end the session instead.
    if (roleTypeId == null) {
      await authApi.logout();
      return false;
    }

    // Redirect to the user's own dashboard so a denied role never lands on a
    // route it also can't enter (which would cause a redirect loop).
    authApi.redirectToDashboard(roleTypeId);
    return false;
  };
};

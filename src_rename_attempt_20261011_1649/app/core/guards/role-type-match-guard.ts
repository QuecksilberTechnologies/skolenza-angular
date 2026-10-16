import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';

import { StorageApi } from '@core/services/storage-api';
import { LoginInfo } from '@shared/interfaces';
import { resolveRoleTypeId } from '@shared/utilities/login-info';

/**
 * Side-effect free counterpart of `roleTypeGuard`, for routes that share a path
 * across roles. A non-match must fall through to the next route entry silently —
 * no toast, no redirect — so `roleTypeGuard` cannot be reused here.
 */
export const roleTypeMatch = (allowedRoleTypeIds: number[]): CanMatchFn => {
  return async () => {
    const storageApi = inject(StorageApi);

    const loginInfo = (await storageApi.getItem('loginInfo')) as LoginInfo | null;
    const roleTypeId = resolveRoleTypeId(loginInfo);

    return roleTypeId != null && allowedRoleTypeIds.includes(roleTypeId);
  };
};

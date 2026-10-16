import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthApi } from '@core/services/auth-api';

export const isAuthenticatedGuard: CanActivateFn = () => {
  const authApi = inject(AuthApi);
  const router = inject(Router);

  if (!authApi.isAuthenticated()) {
    router.navigate(['/auth/login']);
    return false;
  }

  return true;
};

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const requirePlanIdGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const planId = +route.queryParams['planId'] || 0;

  if (planId <= 0) {
    return router.createUrlTree(['/auth/plan']);
  }

  return true;
};

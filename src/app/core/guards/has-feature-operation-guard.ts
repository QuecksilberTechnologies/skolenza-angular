import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ModuleCodeCandidates } from '@core/feature-page-identifiers';
import { FeaturePageStore } from '@core/stores';

/** `hasModuleOperationGuard` keyed on a `my-menu` module code, with the same soft gate the page's
 *  own buttons use: `canPerformOrUnknown` lets a module the tree does not publish through, so a
 *  screen reachable from its list button stays reachable by URL. */
export const hasFeatureOperationGuard = (
  moduleCode: ModuleCodeCandidates,
  operationName: string,
): CanActivateFn => {
  return async () => {
    const featurePageStore = inject(FeaturePageStore);
    const router = inject(Router);

    // `whenLoaded()` never rejects, so the decision can't fail open mid-fetch.
    await featurePageStore.whenLoaded();

    if (featurePageStore.canPerformOrUnknown(moduleCode, operationName)) {
      return true;
    }

    return router.createUrlTree(['/app/access-denied'], {
      queryParams: { module: moduleCode, operation: operationName },
    });
  };
};

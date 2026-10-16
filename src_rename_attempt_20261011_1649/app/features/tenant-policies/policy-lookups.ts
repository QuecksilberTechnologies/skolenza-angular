import { catchError, forkJoin, from, map, Observable, of, switchMap } from 'rxjs';

import { InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { InstitutionPolicyLookups, InstitutionPolicyType } from '@shared/interfaces';

import { DEFINITIONS_MODULE_CODE, TYPES_MODULE_CODE } from './institution-policy-constants';

export interface PolicyLookups {
  /** `null` when the lookups call failed. */
  lookups: InstitutionPolicyLookups | null;
  policyTypes: InstitutionPolicyType[];
  /** Either call failed; the caller reports it in its own words. */
  failed: boolean;
}

/**
 * The policy lookups and the active Policy Types, shared by the policy list and the policy form.
 *
 * The two calls run side by side through `forkJoin` rather than one nested in the other's `tap`.
 * A nested `subscribe` outlives a component-provided store, and because `BaseService.handleError`
 * rethrows, a 403 on the policy-type lookup (a separate module grant) would surface as an
 * unhandled error. Each call is caught on its own, so one failure does not blank the other and
 * the caller can report it. `whenLoaded()` first, because `moduleOperationIds` reads an untracked
 * snapshot of the tree.
 */
export function loadPolicyLookups(
  institutionPolicyApi: InstitutionPolicyApi,
  featurePageStore: InstanceType<typeof FeaturePageStore>,
): Observable<PolicyLookups> {
  return from(featurePageStore.whenLoaded()).pipe(
    switchMap(() => {
      const definitionsIds = featurePageStore.moduleOperationIds([DEFINITIONS_MODULE_CODE], 'View');
      const typesIds = featurePageStore.moduleOperationIds([TYPES_MODULE_CODE], 'View');

      return forkJoin({
        lookups: institutionPolicyApi
          .getLookups({
            moduleId: definitionsIds.ModuleId,
            operationId: definitionsIds.OperationId,
          })
          .pipe(catchError(() => of(null))),
        types: institutionPolicyApi
          .getPolicyTypes({
            moduleId: typesIds.ModuleId,
            operationId: typesIds.OperationId,
            isActive: true,
          })
          .pipe(catchError(() => of(null))),
      });
    }),
    map(({ lookups, types }) => ({
      lookups: lookups?.isSucceeded ? lookups.data : null,
      policyTypes: types?.isSucceeded ? types.data : [],
      failed: !lookups?.isSucceeded || !types?.isSucceeded,
    })),
  );
}

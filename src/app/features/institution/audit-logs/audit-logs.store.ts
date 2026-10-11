import { computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { catchError, from, map, of, switchMap, tap } from 'rxjs';

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { InstitutionPolicyAuditEntry, InstitutionPolicyListItem } from '@shared/interfaces';

/** The list read is gated on the definitions leaf, the audit read on its own - never each other's. */
const DEFINITIONS_MODULE_CODE = 'INSTITUTION_POLICY_DEFINITIONS';
const AUDIT_MODULE_CODE = 'INSTITUTION_POLICY_AUDIT';

/** The policy picker is one un-paged call at the API's `PageSize` ceiling (1 to 100), so a institution
 *  with more policies than this only sees the first page; the API has no lookup-shaped list. */
const POLICY_PICKER_SIZE = 100;

interface AuditLogsState {
  selectedPolicyId: number | null;
}

export const AuditLogsStore = signalStore(
  withState<AuditLogsState>({ selectedPolicyId: null }),
  withProps((store) => {
    const institutionPolicyApi = inject(InstitutionPolicyApi);
    const commonService = inject(Common);
    const featurePageStore = inject(FeaturePageStore);

    const policiesResource = rxResource({
      stream: () =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [DEFINITIONS_MODULE_CODE],
              'View',
            );
            return institutionPolicyApi.getPolicies({
              moduleId: ModuleId,
              operationId: OperationId,
              pageNumber: 1,
              pageSize: POLICY_PICKER_SIZE,
            });
          }),
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
          }),
          map((res) => (res.isSucceeded ? res.data : [])),
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            return of([] as InstitutionPolicyListItem[]);
          }),
        ),
    });

    /** The user's pick, else the first policy once the list lands. */
    const activePolicyId = computed(
      () => store.selectedPolicyId() ?? policiesResource.value()?.[0]?.id ?? null,
    );

    /** Audit is keyed on the policy, not a version - it carries every version's evidence. */
    const auditResource = rxResource({
      params: () => {
        const policyId = activePolicyId();
        return policyId === null ? undefined : { policyId };
      },
      stream: ({ params }) =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [AUDIT_MODULE_CODE],
              'View',
            );
            return institutionPolicyApi.getPolicyAudit(params.policyId, {
              moduleId: ModuleId,
              operationId: OperationId,
            });
          }),
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
          }),
          map((res) => (res.isSucceeded ? res.data : [])),
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            return of([] as InstitutionPolicyAuditEntry[]);
          }),
        ),
    });

    return { policiesResource, auditResource, activePolicyId };
  }),
  withComputed((store) => ({
    policies: computed(() => store.policiesResource.value() ?? []),
    isLoadingPolicies: computed(() => store.policiesResource.isLoading()),
    audit: computed(() => store.auditResource.value() ?? []),
    /** The table waits on the policy list too: until it lands there is no policy to fetch for, and
     *  the empty state would flash in the gap. */
    isLoadingAudit: computed(
      () => store.policiesResource.isLoading() || store.auditResource.isLoading(),
    ),
  })),
  withMethods((store) => ({
    selectPolicy(policyId: number | null): void {
      patchState(store, { selectedPolicyId: policyId });
    },
  })),
);


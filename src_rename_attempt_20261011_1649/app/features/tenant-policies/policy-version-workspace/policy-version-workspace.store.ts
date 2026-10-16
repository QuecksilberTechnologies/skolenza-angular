import { computed, DestroyRef, inject } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import {
  InstitutionPolicyAcknowledgement,
  InstitutionPolicyApprovalProgress,
  InstitutionPolicyAssignment,
  InstitutionPolicyAuditEntry,
  InstitutionPolicyDetail,
  InstitutionPolicyDocument,
  InstitutionPolicyException,
  InstitutionPolicyLookupOption,
  InstitutionPolicyType,
} from '@shared/interfaces';

import {
  APPROVALS_MODULE_CODE,
  ASSIGNMENTS_MODULE_CODE,
  DEFINITIONS_MODULE_CODE,
  TYPES_MODULE_CODE,
} from '../institution-policy-constants';

/** Every tab reads through the leaf that owns its data, not through one workspace module: the
 *  five policy leaves each carry their own grant (`aside-menu-unmapped-modules.ts`). */
export const EXCEPTIONS_MODULE_CODE = 'INSTITUTION_POLICY_EXCEPTIONS';
export const ACKNOWLEDGEMENTS_MODULE_CODE = 'INSTITUTION_POLICY_ACKNOWLEDGEMENTS';
export const AUDIT_MODULE_CODE = 'INSTITUTION_POLICY_AUDIT';

export type PolicyVersionTab =
  | 'documents'
  | 'assignments'
  | 'exceptions'
  | 'acknowledgements'
  | 'approvals'
  | 'audit';

interface PolicyVersionWorkspaceState {
  policyId: number | null;
  versionId: number | null;
  activeTab: PolicyVersionTab;
}

const initialState: PolicyVersionWorkspaceState = {
  policyId: null,
  versionId: null,
  activeTab: 'documents',
};

export const PolicyVersionWorkspaceStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const institutionPolicyApi = inject(InstitutionPolicyApi);
    const commonService = inject(Common);
    const featurePageStore = inject(FeaturePageStore);

    /**
     * One tab's data at a time. A resource whose `params` return `undefined` never runs, so
     * switching tabs is what fetches — six lists on entry would spend five grants the session may
     * not even hold.
     *
     * Every read goes through `whenLoaded()` first for the same reason as
     * `policy-definitions.store.ts`: `moduleOperationIds` reads an untracked snapshot, so on a cold
     * start the ids would resolve `undefined` and the request would go out unauthorised.
     */
    const versionParams = (tab: PolicyVersionTab) => () => {
      const versionId = store.versionId();
      return versionId !== null && store.activeTab() === tab ? { versionId } : undefined;
    };

    const detailResource = rxResource({
      params: () => {
        const policyId = store.policyId();
        const versionId = store.versionId();
        return policyId !== null && versionId !== null ? { policyId, versionId } : undefined;
      },
      stream: ({ params }) =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [DEFINITIONS_MODULE_CODE],
              'View',
            );
            return institutionPolicyApi.getPolicyVersion(params.policyId, params.versionId, {
              moduleId: ModuleId,
              operationId: OperationId,
            });
          }),
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
          }),
          map((res) => (res.isSucceeded ? res.data : null)),
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            return of(null as InstitutionPolicyDetail | null);
          }),
        ),
    });

    const documentsResource = rxResource({
      params: versionParams('documents'),
      stream: ({ params }) =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [DEFINITIONS_MODULE_CODE],
              'View',
            );
            return institutionPolicyApi.getVersionDocuments(params.versionId, {
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
            return of([] as InstitutionPolicyDocument[]);
          }),
        ),
    });

    const assignmentsResource = rxResource({
      params: versionParams('assignments'),
      stream: ({ params }) =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [ASSIGNMENTS_MODULE_CODE],
              'View',
            );
            return institutionPolicyApi.getVersionAssignments(params.versionId, {
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
            return of([] as InstitutionPolicyAssignment[]);
          }),
        ),
    });

    const exceptionsResource = rxResource({
      params: versionParams('exceptions'),
      stream: ({ params }) =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [EXCEPTIONS_MODULE_CODE],
              'View',
            );
            return institutionPolicyApi.getVersionExceptions(params.versionId, {
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
            return of([] as InstitutionPolicyException[]);
          }),
        ),
    });

    const acknowledgementsResource = rxResource({
      params: versionParams('acknowledgements'),
      stream: ({ params }) =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [ACKNOWLEDGEMENTS_MODULE_CODE],
              'View',
            );
            return institutionPolicyApi.getVersionAcknowledgements(params.versionId, {
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
            return of([] as InstitutionPolicyAcknowledgement[]);
          }),
        ),
    });

    const approvalProgressResource = rxResource({
      params: versionParams('approvals'),
      stream: ({ params }) =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [APPROVALS_MODULE_CODE],
              'View',
            );
            return institutionPolicyApi.getApprovalProgress(params.versionId, {
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
            return of([] as InstitutionPolicyApprovalProgress[]);
          }),
        ),
    });

    /** Audit is keyed on the policy, not the version — it carries every version's evidence. */
    const auditResource = rxResource({
      params: () => {
        const policyId = store.policyId();
        return policyId !== null && store.activeTab() === 'audit' ? { policyId } : undefined;
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

    /** The upload dialog needs `documentTypes`, which only the lookups endpoint carries. Failure
     *  leaves the select empty rather than blocking the whole workspace. */
    const documentTypesResource = rxResource({
      stream: () =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [DEFINITIONS_MODULE_CODE],
              'View',
            );
            return institutionPolicyApi.getLookups({ moduleId: ModuleId, operationId: OperationId });
          }),
          map((res) => (res.isSucceeded ? res.data.documentTypes : [])),
          catchError(() => of([] as InstitutionPolicyLookupOption[])),
        ),
    });

    /** A separate leaf's grant, same split as `policy-definitions.store.ts`: a session may read
     *  policies without reading policy types, so a failure only costs the summary row a label. */
    const policyTypesResource = rxResource({
      stream: () =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [TYPES_MODULE_CODE],
              'View',
            );
            return institutionPolicyApi.getPolicyTypes({ moduleId: ModuleId, operationId: OperationId });
          }),
          map((res) => (res.isSucceeded ? res.data : [])),
          catchError(() => of([] as InstitutionPolicyType[])),
        ),
    });

    return {
      detailResource,
      documentsResource,
      assignmentsResource,
      exceptionsResource,
      acknowledgementsResource,
      approvalProgressResource,
      auditResource,
      documentTypesResource,
      policyTypesResource,
    };
  }),
  withComputed((store) => ({
    detail: computed(() => store.detailResource.value() ?? null),
    isLoadingDetail: computed(() => store.detailResource.isLoading()),
    documents: computed(() => store.documentsResource.value() ?? []),
    isLoadingDocuments: computed(() => store.documentsResource.isLoading()),
    assignments: computed(() => store.assignmentsResource.value() ?? []),
    isLoadingAssignments: computed(() => store.assignmentsResource.isLoading()),
    exceptions: computed(() => store.exceptionsResource.value() ?? []),
    isLoadingExceptions: computed(() => store.exceptionsResource.isLoading()),
    acknowledgements: computed(() => store.acknowledgementsResource.value() ?? []),
    isLoadingAcknowledgements: computed(() => store.acknowledgementsResource.isLoading()),
    approvalProgress: computed(() => store.approvalProgressResource.value() ?? []),
    isLoadingApprovalProgress: computed(() => store.approvalProgressResource.isLoading()),
    audit: computed(() => store.auditResource.value() ?? []),
    isLoadingAudit: computed(() => store.auditResource.isLoading()),
    /** Fed to the upload dialog; the workspace itself never renders them. */
    documentTypes: computed(() => store.documentTypesResource.value() ?? []),
    /** Only to name the version's own policy type - the workspace edits no types. */
    policyTypes: computed(() => store.policyTypesResource.value() ?? []),
  })),
  withMethods((store) => {
    const institutionPolicyApi = inject(InstitutionPolicyApi);
    const commonService = inject(Common);
    const featurePageStore = inject(FeaturePageStore);
    const destroyRef = inject(DestroyRef);

    return {
      setContext(policyId: number, versionId: number): void {
        // `detailResource` keys on the policy alone, because `GET /{policyId}` is the only detail
        // endpoint there is. A clone navigates to a new version under the *same* policy, so its
        // params never change and the cached detail would keep naming the version cloned from —
        // which now also decides whether this version's actions are offered.
        const movedToAnotherVersion =
          store.policyId() === policyId && store.versionId() !== versionId;

        patchState(store, { policyId, versionId });

        if (movedToAnotherVersion) store.detailResource.reload();
      },

      setActiveTab(activeTab: PolicyVersionTab): void {
        patchState(store, { activeTab });
      },

      reloadDocuments(): void {
        store.documentsResource.reload();
      },

      reloadAssignments(): void {
        store.assignmentsResource.reload();
      },

      reloadExceptions(): void {
        store.exceptionsResource.reload();
      },

      deleteDocument(documentId: number): void {
        const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
          [DEFINITIONS_MODULE_CODE],
          'Delete',
        );

        institutionPolicyApi
          .deleteDocument(documentId, { moduleId: ModuleId, operationId: OperationId })
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) store.documentsResource.reload();
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      removeAssignment(assignmentId: number): void {
        const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
          [ASSIGNMENTS_MODULE_CODE],
          'Remove',
        );

        institutionPolicyApi
          .removeAssignment(assignmentId, { moduleId: ModuleId, operationId: OperationId })
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) store.assignmentsResource.reload();
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      decideException(exceptionId: number, approve: boolean): void {
        const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
          [EXCEPTIONS_MODULE_CODE],
          approve ? 'Approve' : 'Reject',
        );

        institutionPolicyApi
          .decideException(exceptionId, {
            moduleId: ModuleId,
            operationId: OperationId,
            approve,
          })
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) store.exceptionsResource.reload();
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      /** Records the *signed-in* staffMember's acknowledgement - the API takes the staffMember from the
       *  token, so this is never an admin acknowledging on someone else's behalf. */
      acknowledge(): void {
        const versionId = store.versionId();
        if (versionId === null) return;

        const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
          [ACKNOWLEDGEMENTS_MODULE_CODE],
          'Acknowledge',
        );

        institutionPolicyApi
          .acknowledgePolicy({
            moduleId: ModuleId,
            operationId: OperationId,
            policyVersionId: versionId,
            evidenceJson: JSON.stringify({ acceptedFrom: 'WEB' }),
          })
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) store.acknowledgementsResource.reload();
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);


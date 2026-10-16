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
import { catchError, finalize, from, map, of, switchMap, tap } from 'rxjs';

import { Common, DesignationsApi, InstitutionLocationApi, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import {
  CreateInstitutionPolicyRequest,
  IDesignation,
  InstitutionLocationRow,
  InstitutionPolicyDetail,
  InstitutionPolicyLeaveType,
  InstitutionPolicyLookupOption,
  InstitutionPolicyRuleDefinition,
  InstitutionPolicyType,
} from '@shared/interfaces';

import { loadPolicyLookups } from '../../policy-lookups';
import {
  DEFINITIONS_MODULE_CODE,
  EDITABLE_STATUSES,
  hasStatus,
} from '../../institution-policy-constants';

/** A separate leaf, for the institution-location filter — see the same split in
 *  `policy-definitions.store.ts` for the policy-type lookup. */
const LOCATIONS_MODULE_CODE = 'INSTITUTION_CAMPUSES';

/** The exact version an edit opens: the list row's `currentVersionId`, which a newer Draft owns. */
export interface PolicyVersionTarget {
  policyId: number;
  versionId: number;
}

interface PolicyDefinitionFormState {
  isSaving: boolean;
  /** Fetching the lookups, and for an edit the version's detail, before the fields can render. */
  isLoading: boolean;
  /** Set by `loadForEdit`; `undefined` means the page creates a policy. */
  policyId: number | undefined;
  /** Set only once the detail loaded and passed the editable-status check. */
  versionId: number | undefined;
  policyTypes: InstitutionPolicyType[];
  ruleTypes: InstitutionPolicyLookupOption[];
  ruleDefinitions: InstitutionPolicyRuleDefinition[];
  /** Backend enum-derived options; Policy Definition never owns a second numeric mapping. */
  attendanceLocationScopes: InstitutionPolicyLookupOption[];
  leaveTypes: InstitutionPolicyLeaveType[];
}

const initialState: PolicyDefinitionFormState = {
  isSaving: false,
  isLoading: false,
  policyId: undefined,
  versionId: undefined,
  policyTypes: [],
  ruleTypes: [],
  ruleDefinitions: [],
  attendanceLocationScopes: [],
  leaveTypes: [],
};

export const PolicyDefinitionFormStore = signalStore(
  withState(initialState),
  withProps(() => {
    const institutionLocationApi = inject(InstitutionLocationApi);
    const designationsApi = inject(DesignationsApi);
    const featurePageStore = inject(FeaturePageStore);
    const commonService = inject(Common);

    /** Cached so the designations lookup and the location cascade share one login read. A failed
     *  read is dropped from the cache so the next caller retries. */
    let userStaffMemberId: Promise<string> | undefined;
    const getUserStaffMemberId = (): Promise<string> =>
      (userStaffMemberId ??= commonService
        .getLoginInfo()
        .then((loginInfo) => loginInfo?.user?.staffMemberId || '0')
        .catch((err: unknown) => {
          userStaffMemberId = undefined;
          throw err;
        }));

    /** Every read goes through `whenLoaded()` first for the same reason as
     *  `policy-definitions.store.ts`: `moduleOperationIds` reads an untracked snapshot. */
    const institutionLocationsResource = rxResource({
      stream: () =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [LOCATIONS_MODULE_CODE],
              'View',
            );
            return institutionLocationApi.getInstitutionLocations({
              ModuleId,
              OperationId,
              IsActive: true,
              PageSize: 500,
            });
          }),
          map((res) => (res.isSucceeded ? res.data : [])),
          // Locations are one optional applicability filter among many, and this is a separate
          // module grant: leave the select empty rather than fail the whole form. Without this
          // handler the rethrow from `BaseService.handleError` reaches `GlobalErrorHandler`.
          catchError(() => of([] as InstitutionLocationRow[])),
        ),
    });

    /** Institution-wide, fetched once — unlike states and districts it does not hang off a row's own
     *  selection. Left unfiltered by department: an applicability row may target a designation
     *  without also naming its department. */
    const designationsResource = rxResource({
      stream: () =>
        from(getUserStaffMemberId()).pipe(
          switchMap((UserStaffMemberId) =>
            designationsApi.getDesignationOptions({ UserStaffMemberId, IsActive: true }),
          ),
          map((res) => (res.isSucceeded ? res.data : [])),
          // One optional filter among many — an empty select beats failing the whole form, same
          // call as `institutionLocationsResource`.
          catchError(() => of([] as IDesignation[])),
        ),
    });

    return { getUserStaffMemberId, institutionLocationsResource, designationsResource };
  }),
  withComputed(({ institutionLocationsResource, designationsResource }) => ({
    institutionLocations: computed(() => institutionLocationsResource.value() ?? []),
    designations: computed(() => designationsResource.value() ?? []),
    isLoadingDesignations: computed(() => designationsResource.isLoading()),
    isLoadingInstitutionLocations: computed(() => institutionLocationsResource.isLoading()),
  })),
  withMethods((store) => {
    const institutionPolicyApi = inject(InstitutionPolicyApi);
    const featurePageStore = inject(FeaturePageStore);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Both modes need the options; edit also applies a detail that reads the policy types to know
     *  which category it belongs to, so the lookups always land first. */
    const lookups$ = () =>
      loadPolicyLookups(institutionPolicyApi, featurePageStore).pipe(
        tap(({ lookups, policyTypes, failed }) => {
          patchState(store, {
            ruleTypes: lookups?.ruleTypes ?? [],
            ruleDefinitions: lookups?.ruleDefinitions ?? [],
            attendanceLocationScopes: lookups?.attendanceLocationScopes ?? [],
            leaveTypes: lookups?.leaveTypes ?? [],
            policyTypes,
          });

          if (failed) {
            commonService.showMessage(
              'Some form options could not be loaded. Refresh the page to try again.',
              'error',
            );
          }
        }),
      );

    return {
      loadForCreate(): void {
        patchState(store, { isLoading: true });
        lookups$()
          .pipe(
            finalize(() => patchState(store, { isLoading: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe();
      },

      /** The form model stays a component signal for Signal Forms, so the component applies the
       *  detail itself rather than mirroring store state through an `effect`. */
      loadForEdit(
        target: PolicyVersionTarget,
        handlers: {
          onLoaded: (detail: InstitutionPolicyDetail) => void;
          onError: (message: string) => void;
        },
      ): void {
        patchState(store, { policyId: target.policyId, isLoading: true });
        lookups$()
          .pipe(
            switchMap(() => {
              const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
                [DEFINITIONS_MODULE_CODE],
                'View',
              );
              return institutionPolicyApi.getPolicyVersion(target.policyId, target.versionId, {
                moduleId: ModuleId,
                operationId: OperationId,
              });
            }),
            finalize(() => patchState(store, { isLoading: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (!res.isSucceeded) {
                handlers.onError(res.message);
                return;
              }
              // `policy-definitions.ts` already hides Edit outside these statuses, but a cached list
              // row can be stale by the time this fetch resolves, so it re-checks.
              if (!hasStatus(EDITABLE_STATUSES, res.data.status)) {
                handlers.onError(
                  `${res.data.name} is ${res.data.status} and can no longer be edited.`,
                );
                return;
              }
              patchState(store, { versionId: res.data.versionId });
              handlers.onLoaded(res.data);
            },
            error: (err) => handlers.onError(err.message),
          });
      },

      /** The caller guards on `isSaving` before building `body`. */
      save(body: CreateInstitutionPolicyRequest, onSaved: () => void) {
        const policyId = store.policyId();
        const versionId = store.versionId();

        let request$;
        if (policyId === undefined) {
          request$ = institutionPolicyApi.createPolicy(body);
        } else if (versionId === undefined) {
          // Never fall through to a create: that would duplicate the policy being edited.
          commonService.showMessage(
            'This policy could not be loaded for editing. Go back to the policy list and try again.',
            'error',
          );
          return;
        } else {
          request$ = institutionPolicyApi.updatePolicy(policyId, versionId, body);
        }

        patchState(store, { isSaving: true });
        request$
          .pipe(
            finalize(() => patchState(store, { isSaving: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
              if (res.isSucceeded) onSaved();
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);


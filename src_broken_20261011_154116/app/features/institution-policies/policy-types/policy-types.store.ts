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

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { InstitutionPolicyLookupOption, InstitutionPolicyType } from '@shared/interfaces';

/** The only leaf module this screen resolves `moduleId`/`operationId` against. */
const MODULE_CODE = 'INSTITUTION_POLICY_TYPES';

interface PolicyTypesState {
  policyTypes: InstitutionPolicyType[];
  categories: InstitutionPolicyLookupOption[];
  isActive: boolean | null;
}

const initialState: PolicyTypesState = {
  policyTypes: [],
  categories: [],
  isActive: null,
};

export const PolicyTypesStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const institutionPolicyApi = inject(InstitutionPolicyApi);
    const commonService = inject(Common);
    const featurePageStore = inject(FeaturePageStore);

    /** `/types` takes no paging, so the status filter is a server round trip and search stays
     *  client-side against whatever the filter already returned. */
    const policyTypesResource = rxResource({
      params: () => ({ isActive: store.isActive() }),
      /** `moduleOperationIds` reads an untracked snapshot of the tree, so the ids resolve only
       *  once `my-menu` is in hand: on a cold start with no cached tree they would otherwise be
       *  `undefined` and this list would go out unauthorised, with nothing to refetch it. */
      stream: ({ params }) =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [MODULE_CODE],
              'View',
            );

            return institutionPolicyApi.getPolicyTypes({
              moduleId: ModuleId,
              operationId: OperationId,
              isActive: params.isActive,
            });
          }),
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            patchState(store, { policyTypes: res.isSucceeded ? res.data : [] });
          }),
          map((res) => res.data),
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { policyTypes: [] });
            return of([] as InstitutionPolicyType[]);
          }),
        ),
    });

    /** Categories rarely change within a session: loaded once, never reloaded. A failure is
     *  reported rather than swallowed: without categories the Category column reads `-` on every
     *  row and the manage dialog's required Category select has no options at all. */
    const categoriesResource = rxResource({
      stream: () =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [MODULE_CODE],
              'View',
            );

            return institutionPolicyApi.getLookups({ moduleId: ModuleId, operationId: OperationId });
          }),
          tap((res) => {
            patchState(store, { categories: res.isSucceeded ? res.data.categories : [] });
          }),
          map((res) => res.data.categories),
          catchError(() => {
            commonService.showMessage(
              'Policy categories could not be loaded. Refresh the page to try again.',
              'error',
            );
            patchState(store, { categories: [] });
            return of([] as InstitutionPolicyLookupOption[]);
          }),
        ),
    });

    return { policyTypesResource, categoriesResource };
  }),
  withComputed(({ policyTypesResource }) => ({
    isLoading: computed(() => policyTypesResource.isLoading()),
  })),
  withMethods((store) => {
    const institutionPolicyApi = inject(InstitutionPolicyApi);
    const commonService = inject(Common);
    const featurePageStore = inject(FeaturePageStore);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the Active/Inactive toggle. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        policyTypes: store.policyTypes().map((p) => (p.id === id ? { ...p, isUpdatingStatus } : p)),
      });

    return {
      setIsActive(isActive: boolean | null): void {
        patchState(store, { isActive });
      },

      reloadPolicyTypes(): void {
        store.policyTypesResource.reload();
      },

      /**
       * A dedicated status endpoint, unlike Departments/Designations/Report Types: the operation
       * granted for it flips with direction, `Active` to activate and `Inactive` to deactivate, the
       * same split the my-menu payload already carries for this module.
       */
      togglePolicyTypeStatus(policyType: InstitutionPolicyType): void {
        const nextIsActive = !policyType.isActive;
        const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
          [MODULE_CODE],
          nextIsActive ? 'Active' : 'Inactive',
        );

        setUpdatingStatus(policyType.id, true);

        institutionPolicyApi
          .updatePolicyTypeStatus(policyType.id, {
            moduleId: ModuleId,
            operationId: OperationId,
            isActive: nextIsActive,
          })
          .pipe(
            finalize(() => setUpdatingStatus(policyType.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, {
                  policyTypes: store
                    .policyTypes()
                    .map((p) => (p.id === policyType.id ? { ...p, isActive: nextIsActive } : p)),
                });
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);


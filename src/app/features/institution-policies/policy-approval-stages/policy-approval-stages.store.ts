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

import { Common, RolesApi, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import { Role, InstitutionPolicyApprovalStage, InstitutionPolicyLookupOption } from '@shared/interfaces';

import { APPROVALS_MODULE_CODE } from '../institution-policy-constants';

interface PolicyApprovalStagesState {
  categories: InstitutionPolicyLookupOption[];
  roles: Role[];
  policyCategoryId: number | null;
  isActive: boolean | null;
}

const initialState: PolicyApprovalStagesState = {
  categories: [],
  roles: [],
  policyCategoryId: null,
  isActive: null,
};

export const PolicyApprovalStagesStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const institutionPolicyApi = inject(InstitutionPolicyApi);
    const rolesApi = inject(RolesApi);
    const commonService = inject(Common);
    const featurePageStore = inject(FeaturePageStore);

    /** Both filters are server side: `/approval-stages` takes no paging and no search, so the whole
     *  filtered set comes back and the search box filters it client side. */
    const stagesResource = rxResource({
      params: () => ({ policyCategoryId: store.policyCategoryId(), isActive: store.isActive() }),
      /** `moduleOperationIds` reads an untracked snapshot, so the ids resolve only once `my-menu`
       *  is in hand — without `whenLoaded()` a cold start would go out unauthorised. */
      stream: ({ params }) =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [APPROVALS_MODULE_CODE],
              'View',
            );

            return institutionPolicyApi.getApprovalStages({
              moduleId: ModuleId,
              operationId: OperationId,
              policyCategoryId: params.policyCategoryId,
              isActive: params.isActive ?? undefined,
            });
          }),
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
          }),
          map((res) => (res.isSucceeded ? res.data : [])),
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            return of([] as InstitutionPolicyApprovalStage[]);
          }),
        ),
    });

    /** Categories scope a stage. A failure is reported rather than swallowed: without them the
     *  Category column reads `—` on every row and the filter has nothing to offer. */
    const categoriesResource = rxResource({
      stream: () =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [APPROVALS_MODULE_CODE],
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

    /** `Role/option` scopes its list to the signed-in staffMember, so it waits on the login info. */
    const rolesResource = rxResource({
      stream: () =>
        from(commonService.getLoginInfo()).pipe(
          switchMap((loginInfo) =>
            rolesApi.getRoleOptions({
              UserStaffMemberId: loginInfo?.user?.staffMemberId ?? '',
              IsActive: true,
            }),
          ),
          map((res) => (res.isSucceeded ? res.data : [])),
          tap((roles) => patchState(store, { roles })),
          catchError(() => {
            commonService.showMessage(
              'Roles could not be loaded. Refresh the page to try again.',
              'error',
            );
            patchState(store, { roles: [] });
            return of([] as Role[]);
          }),
        ),
    });

    return { stagesResource, categoriesResource, rolesResource };
  }),
  withComputed(({ stagesResource }) => ({
    stages: computed(() => stagesResource.value() ?? []),
    isLoading: computed(() => stagesResource.isLoading()),
  })),
  withMethods((store) => {
    const institutionPolicyApi = inject(InstitutionPolicyApi);
    const commonService = inject(Common);
    const featurePageStore = inject(FeaturePageStore);
    const destroyRef = inject(DestroyRef);

    return {
      setPolicyCategoryId(policyCategoryId: number | null): void {
        patchState(store, { policyCategoryId });
      },

      setIsActive(isActive: boolean | null): void {
        patchState(store, { isActive });
      },

      reloadStages(): void {
        store.stagesResource.reload();
      },

      /** The API disables the stage rather than deleting it, so versions already routed through it
       *  keep their approval history. */
      disableStage(stage: InstitutionPolicyApprovalStage): void {
        const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
          [APPROVALS_MODULE_CODE],
          'Delete',
        );

        institutionPolicyApi
          .deleteApprovalStage(stage.id, { moduleId: ModuleId, operationId: OperationId })
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) store.stagesResource.reload();
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);

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
import { TableLazyLoadEvent } from '@openng/optimus-ui/table';
import { catchError, from, map, of, switchMap, tap } from 'rxjs';

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import {
  IInstitutionPolicyFilter,
  SettledSearchTerm,
  INSTITUTION_POLICY_LIFECYCLE_OPERATION_NAME,
  InstitutionPolicyLifecycleAction,
  InstitutionPolicyListItem,
  InstitutionPolicyLookupOption,
  InstitutionPolicyType,
} from '@shared/interfaces';

import { loadPolicyLookups } from '../policy-lookups';
import { DEFINITIONS_MODULE_CODE, LIFECYCLE_MODULE_CODE } from '../institution-policy-constants';

interface PolicyDefinitionsState {
  policies: InstitutionPolicyListItem[];
  totalRecords: number;
  pageNumber: number;
  pageSize: number;
  sortBy: string | string[] | null | undefined;
  sortOrder: string | null;
  appliedFilters: IInstitutionPolicyFilter | null;
  /** Already debounced and whitespace-normalised by `TableSearchInput`. */
  search: string;
  policyTypes: InstitutionPolicyType[];
  statuses: InstitutionPolicyLookupOption[];
}

const initialState: PolicyDefinitionsState = {
  policies: [],
  totalRecords: 0,
  pageNumber: 1,
  pageSize: 10,
  sortBy: undefined,
  sortOrder: 'desc',
  appliedFilters: null,
  search: '',
  policyTypes: [],
  statuses: [],
};

export const PolicyDefinitionsStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const institutionPolicyApi = inject(InstitutionPolicyApi);
    const commonService = inject(Common);
    const featurePageStore = inject(FeaturePageStore);

    const policiesResource = rxResource({
      params: () => ({
        pageNumber: store.pageNumber(),
        pageSize: store.pageSize(),
        filters: store.appliedFilters(),
        search: store.search(),
      }),
      /**
       * `moduleOperationIds` reads an untracked snapshot of the tree, so the ids have to resolve
       * *after* `my-menu` is in hand: on a cold start with no cached tree they would otherwise come
       * back `undefined` and this list would go out unauthorised, with nothing to trigger a
       * refetch. `whenLoaded()` de-dupes the whole first wave onto one request and never rejects.
       */
      stream: ({ params }) =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [DEFINITIONS_MODULE_CODE],
              'View',
            );

            return institutionPolicyApi.getPolicies({
              moduleId: ModuleId,
              operationId: OperationId,
              pageNumber: params.pageNumber,
              pageSize: params.pageSize,
              policyTypeId: params.filters?.policyTypeId ?? undefined,
              statusId: params.filters?.statusId ?? undefined,
              search: params.search || undefined,
            });
          }),
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            patchState(store, {
              policies: res.isSucceeded ? res.data : [],
              totalRecords: res.isSucceeded ? res.totalRecords : 0,
            });
          }),
          map((res) => res.data),
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { policies: [], totalRecords: 0 });
            return of([] as InstitutionPolicyListItem[]);
          }),
        ),
    });

    /** Loaded once: the policy-type and status filters rarely change within a session. A failure
     *  is reported instead of leaving empty filters unexplained. */
    const filterLookupsResource = rxResource({
      stream: () =>
        loadPolicyLookups(institutionPolicyApi, featurePageStore).pipe(
          tap(({ lookups, policyTypes, failed }) => {
            patchState(store, { statuses: lookups?.statuses ?? [], policyTypes });

            if (failed) {
              commonService.showMessage(
                'Some filter options could not be loaded. Refresh the page to try again.',
                'error',
              );
            }
          }),
        ),
    });

    return { policiesResource, filterLookupsResource };
  }),
  withComputed(({ policiesResource }) => ({
    isLoading: computed(() => policiesResource.isLoading()),
  })),
  withMethods((store) => {
    const institutionPolicyApi = inject(InstitutionPolicyApi);
    const commonService = inject(Common);
    const featurePageStore = inject(FeaturePageStore);
    const destroyRef = inject(DestroyRef);

    return {
      loadPolicies(event: TableLazyLoadEvent, filters?: IInstitutionPolicyFilter | null): void {
        const rows = event.rows || store.pageSize();
        const page = Math.floor((event.first || 0) / rows) + 1;

        patchState(store, {
          pageNumber: page,
          pageSize: rows,
          ...(filters !== undefined ? { appliedFilters: filters ?? null } : {}),
        });
      },

      /** A new term invalidates the page the grid is on. */
      setSearch(search: SettledSearchTerm): void {
        patchState(store, { search, pageNumber: 1 });
      },

      reloadFirstPage(): void {
        if (store.pageNumber() === 1) {
          store.policiesResource.reload();
        } else {
          patchState(store, { pageNumber: 1 });
        }
      },

      transitionPolicy(versionId: number, action: InstitutionPolicyLifecycleAction): void {
        const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
          [LIFECYCLE_MODULE_CODE[action]],
          INSTITUTION_POLICY_LIFECYCLE_OPERATION_NAME[action],
        );

        institutionPolicyApi
          .transitionPolicyVersion(versionId, {
            moduleId: ModuleId,
            operationId: OperationId,
            policyVersionId: versionId,
            action,
          })
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) store.policiesResource.reload();
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);


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
import {
  catchError,
  EMPTY,
  expand,
  forkJoin,
  from,
  map,
  mergeMap,
  Observable,
  of,
  reduce,
  switchMap,
  tap,
  toArray,
} from 'rxjs';

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import {
  GetInstitutionPoliciesResponse,
  SettledSearchTerm,
  InstitutionPolicyContextRequest,
  InstitutionPolicyListItem,
} from '@shared/interfaces';
import { toDateKey } from '@shared/utilities/date-key';

import {
  DEFINITIONS_MODULE_CODE,
  hasStatus,
  TYPES_MODULE_CODE,
} from '../../../institution-policies/institution-policy-constants';
import {
  hasActiveFilters,
  matchesFilters,
  policyYears,
  PublishedPolicy,
  PublishedPolicyFilters,
} from './staff-member-policy-info.model';

/** Every page is fetched, so the version and year filters can stay local. */
const POLICY_PAGE_SIZE = 100;
/** Caps the parallel version-detail calls one load fans out into. */
const DETAIL_CONCURRENCY = 4;

type StaffMemberPolicyInfoState = PublishedPolicyFilters;

const initialState: StaffMemberPolicyInfoState = {
  search: '',
  versionNumber: null,
  year: null,
};

export const StaffMemberPolicyInfoStore = signalStore(
  withState(initialState),
  withProps(() => {
    const institutionPolicyApi = inject(InstitutionPolicyApi);
    const commonService = inject(Common);
    const featurePageStore = inject(FeaturePageStore);

    /** With `statusId` the API pairs each policy with its newest version in that status, so
     *  `currentVersionId` is the Published version even when a newer Draft sits on top. */
    const getAllPublished = (
      context: InstitutionPolicyContextRequest,
      statusId: number,
    ): Observable<InstitutionPolicyListItem[]> => {
      const getPage = (pageNumber: number) =>
        institutionPolicyApi.getPolicies({
          ...context,
          pageNumber,
          pageSize: POLICY_PAGE_SIZE,
          statusId,
        });
      const isLastPage = (res: GetInstitutionPoliciesResponse) => {
        if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
        return !res.isSucceeded || !(res.pageNumber < res.totalPages);
      };

      return getPage(1).pipe(
        expand((res) => (isLastPage(res) ? EMPTY : getPage(res.pageNumber + 1))),
        reduce(
          (items, res) => (res.isSucceeded ? [...items, ...res.data] : items),
          [] as InstitutionPolicyListItem[],
        ),
      );
    };

    /** The list DTO carries no effective dates, so each row reads its version detail. A failed
     *  detail keeps the row undated; the caller reports it. */
    const toPublishedPolicy = (
      item: InstitutionPolicyListItem,
      typeNames: Map<number, string>,
      context: InstitutionPolicyContextRequest,
    ): Observable<PublishedPolicy> => {
      const base: PublishedPolicy = {
        policyId: item.id,
        versionId: item.currentVersionId,
        versionNumber: item.versionNumber,
        code: item.code,
        name: item.name,
        policyTypeName: typeNames.get(item.policyTypeId) ?? '',
        effectiveFrom: null,
        effectiveTo: null,
      };

      return institutionPolicyApi.getPolicyVersion(item.id, item.currentVersionId, context).pipe(
        map((res) =>
          res.isSucceeded
            ? {
                ...base,
                effectiveFrom: toDateKey(res.data.effectiveFrom),
                effectiveTo: res.data.effectiveTo ? toDateKey(res.data.effectiveTo) : null,
              }
            : base,
        ),
        catchError(() => of(base)),
      );
    };

    const policiesResource = rxResource({
      defaultValue: [] as PublishedPolicy[],
      stream: () =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const definitionsIds = featurePageStore.moduleOperationIds(
              [DEFINITIONS_MODULE_CODE],
              'View',
            );
            const typesIds = featurePageStore.moduleOperationIds([TYPES_MODULE_CODE], 'View');
            const context: InstitutionPolicyContextRequest = {
              moduleId: definitionsIds.ModuleId,
              operationId: definitionsIds.OperationId,
            };

            return forkJoin({
              lookups: institutionPolicyApi.getLookups(context).pipe(catchError(() => of(null))),
              types: institutionPolicyApi
                .getPolicyTypes({ moduleId: typesIds.ModuleId, operationId: typesIds.OperationId })
                .pipe(catchError(() => of(null))),
            }).pipe(
              switchMap(({ lookups, types }) => {
                const statusId = lookups?.isSucceeded
                  ? lookups.data.statuses.find((status) => hasStatus(['Published'], status.name))
                      ?.id
                  : undefined;
                // Unfiltered, the list pairs each policy with its newest version, which can be a
                // Draft. Showing nothing is safer than offering a Draft to map.
                if (statusId === undefined) {
                  commonService.showMessage(
                    'Could not load the policy statuses. Refresh to try again.',
                    'error',
                  );
                  return of([] as PublishedPolicy[]);
                }

                const typeNames = new Map(
                  (types?.isSucceeded ? types.data : []).map((type) => [type.id, type.name]),
                );
                return getAllPublished(context, statusId).pipe(
                  switchMap((items) => from(items)),
                  mergeMap(
                    (item) => toPublishedPolicy(item, typeNames, context),
                    DETAIL_CONCURRENCY,
                  ),
                  toArray(),
                  tap((policies) => {
                    if (policies.some((policy) => !policy.effectiveFrom)) {
                      commonService.showMessage(
                        'Some policy dates could not be loaded. Refresh to try again.',
                        'error',
                      );
                    }
                  }),
                );
              }),
            );
          }),
          map((policies) => [...policies].sort((a, b) => a.name.localeCompare(b.name))),
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            return of([] as PublishedPolicy[]);
          }),
        ),
    });

    return { policiesResource };
  }),
  withComputed((store) => {
    const filters = computed<PublishedPolicyFilters>(() => ({
      search: store.search(),
      versionNumber: store.versionNumber(),
      year: store.year(),
    }));

    return {
      isLoading: computed(() => store.policiesResource.isLoading()),
      policies: computed(() => store.policiesResource.value()),
      versionOptions: computed(() =>
        [...new Set(store.policiesResource.value().map((policy) => policy.versionNumber))]
          .sort((a, b) => a - b)
          .map((version) => ({ label: `Version ${version}`, value: version })),
      ),
      yearOptions: computed(() =>
        policyYears(store.policiesResource.value(), new Date().getFullYear()).map((year) => ({
          label: `${year}`,
          value: year,
        })),
      ),
      hasFilters: computed(() => hasActiveFilters(filters())),
      filteredPolicies: computed(() =>
        store.policiesResource.value().filter((policy) => matchesFilters(policy, filters())),
      ),
    };
  }),
  withMethods((store) => ({
    setSearch(search: SettledSearchTerm): void {
      patchState(store, { search });
    },
    setVersionNumber(versionNumber: number | null): void {
      patchState(store, { versionNumber });
    },
    setYear(year: number | null): void {
      patchState(store, { year });
    },
    reload(): void {
      store.policiesResource.reload();
    },
  })),
);

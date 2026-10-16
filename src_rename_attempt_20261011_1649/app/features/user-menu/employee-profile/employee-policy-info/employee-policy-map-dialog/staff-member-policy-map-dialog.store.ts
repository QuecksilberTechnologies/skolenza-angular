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
import { DynamicDialogConfig } from '@openng/optimus-ui/dynamicdialog';
import { catchError, finalize, from, map, of, switchMap } from 'rxjs';

import { Common, InstitutionPolicyApi } from '@core/services';
import { FeaturePageStore } from '@core/stores';
import {
  NO_SEARCH_TERM,
  SettledSearchTerm,
  InstitutionPolicyAssignmentCandidate,
  InstitutionPolicyAssignmentCandidatePage,
} from '@shared/interfaces';
import { localDateKey } from '@shared/utilities/date-key';

import { ASSIGNMENTS_MODULE_CODE } from '../../../../institution-policies/institution-policy-constants';
import { StaffMemberPolicyMapDialogData } from '../staffMember-policy-info.model';

/** The API's cap. Past it the reader narrows the list by search or department. */
const CANDIDATE_PAGE_CAP = 200;

interface StaffMemberPolicyMapDialogState {
  search: SettledSearchTerm;
  departmentId: number | null;
  locationId: number | null;
  /** Whole rows, not ids, so a pick survives a search that no longer returns it. */
  selected: InstitutionPolicyAssignmentCandidate[];
  isSaving: boolean;
}

const initialState: StaffMemberPolicyMapDialogState = {
  search: NO_SEARCH_TERM,
  departmentId: null,
  locationId: null,
  selected: [],
  isSaving: false,
};

/** A future version maps from its own start; a running one from today. */
const mappingStart = (policyStart: string | null, today: string): string =>
  policyStart && policyStart > today ? policyStart : today;

export const StaffMemberPolicyMapDialogStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const institutionPolicyApi = inject(InstitutionPolicyApi);
    const commonService = inject(Common);
    const featurePageStore = inject(FeaturePageStore);
    const { policy } = inject(DynamicDialogConfig).data as StaffMemberPolicyMapDialogData;
    const effectiveFrom = mappingStart(policy.effectiveFrom, localDateKey());

    const candidatesResource = rxResource({
      params: () => ({
        search: store.search(),
        departmentId: store.departmentId(),
        locationId: store.locationId(),
      }),
      stream: ({ params }) =>
        from(featurePageStore.whenLoaded()).pipe(
          switchMap(() => {
            const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
              [ASSIGNMENTS_MODULE_CODE],
              'View',
            );
            return institutionPolicyApi.getAssignmentCandidates(policy.versionId, {
              moduleId: ModuleId,
              operationId: OperationId,
              effectiveDate: effectiveFrom,
              departmentId: params.departmentId,
              locationId: params.locationId,
              search: params.search || undefined,
              includeAssigned: true,
              pageNumber: 1,
              pageSize: CANDIDATE_PAGE_CAP,
            });
          }),
          map((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            return res.isSucceeded ? res.data : null;
          }),
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            return of(null as InstitutionPolicyAssignmentCandidatePage | null);
          }),
        ),
    });

    return { policy, effectiveFrom, candidatesResource };
  }),
  withComputed((store) => {
    const page = computed(() => store.candidatesResource.value() ?? null);
    const pageStaffMembers = computed(() => page()?.staffMembers ?? []);

    return {
      isLoading: computed(() => store.candidatesResource.isLoading()),
      totalRecords: computed(() => page()?.totalRecords ?? 0),
      departments: computed(() => page()?.departments ?? []),
      locations: computed(() => page()?.locations ?? []),
      selectedIds: computed(() => store.selected().map((staffMember) => staffMember.staffMemberId)),
      /** Picks the current search no longer returns stay listed on top, so nothing ticked is
       *  ever hidden from the reader. */
      options: computed(() => {
        const onPage = new Set(pageStaffMembers().map((staffMember) => staffMember.staffMemberId));
        return [
          ...store.selected().filter((staffMember) => !onPage.has(staffMember.staffMemberId)),
          ...pageStaffMembers(),
        ].map((staffMember) => ({
          ...staffMember,
          meta: [staffMember.staffMemberCode, staffMember.departmentName, staffMember.designationName]
            .filter(Boolean)
            .join(' · '),
        }));
      }),
      /** What the listbox shows ticked: the picks plus rows already mapped, so a mapped row reads
       *  as done rather than unpicked. */
      checkedIds: computed(() => [
        ...pageStaffMembers()
          .filter((staffMember) => staffMember.isAssigned)
          .map((staffMember) => staffMember.staffMemberId),
        ...store.selected().map((staffMember) => staffMember.staffMemberId),
      ]),
      hasMore: computed(() => (page()?.totalRecords ?? 0) > pageStaffMembers().length),
      pageCount: computed(() => pageStaffMembers().length),
    };
  }),
  withMethods((store) => {
    const institutionPolicyApi = inject(InstitutionPolicyApi);
    const commonService = inject(Common);
    const featurePageStore = inject(FeaturePageStore);
    const destroyRef = inject(DestroyRef);

    return {
      setSearch(search: SettledSearchTerm): void {
        patchState(store, { search });
      },
      setDepartmentId(departmentId: number | null): void {
        patchState(store, { departmentId });
      },
      setLocationId(locationId: number | null): void {
        patchState(store, { locationId });
      },
      setSelectedIds(ids: string[]): void {
        const picked = new Set(ids);
        patchState(store, {
          selected: store
            .options()
            .filter((staffMember) => !staffMember.isAssigned && picked.has(staffMember.staffMemberId)),
        });
      },
      clearSelection(): void {
        patchState(store, { selected: [] });
      },

      /** Maps every pick for the version's own window; `onMapped` runs only on success. */
      assign(onMapped: () => void): void {
        if (store.isSaving() || !store.selected().length) return;

        const { ModuleId, OperationId } = featurePageStore.moduleOperationIds(
          [ASSIGNMENTS_MODULE_CODE],
          'Assign',
        );

        patchState(store, { isSaving: true });
        institutionPolicyApi
          .assignPolicy({
            moduleId: ModuleId,
            operationId: OperationId,
            policyVersionId: store.policy.versionId,
            staffMemberIds: store.selectedIds(),
            effectiveFrom: store.effectiveFrom,
            effectiveTo: store.policy.effectiveTo,
            isMandatory: true,
          })
          .pipe(
            finalize(() => patchState(store, { isSaving: false })),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
              if (res.isSucceeded) onMapped();
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);

import { computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';

import { Common } from '@core/services/common';
import { StaffMembersApi } from '@core/services/staffMember-api';

/** One page big enough to hold every staffMember — this feeds a dropdown, not a grid. */
const STAFF_MEMBER_LOOKUP_PAGE_SIZE = 500;

export interface StaffMemberFilterOption {
  /** `null` is the "All StaffMembers" row. */
  staffMemberId: string | null;
  fullName: string;
}

/**
 * The staffMember filter the work-configuration list pages share: every staffMember, first-name order,
 * behind an "All StaffMembers" row. Must be called in an injection context (a field initializer).
 */
export function injectStaffMemberFilterOptions() {
  const staffMembers = injectStaffMemberOptions();

  return {
    options: computed<StaffMemberFilterOption[]>(() => [
      { staffMemberId: null, fullName: 'All StaffMembers' },
      ...staffMembers.options(),
    ]),
    isLoading: staffMembers.isLoading,
  };
}

/**
 * The same list without the "All StaffMembers" row, for a form's required staffMember picker. Must be
 * called in an injection context (a field initializer).
 */
export function injectStaffMemberOptions() {
  const staffMembersApi = inject(StaffMembersApi);
  const commonService = inject(Common);

  /** `StaffMember/get-all` scopes its list to the signed-in staffMember. Empty until that is known. */
  const userStaffMemberId = signal('');
  void commonService
    .getLoginInfo()
    .then((loginInfo) => userStaffMemberId.set(loginInfo?.user?.staffMemberId ?? ''));

  const staffMembersResource = rxResource({
    params: () => {
      const id = userStaffMemberId();
      return id ? { id } : undefined;
    },
    stream: ({ params }) =>
      staffMembersApi
        .getAllStaffMembers({
          UserStaffMemberId: params.id,
          PageNumber: 1,
          PageSize: STAFF_MEMBER_LOOKUP_PAGE_SIZE,
          SortBy: 'firstName',
          SortOrder: 'asc',
        })
        .pipe(
          map((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            return (res.isSucceeded ? (res.data ?? []) : []).map(
              (staffMember): StaffMemberFilterOption => ({
                staffMemberId: staffMember.staffMemberId,
                fullName: [staffMember.firstName, staffMember.lastName].filter(Boolean).join(' '),
              }),
            );
          }),
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            return of([] as StaffMemberFilterOption[]);
          }),
        ),
  });

  return {
    options: computed<StaffMemberFilterOption[]>(() => staffMembersResource.value() ?? []),
    isLoading: computed(() => staffMembersResource.isLoading()),
  };
}

/**
 * The same list narrowed to staffMembers the institution-policy endpoints can actually accept: they key on
 * a numeric staffMember id while `StaffMember/get-all` reports a string one. Offering an staffMember whose
 * id will not parse only produces a rejected submit, so they are dropped here and counted in
 * `unselectableCount` for the caller to disclose. Must be called in an injection context.
 */
export function injectNumericStaffMemberOptions() {
  const staffMembers = injectStaffMemberOptions();

  // `Number('')` and `Number('  ')` are `0`, so a `Number.isFinite` check alone would let a blank
  // id through and submit it as staffMember 0 — the wrong target rather than the rejection intended.
  const options = computed<StaffMemberFilterOption[]>(() =>
    staffMembers.options().filter((option) => /^\d+$/.test(option.staffMemberId ?? '')),
  );

  return {
    options,
    isLoading: staffMembers.isLoading,
    unselectableCount: computed(() => staffMembers.options().length - options().length),
  };
}

/**
 * Adds `known` to the option list when the lookup doesn't already carry it, so an edit dialog still
 * shows the right name even though `StaffMember/get-all` scopes its list to the signed-in staffMember and
 * may not include whoever a record was actually assigned to. `null` when there is nothing to edit.
 */
export function ensureStaffMemberOption(
  options: StaffMemberFilterOption[],
  known: StaffMemberFilterOption | null,
): StaffMemberFilterOption[] {
  if (!known || options.some((option) => option.staffMemberId === known.staffMemberId)) {
    return options;
  }
  return [known, ...options];
}

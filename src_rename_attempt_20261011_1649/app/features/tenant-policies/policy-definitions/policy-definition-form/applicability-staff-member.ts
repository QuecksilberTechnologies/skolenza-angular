import { InstitutionPolicyApplicabilityInput } from '@shared/interfaces';

import { ApplicabilityRowModel } from './policy-definition-form.schema';

type ApplicabilityStaffMemberFields = Pick<
  ApplicabilityRowModel,
  'staffMemberPublicId' | 'savedStaffMemberId'
>;

/** True while the row still targets the staffMember it was saved with rather than one picked here. */
export function targetsSavedStaffMember(row: ApplicabilityStaffMemberFields): boolean {
  return row.savedStaffMemberId !== null && !row.staffMemberPublicId;
}

/** The request's staffMember target. Never sends both ids: a picked staffMember wins over a saved one. */
export function applicabilityStaffMemberTarget(
  row: ApplicabilityStaffMemberFields,
): Pick<InstitutionPolicyApplicabilityInput, 'staffMemberId' | 'staffMemberPublicId'> {
  return targetsSavedStaffMember(row)
    ? { staffMemberId: row.savedStaffMemberId, staffMemberPublicId: null }
    : { staffMemberId: null, staffMemberPublicId: row.staffMemberPublicId || null };
}

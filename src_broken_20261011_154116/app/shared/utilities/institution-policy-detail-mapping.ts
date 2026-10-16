import {
  InstitutionPolicyApplicabilityDetail,
  InstitutionPolicyApplicabilityInput,
  InstitutionPolicyRuleDetail,
  InstitutionPolicyRuleInput,
} from '@shared/interfaces';

/**
 * `GET /{id}` field names (`ruleTypeId`/`name`/`order`/`configuration`) differ from the
 * `POST`/`PUT` field names (`policyRuleTypeId`/`ruleName`/`ruleOrder`/`ruleConfiguration`) for the
 * same data — see the doc comments on `InstitutionPolicyRuleInput`/`InstitutionPolicyRuleDetail`. This is
 * the round trip: fetch a version's detail, edit its identity fields, save with its rules
 * untouched, without hand-copying field names at every call site.
 */
export function ruleDetailToInput(rule: InstitutionPolicyRuleDetail): InstitutionPolicyRuleInput {
  return {
    policyRuleTypeId: rule.ruleTypeId,
    ruleName: rule.name,
    ruleOrder: rule.order,
    ruleConfiguration: rule.configuration,
    leaveTypeIds: rule.leaveTypeIds ?? [],
  };
}

/** See `ruleDetailToInput` and the doc comment on `InstitutionPolicyApplicabilityInput`. */
export function applicabilityDetailToInput(
  row: InstitutionPolicyApplicabilityDetail,
): InstitutionPolicyApplicabilityInput {
  return {
    applicabilityMode: row.mode,
    countryId: row.countryId,
    stateId: row.stateId,
    institutionLocationId: row.institutionLocationId,
    staffEmploymentTypeId: row.staffEmploymentTypeId,
    districtId: row.districtId,
    localityId: row.localityId,
    departmentId: row.departmentId,
    designationId: row.designationId,
    staffMemberId: row.staffMemberId,
    staffMemberPublicId: null,
    genderId: row.genderId,
    workArrangementType: row.workArrangementType,
    employmentStatus: row.employmentStatus,
    minimumServiceDays: row.minimumServiceDays,
    priority: row.priority,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    leaveTypeIds: row.leaveTypeIds ?? [],
  };
}

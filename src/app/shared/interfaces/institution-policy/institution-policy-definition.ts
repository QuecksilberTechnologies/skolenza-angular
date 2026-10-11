import { AttendanceLocationScope } from '../attendance-config/attendance-config';

export interface InstitutionPolicyAttendanceConfiguration {
  attendanceLocationScope: AttendanceLocationScope;
  allowBiometric: boolean;
  allowMobile: boolean;
  allowWeb: boolean;
  allowManualAttendance: boolean;
  allowWorkFromHome: boolean;
  requireGeoFenceForOffice: boolean;
  requireGpsForRemote: boolean;
  allowOutsideLocationWithApproval: boolean;
}

/** One row of the paged policy list (`GET /api/InstitutionPolicy`). */
export interface InstitutionPolicyListItem {
  id: number;
  code: string;
  name: string;
  policyTypeId: number;
  isActive: boolean;
  currentVersionId: number;
  versionNumber: number;
  status: string;
}

export interface GetInstitutionPoliciesRequest {
  moduleId?: number;
  operationId?: number;
  pageNumber: number;
  pageSize: number;
  policyTypeId?: number | null;
  statusId?: number | null;
  search?: string;
}

export interface GetInstitutionPoliciesResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyListItem[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

/**
 * A typed rule row inside a version's `rules` array **as the write endpoints take it**
 * (`POST /`, `PUT /{policyId}/versions/{versionId}`). This first slice never builds one — every
 * create sends `rules: []` — but the shape is here so the request body is fully typed and the
 * editor wizard phase has it ready.
 *
 * The read shape (`GET /{id}` and every endpoint that echoes the full detail back) uses shorter,
 * different field names — see `InstitutionPolicyRuleDetail`. The two are not interchangeable: mapping
 * one to the other is `institution-policy-detail-mapping.ts`'s whole job.
 */
export interface InstitutionPolicyRuleInput {
  policyRuleTypeId: number;
  ruleName: string;
  ruleOrder: number;
  /** A JSON object string, e.g. `{"days":12,"unit":"DAY"}`. Arrays and scalars are rejected. */
  ruleConfiguration: string;
  leaveTypeIds: number[];
}

/** One `rules` row as `GET /{id}` (and every detail-echoing response) returns it. */
export interface InstitutionPolicyRuleDetail {
  id: number;
  ruleTypeId: number;
  name: string;
  order: number;
  configuration: string;
  leaveTypeIds: number[];
}

/** `1=Include`, `2=Exclude` — the only two values `INSTITUTION_POLICY_API.md` documents. */
export type InstitutionPolicyApplicabilityMode = 1 | 2;

/**
 * One `applicability` row **as the write endpoints take it**. See `InstitutionPolicyRuleInput` —
 * always `[]` here too in this slice.
 *
 * The create/update worked example in `INSTITUTION_POLICY_API.md` only exercises `countryId`,
 * `stateId`, `campusId`, and `staffEmploymentTypeId`, but the live swagger's
 * `PolicyApplicabilityInputDTO` binds **every** field below on write — checked 2026-09-20 — so the
 * round trip in `institution-policy-detail-mapping.ts`'s `applicabilityDetailToInput` is safe and the
 * form can edit them for real.
 *
 * `policy-definition-form` edits all of these except `workArrangementType` and `employmentStatus`,
 * which are plain nullable `int32` with no `$ref` enum and no documented value legend — nothing
 * says what `1` means, so there is no honest select to build. They still round-trip unedited.
 */
export interface InstitutionPolicyApplicabilityInput {
  applicabilityMode: InstitutionPolicyApplicabilityMode;
  countryId: number | null;
  stateId: number | null;
  campusId: number | null;
  staffEmploymentTypeId: number | null;
  districtId: number | null;
  localityId: number | null;
  departmentId: number | null;
  designationId: number | null;
  staffMemberId: number | null;
  /** Encoded staffMember id returned by StaffMember/get-all. */
  staffMemberPublicId: string | null;
  genderId: number | null;
  workArrangementType: number | null;
  employmentStatus: number | null;
  minimumServiceDays: number | null;
  priority: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  leaveTypeIds: number[];
}

/** One `applicability` row as `GET /{id}` (and every detail-echoing response) returns it. */
export interface InstitutionPolicyApplicabilityDetail {
  id: number;
  mode: InstitutionPolicyApplicabilityMode;
  priority: number;
  countryId: number | null;
  stateId: number | null;
  districtId: number | null;
  localityId: number | null;
  campusId: number | null;
  staffEmploymentTypeId: number | null;
  departmentId: number | null;
  designationId: number | null;
  staffMemberId: number | null;
  genderId: number | null;
  workArrangementType: number | null;
  employmentStatus: number | null;
  minimumServiceDays: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  leaveTypeIds: number[];
}

export interface CreateInstitutionPolicyRequest {
  moduleId?: number;
  operationId?: number;
  policyTypeId: number;
  policyCode: string;
  policyName: string;
  summary?: string;
  ownerDepartmentId?: number | null;
  defaultCurrencyCode: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  changeSummary: string;
  rules: InstitutionPolicyRuleInput[];
  applicability: InstitutionPolicyApplicabilityInput[];
  leaveTypeIds: number[];
  /** Required only when the selected Policy Type belongs to the ATTENDANCE category. */
  attendanceConfiguration?: InstitutionPolicyAttendanceConfiguration | null;
}

/** Same body shape; path supplies `policyId`/`versionId` and any body ids are ignored. */
export type UpdateInstitutionPolicyRequest = CreateInstitutionPolicyRequest;

/** The full detail object every read/write/lifecycle endpoint returns as `data` — `GET /{id}`,
 *  `POST /`, `PUT /{policyId}/versions/{versionId}`, `POST /{policyId}/versions/clone`, and
 *  `POST /versions/{versionId}/transition` all echo this same shape back. */
export interface InstitutionPolicyDetail {
  id: number;
  code: string;
  name: string;
  summary: string | null;
  policyTypeId: number;
  ownerDepartmentId: number | null;
  defaultCurrencyCode: string;
  versionId: number;
  versionNumber: number;
  statusId: number;
  status: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  changeSummary: string;
  rules: InstitutionPolicyRuleDetail[];
  applicability: InstitutionPolicyApplicabilityDetail[];
  attendanceConfiguration?: InstitutionPolicyAttendanceConfiguration | null;
  leaveTypes: { id: number; name: string }[];
}

export interface GetInstitutionPolicyRequest {
  moduleId?: number;
  operationId?: number;
}

export interface InstitutionPolicyMutationResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyDetail;
}

export type InstitutionPolicyLifecycleAction = 'SUBMIT' | 'APPROVE' | 'REJECT' | 'PUBLISH' | 'ARCHIVE';

/** The version statuses the API reports. The list and detail DTOs still type `status` as a plain
 *  string; this types the literals the UI writes against it. */
export type InstitutionPolicyStatus =
  | 'Draft'
  | 'Under Review'
  | 'Approved'
  | 'Published'
  | 'Rejected'
  | 'Archived';

/** The my-menu operation name each lifecycle action resolves `moduleId`/`operationId` against —
 *  `FeaturePageStore.moduleOperationIds()` matches on the exact `FeaturePageOperation.name`
 *  string (`Submit`, `Approve`, ...), not the request's own uppercase `action` value. */
export const INSTITUTION_POLICY_LIFECYCLE_OPERATION_NAME: Readonly<
  Record<InstitutionPolicyLifecycleAction, string>
> = {
  SUBMIT: 'Submit',
  APPROVE: 'Approve',
  REJECT: 'Reject',
  PUBLISH: 'Publish',
  ARCHIVE: 'Archive',
};

export interface InstitutionPolicyTransitionRequest {
  moduleId?: number;
  operationId?: number;
  policyVersionId: number;
  action: InstitutionPolicyLifecycleAction;
  comments?: string;
}

export interface InstitutionPolicyTransitionResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: unknown;
}

export interface IInstitutionPolicyFilter {
  policyTypeId?: number | null;
  statusId?: number | null;
}


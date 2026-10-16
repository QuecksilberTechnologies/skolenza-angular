import { InstitutionPolicyContextRequest } from './institution-policy-common';

/** `POST /api/InstitutionPolicy/assignments` - one Published version, many staffMembers. */
export interface AssignInstitutionPolicyRequest extends InstitutionPolicyContextRequest {
  policyVersionId: number;
  /** Encoded staffMember ids returned by StaffMember/get-all. */
  staffMemberIds: string[];
  effectiveFrom: string;
  effectiveTo?: string | null;
  isMandatory: boolean;
}

/** Idempotent by staffMember: a repeat assignment counts as `existing`, not `inserted`. */
export interface InstitutionPolicyAssignmentResult {
  inserted: number;
  existing: number;
}

export interface AssignInstitutionPolicyResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyAssignmentResult;
}

/** `1=Manual`, matching the write above; higher values are the API's own automatic sources. */
export interface InstitutionPolicyAssignment {
  id: number;
  policyVersionId: number;
  staffMemberId: number;
  assignmentSource: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isMandatory: boolean;
  isActive: boolean;
  /** True only when the row is active and its policy version has not been archived. */
  isEffective: boolean;
  /** `VERSION_ARCHIVED`, `ASSIGNMENT_REMOVED`, or null while effective. */
  stateReason: string | null;
}

export interface GetInstitutionPolicyAssignmentsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyAssignment[];
}

/** `GET /api/InstitutionPolicy/versions/{versionId}/assignment-candidates` - the active staffMembers the
 *  version's Applicability includes on `effectiveDate`. */
export interface GetInstitutionPolicyAssignmentCandidatesRequest extends InstitutionPolicyContextRequest {
  effectiveDate?: string;
  staffEmploymentTypeId?: number | null;
  departmentId?: number | null;
  designationId?: number | null;
  /** Not yet accepted by the API; sent so the filter works once it is. */
  locationId?: number | null;
  search?: string;
  includeAssigned?: boolean;
  pageNumber: number;
  /** The API caps this at 200. */
  pageSize: number;
}

export interface InstitutionPolicyAssignmentCandidate {
  /** Encoded, ready for `AssignInstitutionPolicyRequest.staffMemberIds`. */
  staffMemberId: string;
  staffMemberCode: string;
  staffMemberName: string;
  staffEmploymentTypeId: number | null;
  staffEmploymentTypeName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  designationId: number | null;
  designationName: string | null;
  /** The staffMember's primary location. Optional until the API returns it. */
  locationId?: number | null;
  locationName?: string | null;
  isAssigned: boolean;
}

export interface InstitutionPolicyAssignmentFilterOption {
  id: number;
  name: string;
  staffMemberCount: number;
}

export interface InstitutionPolicyAssignmentCandidatePage {
  policyId: number;
  policyVersionId: number;
  policyCode: string;
  policyName: string;
  versionNumber: number;
  effectiveDate: string;
  totalRecords: number;
  staffMembers: InstitutionPolicyAssignmentCandidate[];
  staffEmploymentTypes: InstitutionPolicyAssignmentFilterOption[];
  departments: InstitutionPolicyAssignmentFilterOption[];
  designations: InstitutionPolicyAssignmentFilterOption[];
  /** Optional until the API returns it. */
  locations?: InstitutionPolicyAssignmentFilterOption[];
}

export interface GetInstitutionPolicyAssignmentCandidatesResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyAssignmentCandidatePage;
}

/** `POST /api/InstitutionPolicy/exceptions` - a temporary per-staffMember override of one version. */
export interface CreateInstitutionPolicyExceptionRequest extends InstitutionPolicyContextRequest {
  policyVersionId: number;
  /** Encoded staffMember id returned by StaffMember/get-all. */
  staffMemberId: string;
  exceptionType: number;
  /** A JSON object string, same convention as `InstitutionPolicyRuleInput.ruleConfiguration`. */
  overrideConfiguration: string;
  reason: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

/** `data` is the new exception id, not an object. */
export interface CreateInstitutionPolicyExceptionResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: number;
}

export interface DecideInstitutionPolicyExceptionRequest extends InstitutionPolicyContextRequest {
  approve: boolean;
}

export interface InstitutionPolicyException {
  id: number;
  policyVersionId: number;
  staffMemberId: number;
  exceptionType: number;
  overrideConfiguration: string;
  reason: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  approvalStatusId: number;
  isActive: boolean;
}

export interface GetInstitutionPolicyExceptionsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyException[];
}

/** `POST /api/InstitutionPolicy/acknowledgements` - the acknowledging staffMember comes from the token. */
export interface AcknowledgeInstitutionPolicyRequest extends InstitutionPolicyContextRequest {
  policyVersionId: number;
  /** A JSON object string capturing where the acceptance came from, e.g. `{"acceptedFrom":"WEB"}`. */
  evidenceJson?: string;
}

/** `status` is the evidence state: assigned, viewed, then acknowledged. */
export interface InstitutionPolicyAcknowledgement {
  id: number;
  policyVersionId: number;
  staffMemberId: number;
  status: number;
  assignedDateTime: string;
  viewedDateTime: string | null;
  acknowledgedDateTime: string | null;
}

export interface GetInstitutionPolicyAcknowledgementsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyAcknowledgement[];
}

/** `GET /api/InstitutionPolicy/resolve` - what actually applies to one staffMember on one date. */
export interface ResolveInstitutionPoliciesRequest extends InstitutionPolicyContextRequest {
  /** A string here, unlike the numeric ids the assignment and exception writes take. */
  staffMemberId: string;
  effectiveDate: string;
}

export interface InstitutionPolicyResolution {
  policyId: number;
  policyVersionId: number;
  policyCode: string;
  policyName: string;
  priority: number;
  /** `APPLICABILITY`, `MANUAL_ASSIGNMENT` or `EXCEPTION` - why this version won. */
  resolutionSource: string;
  rules: InstitutionPolicyResolvedRule[];
  exception: InstitutionPolicyResolvedException | null;
}

export interface InstitutionPolicyResolvedRule {
  ruleTypeCode: string;
  ruleName: string;
  order: number;
  configuration: string;
}

export interface InstitutionPolicyResolvedException {
  id: number;
  exceptionType: number;
  overrideConfiguration: string;
  reason: string;
}

export interface ResolveInstitutionPoliciesResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyResolution[];
}

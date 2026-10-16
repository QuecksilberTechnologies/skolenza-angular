import { InstitutionPolicyContextRequest } from './institution-policy-common';

/**
 * One ordered gate a version passes through between `SUBMIT` and `PUBLISH`. A stage with no
 * `policyCategoryId` is global; a category-scoped stage applies only to that category's policies.
 */
export interface InstitutionPolicyApprovalStage {
  id: number;
  policyCategoryId: number | null;
  stageName: string;
  stageOrder: number;
  approverRoleId: number;
  minimumApprovals: number;
  isMandatory: boolean;
  isActive: boolean;
}

export interface GetInstitutionPolicyApprovalStagesRequest extends InstitutionPolicyContextRequest {
  policyCategoryId?: number | null;
  isActive?: boolean;
}

export interface GetInstitutionPolicyApprovalStagesResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyApprovalStage[];
}

export interface AddInstitutionPolicyApprovalStageRequest extends InstitutionPolicyContextRequest {
  policyCategoryId?: number | null;
  stageName: string;
  stageOrder: number;
  approverRoleId: number;
  minimumApprovals: number;
  isMandatory: boolean;
}

export interface UpdateInstitutionPolicyApprovalStageRequest extends AddInstitutionPolicyApprovalStageRequest {
  isActive: boolean;
}

export interface InstitutionPolicyApprovalStageResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyApprovalStage;
}

/** Stage-by-stage tally for one version - `approvalCount` against `minimumApprovals`. */
export interface InstitutionPolicyApprovalProgress {
  stageId: number;
  stageName: string;
  stageOrder: number;
  minimumApprovals: number;
  approvalCount: number;
  isComplete: boolean;
}

export interface GetInstitutionPolicyApprovalProgressResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyApprovalProgress[];
}

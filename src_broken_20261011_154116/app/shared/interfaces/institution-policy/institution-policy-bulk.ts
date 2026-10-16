import { InstitutionPolicyContextRequest } from './institution-policy-common';

/**
 * The `{target}` path segment of the durable policy bulk endpoints. Each target carries its own
 * leaf ModuleId - Policy Types, Policy Definitions and Policy Assignments respectively - so the
 * caller resolves `moduleId` per target, not once per controller.
 */
export type InstitutionPolicyBulkTarget = 'types' | 'definitions' | 'assignments';

/** Body of confirm, retry and cancel. The preview is what put `jobId` on the client. */
export interface InstitutionPolicyBulkJobRequest extends InstitutionPolicyContextRequest {
  jobId: string;
}

export interface InstitutionPolicyBulkJobsRequest extends InstitutionPolicyContextRequest {
  pageNumber?: number;
  pageSize?: number;
}

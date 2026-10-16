import { InstitutionPolicyContextRequest } from './institution-policy-common';

/**
 * A stored PDF/DOC/DOCX attached to one editable version. `url` is a temporary object URL the API
 * re-issues on every read, so it must never be persisted or bookmarked.
 */
export interface InstitutionPolicyDocument {
  id: number;
  policyVersionId: number;
  documentTypeId: number;
  title: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  languageCode: string;
  isStaffMemberVisible: boolean;
  url: string;
}

export interface InstitutionPolicyDocumentResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyDocument;
}

export interface GetInstitutionPolicyDocumentsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyDocument[];
}

/** Immutable evidence row. `beforeData` / `afterData` are JSON object strings or null. */
export interface InstitutionPolicyAuditEntry {
  id: number;
  policyId: number;
  policyVersionId: number | null;
  versionNumber: number | null;
  entityName: string;
  entityId: number;
  actionName: string;
  beforeData: string | null;
  afterData: string | null;
  changedById: number;
  changedByName: string | null;
  changedDateTime: string;
  correlationId: string | null;
}

export interface GetInstitutionPolicyAuditResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionPolicyAuditEntry[];
}

/** `POST /api/InstitutionPolicy/{policyId}/versions/clone` - next Draft off an existing version. */
export interface CloneInstitutionPolicyVersionRequest extends InstitutionPolicyContextRequest {
  sourceVersionId: number;
  effectiveFrom: string;
  changeSummary: string;
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AcknowledgeInstitutionPolicyRequest,
  AddInstitutionPolicyApprovalStageRequest,
  AddInstitutionPolicyTypeRequest,
  AssignInstitutionPolicyRequest,
  AssignInstitutionPolicyResponse,
  BulkImportJobResponse,
  BulkImportJobsResponse,
  BulkImportPreviewResponse,
  CloneInstitutionPolicyVersionRequest,
  CreateInstitutionPolicyExceptionRequest,
  CreateInstitutionPolicyExceptionResponse,
  CreateInstitutionPolicyRequest,
  DecideInstitutionPolicyExceptionRequest,
  GetInstitutionPoliciesRequest,
  GetInstitutionPoliciesResponse,
  GetInstitutionPolicyAcknowledgementsResponse,
  GetInstitutionPolicyApprovalProgressResponse,
  GetInstitutionPolicyApprovalStagesRequest,
  GetInstitutionPolicyApprovalStagesResponse,
  GetInstitutionPolicyAssignmentCandidatesRequest,
  GetInstitutionPolicyAssignmentCandidatesResponse,
  GetInstitutionPolicyAssignmentsResponse,
  GetInstitutionPolicyAuditResponse,
  GetInstitutionPolicyDocumentsResponse,
  GetInstitutionPolicyExceptionsResponse,
  GetInstitutionPolicyLookupsRequest,
  GetInstitutionPolicyRequest,
  GetInstitutionPolicyTypesRequest,
  GetInstitutionPolicyTypesResponse,
  ResolveInstitutionPoliciesRequest,
  ResolveInstitutionPoliciesResponse,
  InstitutionPolicyApprovalStageResponse,
  InstitutionPolicyBooleanResponse,
  InstitutionPolicyBulkJobRequest,
  InstitutionPolicyBulkJobsRequest,
  InstitutionPolicyBulkTarget,
  InstitutionPolicyContextRequest,
  InstitutionPolicyDocumentResponse,
  InstitutionPolicyLookupsResponse,
  InstitutionPolicyMutationResponse,
  InstitutionPolicyTransitionRequest,
  InstitutionPolicyTransitionResponse,
  InstitutionPolicyTypeResponse,
  InstitutionPolicyTypeStatusResponse,
  UpdateInstitutionPolicyApprovalStageRequest,
  UpdateInstitutionPolicyRequest,
  UpdateInstitutionPolicyTypeRequest,
  UpdateInstitutionPolicyTypeStatusRequest,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class InstitutionPolicyApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/InstitutionPolicy`;
  readonly #http = inject(HttpClient);

  getLookups(req: GetInstitutionPolicyLookupsRequest): Observable<InstitutionPolicyLookupsResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<InstitutionPolicyLookupsResponse>(`${this.#apiUrl}/lookups`, { params })
      .pipe(catchError(this.handleError<InstitutionPolicyLookupsResponse>('getLookups')));
  }

  getPolicyTypes(req: GetInstitutionPolicyTypesRequest): Observable<GetInstitutionPolicyTypesResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInstitutionPolicyTypesResponse>(`${this.#apiUrl}/types`, { params })
      .pipe(catchError(this.handleError<GetInstitutionPolicyTypesResponse>('getPolicyTypes')));
  }

  addPolicyType(body: AddInstitutionPolicyTypeRequest): Observable<InstitutionPolicyTypeResponse> {
    return this.#http
      .post<InstitutionPolicyTypeResponse>(`${this.#apiUrl}/types`, body)
      .pipe(catchError(this.handleError<InstitutionPolicyTypeResponse>('addPolicyType')));
  }

  updatePolicyType(
    id: number,
    body: UpdateInstitutionPolicyTypeRequest,
  ): Observable<InstitutionPolicyTypeResponse> {
    return this.#http
      .put<InstitutionPolicyTypeResponse>(`${this.#apiUrl}/types/${id}`, body)
      .pipe(catchError(this.handleError<InstitutionPolicyTypeResponse>('updatePolicyType')));
  }

  updatePolicyTypeStatus(
    id: number,
    body: UpdateInstitutionPolicyTypeStatusRequest,
  ): Observable<InstitutionPolicyTypeStatusResponse> {
    return this.#http
      .patch<InstitutionPolicyTypeStatusResponse>(`${this.#apiUrl}/types/${id}/status`, body)
      .pipe(catchError(this.handleError<InstitutionPolicyTypeStatusResponse>('updatePolicyTypeStatus')));
  }

  getPolicies(req: GetInstitutionPoliciesRequest): Observable<GetInstitutionPoliciesResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInstitutionPoliciesResponse>(`${this.#apiUrl}`, { params })
      .pipe(catchError(this.handleError<GetInstitutionPoliciesResponse>('getPolicies')));
  }

  getPolicy(id: number, req: GetInstitutionPolicyRequest): Observable<InstitutionPolicyMutationResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<InstitutionPolicyMutationResponse>(`${this.#apiUrl}/${id}`, { params })
      .pipe(catchError(this.handleError<InstitutionPolicyMutationResponse>('getPolicy')));
  }

  getPolicyVersion(
    policyId: number,
    versionId: number,
    req: GetInstitutionPolicyRequest,
  ): Observable<InstitutionPolicyMutationResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<InstitutionPolicyMutationResponse>(`${this.#apiUrl}/${policyId}/versions/${versionId}`, {
        params,
      })
      .pipe(catchError(this.handleError<InstitutionPolicyMutationResponse>('getPolicyVersion')));
  }

  createPolicy(body: CreateInstitutionPolicyRequest): Observable<InstitutionPolicyMutationResponse> {
    return this.#http
      .post<InstitutionPolicyMutationResponse>(`${this.#apiUrl}`, body)
      .pipe(catchError(this.handleError<InstitutionPolicyMutationResponse>('createPolicy')));
  }

  updatePolicy(
    policyId: number,
    versionId: number,
    body: UpdateInstitutionPolicyRequest,
  ): Observable<InstitutionPolicyMutationResponse> {
    return this.#http
      .put<InstitutionPolicyMutationResponse>(`${this.#apiUrl}/${policyId}/versions/${versionId}`, body)
      .pipe(catchError(this.handleError<InstitutionPolicyMutationResponse>('updatePolicy')));
  }

  /** Clones `sourceVersionId` into the next editable Draft; echoes the full policy detail back. */
  clonePolicyVersion(
    policyId: number,
    body: CloneInstitutionPolicyVersionRequest,
  ): Observable<InstitutionPolicyMutationResponse> {
    return this.#http
      .post<InstitutionPolicyMutationResponse>(`${this.#apiUrl}/${policyId}/versions/clone`, body)
      .pipe(catchError(this.handleError<InstitutionPolicyMutationResponse>('clonePolicyVersion')));
  }

  transitionPolicyVersion(
    versionId: number,
    body: InstitutionPolicyTransitionRequest,
  ): Observable<InstitutionPolicyTransitionResponse> {
    return this.#http
      .post<InstitutionPolicyTransitionResponse>(
        `${this.#apiUrl}/versions/${versionId}/transition`,
        body,
      )
      .pipe(
        catchError(this.handleError<InstitutionPolicyTransitionResponse>('transitionPolicyVersion')),
      );
  }

  /** The effective Published policies for one staffMember on one date, priority-ordered. */
  resolvePolicies(req: ResolveInstitutionPoliciesRequest): Observable<ResolveInstitutionPoliciesResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<ResolveInstitutionPoliciesResponse>(`${this.#apiUrl}/resolve`, { params })
      .pipe(catchError(this.handleError<ResolveInstitutionPoliciesResponse>('resolvePolicies')));
  }

  // Assignments.

  assignPolicy(body: AssignInstitutionPolicyRequest): Observable<AssignInstitutionPolicyResponse> {
    return this.#http
      .post<AssignInstitutionPolicyResponse>(`${this.#apiUrl}/assignments`, body)
      .pipe(catchError(this.handleError<AssignInstitutionPolicyResponse>('assignPolicy')));
  }

  /** Deactivates the assignment; the row and its history survive. */
  removeAssignment(
    assignmentId: number,
    req: InstitutionPolicyContextRequest,
  ): Observable<InstitutionPolicyBooleanResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<InstitutionPolicyBooleanResponse>(`${this.#apiUrl}/assignments/${assignmentId}`, {
        params,
      })
      .pipe(catchError(this.handleError<InstitutionPolicyBooleanResponse>('removeAssignment')));
  }

  getVersionAssignments(
    versionId: number,
    req: InstitutionPolicyContextRequest,
  ): Observable<GetInstitutionPolicyAssignmentsResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInstitutionPolicyAssignmentsResponse>(
        `${this.#apiUrl}/versions/${versionId}/assignments`,
        {
          params,
        },
      )
      .pipe(
        catchError(this.handleError<GetInstitutionPolicyAssignmentsResponse>('getVersionAssignments')),
      );
  }

  /** Only staffMembers the version's Applicability includes; Exclude wins a tie. */
  getAssignmentCandidates(
    versionId: number,
    req: GetInstitutionPolicyAssignmentCandidatesRequest,
  ): Observable<GetInstitutionPolicyAssignmentCandidatesResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInstitutionPolicyAssignmentCandidatesResponse>(
        `${this.#apiUrl}/versions/${versionId}/assignment-candidates`,
        { params },
      )
      .pipe(
        catchError(
          this.handleError<GetInstitutionPolicyAssignmentCandidatesResponse>('getAssignmentCandidates'),
        ),
      );
  }

  // Exceptions.

  createException(
    body: CreateInstitutionPolicyExceptionRequest,
  ): Observable<CreateInstitutionPolicyExceptionResponse> {
    return this.#http
      .post<CreateInstitutionPolicyExceptionResponse>(`${this.#apiUrl}/exceptions`, body)
      .pipe(catchError(this.handleError<CreateInstitutionPolicyExceptionResponse>('createException')));
  }

  decideException(
    exceptionId: number,
    body: DecideInstitutionPolicyExceptionRequest,
  ): Observable<InstitutionPolicyBooleanResponse> {
    return this.#http
      .post<InstitutionPolicyBooleanResponse>(`${this.#apiUrl}/exceptions/${exceptionId}/decision`, body)
      .pipe(catchError(this.handleError<InstitutionPolicyBooleanResponse>('decideException')));
  }

  getVersionExceptions(
    versionId: number,
    req: InstitutionPolicyContextRequest,
  ): Observable<GetInstitutionPolicyExceptionsResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInstitutionPolicyExceptionsResponse>(`${this.#apiUrl}/versions/${versionId}/exceptions`, {
        params,
      })
      .pipe(
        catchError(this.handleError<GetInstitutionPolicyExceptionsResponse>('getVersionExceptions')),
      );
  }

  // Acknowledgements. The acknowledging staffMember comes from the token, never from the body.

  acknowledgePolicy(body: AcknowledgeInstitutionPolicyRequest): Observable<InstitutionPolicyBooleanResponse> {
    return this.#http
      .post<InstitutionPolicyBooleanResponse>(`${this.#apiUrl}/acknowledgements`, body)
      .pipe(catchError(this.handleError<InstitutionPolicyBooleanResponse>('acknowledgePolicy')));
  }

  getVersionAcknowledgements(
    versionId: number,
    req: InstitutionPolicyContextRequest,
  ): Observable<GetInstitutionPolicyAcknowledgementsResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInstitutionPolicyAcknowledgementsResponse>(
        `${this.#apiUrl}/versions/${versionId}/acknowledgements`,
        { params },
      )
      .pipe(
        catchError(
          this.handleError<GetInstitutionPolicyAcknowledgementsResponse>('getVersionAcknowledgements'),
        ),
      );
  }

  // Documents. `body` is multipart: moduleId, operationId, policyVersionId, policyDocumentTypeId,
  // documentTitle, languageCode, isStaffMemberVisible and a PDF/DOC/DOCX `file` of 1 byte to 10 MB.

  uploadDocument(body: FormData): Observable<InstitutionPolicyDocumentResponse> {
    return this.#http
      .post<InstitutionPolicyDocumentResponse>(`${this.#apiUrl}/documents`, body)
      .pipe(catchError(this.handleError<InstitutionPolicyDocumentResponse>('uploadDocument')));
  }

  getVersionDocuments(
    versionId: number,
    req: InstitutionPolicyContextRequest,
  ): Observable<GetInstitutionPolicyDocumentsResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInstitutionPolicyDocumentsResponse>(`${this.#apiUrl}/versions/${versionId}/documents`, {
        params,
      })
      .pipe(catchError(this.handleError<GetInstitutionPolicyDocumentsResponse>('getVersionDocuments')));
  }

  deleteDocument(
    documentId: number,
    req: InstitutionPolicyContextRequest,
  ): Observable<InstitutionPolicyBooleanResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<InstitutionPolicyBooleanResponse>(`${this.#apiUrl}/documents/${documentId}`, { params })
      .pipe(catchError(this.handleError<InstitutionPolicyBooleanResponse>('deleteDocument')));
  }

  /** Newest-first immutable audit evidence for one policy and all of its versions. */
  getPolicyAudit(
    policyId: number,
    req: InstitutionPolicyContextRequest,
  ): Observable<GetInstitutionPolicyAuditResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInstitutionPolicyAuditResponse>(`${this.#apiUrl}/${policyId}/audit`, { params })
      .pipe(catchError(this.handleError<GetInstitutionPolicyAuditResponse>('getPolicyAudit')));
  }

  // Approval stages and progress.

  getApprovalStages(
    req: GetInstitutionPolicyApprovalStagesRequest,
  ): Observable<GetInstitutionPolicyApprovalStagesResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInstitutionPolicyApprovalStagesResponse>(`${this.#apiUrl}/approval-stages`, { params })
      .pipe(
        catchError(this.handleError<GetInstitutionPolicyApprovalStagesResponse>('getApprovalStages')),
      );
  }

  addApprovalStage(
    body: AddInstitutionPolicyApprovalStageRequest,
  ): Observable<InstitutionPolicyApprovalStageResponse> {
    return this.#http
      .post<InstitutionPolicyApprovalStageResponse>(`${this.#apiUrl}/approval-stages`, body)
      .pipe(catchError(this.handleError<InstitutionPolicyApprovalStageResponse>('addApprovalStage')));
  }

  updateApprovalStage(
    id: number,
    body: UpdateInstitutionPolicyApprovalStageRequest,
  ): Observable<InstitutionPolicyApprovalStageResponse> {
    return this.#http
      .put<InstitutionPolicyApprovalStageResponse>(`${this.#apiUrl}/approval-stages/${id}`, body)
      .pipe(catchError(this.handleError<InstitutionPolicyApprovalStageResponse>('updateApprovalStage')));
  }

  /** Disables the stage; versions already routed through it keep their history. */
  deleteApprovalStage(
    id: number,
    req: InstitutionPolicyContextRequest,
  ): Observable<InstitutionPolicyBooleanResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<InstitutionPolicyBooleanResponse>(`${this.#apiUrl}/approval-stages/${id}`, { params })
      .pipe(catchError(this.handleError<InstitutionPolicyBooleanResponse>('deleteApprovalStage')));
  }

  getApprovalProgress(
    versionId: number,
    req: InstitutionPolicyContextRequest,
  ): Observable<GetInstitutionPolicyApprovalProgressResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInstitutionPolicyApprovalProgressResponse>(
        `${this.#apiUrl}/versions/${versionId}/approval-progress`,
        { params },
      )
      .pipe(
        catchError(
          this.handleError<GetInstitutionPolicyApprovalProgressResponse>('getApprovalProgress'),
        ),
      );
  }

  // Durable bulk import. `target` is `types`, `definitions` or `assignments`, each with its own leaf
  // ModuleId - unlike the other masters nothing stamps ModuleId/OperationId for InstitutionPolicy, so
  // every call carries them. The payloads are the shared `BulkImport*` shapes the wizard speaks.

  downloadBulkImportTemplate(
    target: InstitutionPolicyBulkTarget,
    req: InstitutionPolicyContextRequest,
  ): Observable<Blob> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get(`${this.#apiUrl}/bulk/${target}/template`, { params, responseType: 'blob' })
      .pipe(catchError(this.handleError<Blob>('downloadBulkImportTemplate')));
  }

  /** Multipart: moduleId, operationId, `file` or `pastedText`, optional columnMappingJson/sheetName. */
  previewBulkImport(
    target: InstitutionPolicyBulkTarget,
    body: FormData,
  ): Observable<BulkImportPreviewResponse> {
    return this.#http
      .post<BulkImportPreviewResponse>(`${this.#apiUrl}/bulk/${target}/preview`, body)
      .pipe(catchError(this.handleError<BulkImportPreviewResponse>('previewBulkImport')));
  }

  confirmBulkImport(
    target: InstitutionPolicyBulkTarget,
    body: InstitutionPolicyBulkJobRequest,
  ): Observable<BulkImportJobResponse> {
    return this.#http
      .post<BulkImportJobResponse>(`${this.#apiUrl}/bulk/${target}/confirm`, body)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('confirmBulkImport')));
  }

  /** Queues a fresh job for the retryable failed rows; the original report is never edited. */
  retryBulkImport(
    target: InstitutionPolicyBulkTarget,
    body: InstitutionPolicyBulkJobRequest,
  ): Observable<BulkImportJobResponse> {
    return this.#http
      .post<BulkImportJobResponse>(`${this.#apiUrl}/bulk/${target}/retry`, body)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('retryBulkImport')));
  }

  /** Cancelled for Draft/Queued, CancelRequested for Running; a terminal job returns a conflict. */
  cancelBulkImport(
    target: InstitutionPolicyBulkTarget,
    body: InstitutionPolicyBulkJobRequest,
  ): Observable<BulkImportJobResponse> {
    return this.#http
      .post<BulkImportJobResponse>(`${this.#apiUrl}/bulk/${target}/cancel`, body)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('cancelBulkImport')));
  }

  getBulkImportJobs(
    target: InstitutionPolicyBulkTarget,
    req: InstitutionPolicyBulkJobsRequest,
  ): Observable<BulkImportJobsResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<BulkImportJobsResponse>(`${this.#apiUrl}/bulk/${target}/jobs`, { params })
      .pipe(catchError(this.handleError<BulkImportJobsResponse>('getBulkImportJobs')));
  }

  getBulkImportJob(
    target: InstitutionPolicyBulkTarget,
    jobId: string,
    req: InstitutionPolicyContextRequest,
  ): Observable<BulkImportJobResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<BulkImportJobResponse>(`${this.#apiUrl}/bulk/${target}/jobs/${jobId}`, { params })
      .pipe(catchError(this.handleError<BulkImportJobResponse>('getBulkImportJob')));
  }

  downloadBulkImportReport(
    target: InstitutionPolicyBulkTarget,
    jobId: string,
    req: InstitutionPolicyContextRequest,
  ): Observable<Blob> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get(`${this.#apiUrl}/bulk/${target}/jobs/${jobId}/report`, {
        params,
        responseType: 'blob',
      })
      .pipe(catchError(this.handleError<Blob>('downloadBulkImportReport')));
  }
}

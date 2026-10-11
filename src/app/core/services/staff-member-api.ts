import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  BulkImportJobRequest,
  BulkImportJobResponse,
  BulkImportJobsRequest,
  BulkImportJobsResponse,
  BulkImportPreviewResponse,
  CreateStaffMemberReq,
  CreateStaffMemberRes,
  DeleeteStaffMemberReq,
  GetAllStaffMembersReq,
  GetAllStaffMembersRes,
  GetAllPercentageReq,
  GetAllPercentageRes,
  GetStaffMemberPermissionsResponse,
  GetStaffMemberStatisticsReq,
  GetStaffMemberStatisticsRes,
  GetStaffMemberSummaryReq,
  GetStaffMemberSummaryRes,
  IStaffMember,
  ResetStaffMemberPasswordReq,
  ResetStaffMemberPasswordRes,
  SaveStaffMemberPermissionsRequest,
  SaveStaffMemberPermissionsResponse,
  UpdateBulkReq,
  UpdateBulkRes,
  UpdateStaffMemberSectionDefaultsReq,
  UpdateStaffMemberReq,
  UpdateStaffMemberRes,
  UpdateStaffMemberUpdateStatusReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class StaffMembersApi extends BaseService {
  readonly #staffMemberApiUrl = `${environment.apiUrl}/Staff`;
  readonly #apiStatDataUrl = `${environment.apiUrl}/StatData`;

  readonly #http = inject(HttpClient);

  // Private signals
  readonly #staffMembers = signal<IStaffMember[]>([]);

  // Public readonly signals for components
  readonly staffMembers = this.#staffMembers.asReadonly();

  constructor() {
    super();
  }

  setStaffMembers(data: IStaffMember[]) {
    this.#staffMembers.set(data);
  }

  getStaffMember(id: unknown): IStaffMember | undefined {
    return this.#staffMembers().find((staffMember) => staffMember.employementCode === id);
  }

  // StaffMember CRUD
  createStaffMember(body: CreateStaffMemberReq): Observable<CreateStaffMemberRes> {
    return this.#http
      .post<CreateStaffMemberRes>(`${this.#staffMemberApiUrl}/create`, body)
      .pipe(catchError(this.handleError<CreateStaffMemberRes>('createStaffMember')));
  }

  getAllStaffMembers(req: GetAllStaffMembersReq): Observable<GetAllStaffMembersRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetAllStaffMembersRes>(`${this.#staffMemberApiUrl}/get-all`, { params })
      .pipe(catchError(this.handleError<GetAllStaffMembersRes>('getAllStaffMembers')));
  }

  updateStaffMember(body: UpdateStaffMemberReq): Observable<UpdateStaffMemberRes> {
    return this.#http
      .post<UpdateStaffMemberRes>(`${this.#staffMemberApiUrl}/update`, body)
      .pipe(catchError(this.handleError<UpdateStaffMemberRes>('updateStaffMember')));
  }

  deleteStaffMember(req: DeleeteStaffMemberReq) {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<GetAllStaffMembersRes>(`${this.#staffMemberApiUrl}/delete-all`, { params })
      .pipe(catchError(this.handleError<GetAllStaffMembersRes>('deleteStaffMember')));
  }

  getAllPercentage(req: GetAllPercentageReq): Observable<GetAllPercentageRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetAllPercentageRes>(`${this.#staffMemberApiUrl}/get-all-percentage`, { params })
      .pipe(catchError(this.handleError<GetAllPercentageRes>('getAllPercentage')));
  }

  updateBulk(body: UpdateBulkReq): Observable<UpdateBulkRes> {
    return this.#http
      .post<UpdateBulkRes>(`${this.#staffMemberApiUrl}/update-bulk`, body)
      .pipe(catchError(this.handleError<UpdateBulkRes>('updateBulk')));
  }

  updateStaffMemberUpdateStatus(req: UpdateStaffMemberUpdateStatusReq): Observable<UpdateStaffMemberRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .put<UpdateStaffMemberRes>(`${this.#staffMemberApiUrl}/update-status`, null, { params })
      .pipe(catchError(this.handleError<UpdateStaffMemberRes>('updateStaffMemberUpdateStatus')));
  }

  getStaffMemberSummary(req: GetStaffMemberSummaryReq): Observable<GetStaffMemberSummaryRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffMemberSummaryRes>(`${this.#staffMemberApiUrl}/get-summary`, { params })
      .pipe(catchError(this.handleError<GetStaffMemberSummaryRes>('getStaffMemberSummary')));
  }

  getStaffMemberStatistics(req: GetStaffMemberStatisticsReq): Observable<GetStaffMemberStatisticsRes> {
    const params = this.makeHttpParams(req);
    const url = `${this.#apiStatDataUrl}/Dashboard/StaffMembers/Statistics`;
    return this.#http
      .get<GetStaffMemberStatisticsRes>(url, { params })
      .pipe(catchError(this.handleError<GetStaffMemberStatisticsRes>('getStaffMemberStatistics')));
  }

  getStaffMemberPermissions(staffMemberId: string): Observable<GetStaffMemberPermissionsResponse> {
    const params = this.makeHttpParams({ StaffMemberId: staffMemberId });
    return this.#http
      .get<GetStaffMemberPermissionsResponse>(`${environment.apiUrl}/Role/get-permissions`, {
        params,
      })
      .pipe(catchError(this.handleError<GetStaffMemberPermissionsResponse>('getStaffMemberPermissions')));
  }

  resetStaffMemberPassword(body: ResetStaffMemberPasswordReq): Observable<ResetStaffMemberPasswordRes> {
    return this.#http
      .post<ResetStaffMemberPasswordRes>(`${this.#staffMemberApiUrl}/reset-password`, body)
      .pipe(catchError(this.handleError<ResetStaffMemberPasswordRes>('resetStaffMemberPassword')));
  }

  updateStaffMemberRoleLocal(staffMemberId: string, roleId: number, roleName: string) {
    const staffMembers = [...this.#staffMembers()];
    const index = staffMembers.findIndex((x) => x.staffMemberId === staffMemberId);
    if (index > -1) {
      staffMembers[index] = { ...staffMembers[index], roleId, roleName };
      this.setStaffMembers(staffMembers);
    }
  }

  saveStaffMemberPermissions(
    body: SaveStaffMemberPermissionsRequest,
  ): Observable<SaveStaffMemberPermissionsResponse> {
    return this.#http
      .post<SaveStaffMemberPermissionsResponse>(
        `${environment.apiUrl}/UserModuleRolePermission/assign-staff-member-permissions`,
        body,
      )
      .pipe(
        catchError(this.handleError<SaveStaffMemberPermissionsResponse>('saveStaffMemberPermissions')),
      );
  }

  /**
   * Sets the institution-wide "editing allowed" default for one staffMember-profile section. The section is
   * named by the `moduleId` in the body, which is why the caller resolves it rather than the
   * interceptor stamping it.
   */
  setStaffMemberSectionDefaults(body: UpdateStaffMemberSectionDefaultsReq): Observable<UpdateBulkRes> {
    return this.#http
      .post<UpdateBulkRes>(`${this.#staffMemberApiUrl}/section-defaults`, body)
      .pipe(catchError(this.handleError<UpdateBulkRes>('setStaffMemberSectionDefaults')));
  }

  // StaffMember bulk import. `ModuleId` / `OperationId` are stamped by
  // `moduleOperationInterceptor` — `Add` on the writes, `View` on the reads (see
  // `MODULE_OPERATION_ROUTES`).
  previewBulkImport(body: FormData): Observable<BulkImportPreviewResponse> {
    return this.#http
      .post<BulkImportPreviewResponse>(`${this.#staffMemberApiUrl}/bulk/preview`, body)
      .pipe(catchError(this.handleError<BulkImportPreviewResponse>('previewBulkImport')));
  }

  confirmBulkImport(body: BulkImportJobRequest): Observable<BulkImportJobResponse> {
    return this.#http
      .post<BulkImportJobResponse>(`${this.#staffMemberApiUrl}/bulk/confirm`, body)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('confirmBulkImport')));
  }

  getBulkImportJob(jobId: string): Observable<BulkImportJobResponse> {
    return this.#http
      .get<BulkImportJobResponse>(`${this.#staffMemberApiUrl}/bulk/jobs/${jobId}`)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('getBulkImportJob')));
  }

  /**
   * The caller's own imports of this master, newest first. Jobs are scoped to the institution *and* the
   * user who created them, so one admin never sees another's. `PageSize` is capped at 100.
   */
  listBulkImportJobs(req: BulkImportJobsRequest = {}): Observable<BulkImportJobsResponse> {
    const params = this.makeHttpParams({ PageNumber: req.pageNumber, PageSize: req.pageSize });
    return this.#http
      .get<BulkImportJobsResponse>(`${this.#staffMemberApiUrl}/bulk/jobs`, { params })
      .pipe(catchError(this.handleError<BulkImportJobsResponse>('listBulkImportJobs')));
  }

  /** Requeues a saved job's failed and incomplete rows; committed rows are never inserted again. */
  retryBulkImport(body: BulkImportJobRequest): Observable<BulkImportJobResponse> {
    return this.#http
      .post<BulkImportJobResponse>(`${this.#staffMemberApiUrl}/bulk/retry`, body)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('retryBulkImport')));
  }

  /**
   * Advisory: `Draft`/`Queued` stop outright, `Running` stops at the next batch boundary, and a
   * terminal job is left alone. Read the returned status - a 200 is not proof of a cancellation.
   */
  cancelBulkImport(body: BulkImportJobRequest): Observable<BulkImportJobResponse> {
    return this.#http
      .post<BulkImportJobResponse>(`${this.#staffMemberApiUrl}/bulk/cancel`, body)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('cancelBulkImport')));
  }

  downloadBulkImportTemplate(): Observable<Blob> {
    return this.#http
      .get(`${this.#staffMemberApiUrl}/bulk/template`, { responseType: 'blob' })
      .pipe(catchError(this.handleError<Blob>('downloadBulkImportTemplate')));
  }

  downloadBulkImportReport(jobId: string): Observable<Blob> {
    return this.#http
      .get(`${this.#staffMemberApiUrl}/bulk/jobs/${jobId}/report`, { responseType: 'blob' })
      .pipe(catchError(this.handleError<Blob>('downloadBulkImportReport')));
  }

  /**
   * Import creates the accounts but sends no mail, so the welcome invitation is a separate,
   * explicit action once the operator has read the results. An omitted `rowNumbers` processes up
   * to 100 eligible rows, which is the whole job for any import this dialog can produce.
   */
  sendBulkImportInvitations(body: BulkImportJobRequest): Observable<BulkImportJobResponse> {
    return this.#http
      .post<BulkImportJobResponse>(`${this.#staffMemberApiUrl}/bulk/send-invitations`, body)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('sendBulkImportInvitations')));
  }
}


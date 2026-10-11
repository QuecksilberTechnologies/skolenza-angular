import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AddStaffEmploymentTypeRequest,
  AppliedStaffMemberFilter,
  BulkImportJobRequest,
  BulkImportJobResponse,
  BulkImportJobsRequest,
  BulkImportJobsResponse,
  BulkImportPreviewResponse,
  DeleteStaffEmploymentTypeRequest,
  StaffEmploymentType,
  GetStaffEmploymentTypeOptionReq,
  GetStaffEmploymentTypesRequest,
  GetStaffEmploymentTypesResponse,
  UpdateStaffEmploymentTypeRequest,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class StaffEmploymentTypesAPI extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/StaffEmploymentType`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #staffEmploymentTypes = signal<StaffEmploymentType[]>([]);
  readonly #appliedAssetFilters = signal<AppliedStaffMemberFilter | null>(null);
  readonly #isLoading = signal(false);

  // Public readonly signals for components
  readonly staffEmploymentTypes = this.#staffEmploymentTypes.asReadonly();
  readonly appliedAssetFilters = this.#appliedAssetFilters.asReadonly();
  readonly isLoading = this.#isLoading.asReadonly();

  constructor() {
    super();
  }

  setStaffEmploymentTypes(data: StaffEmploymentType[]) {
    this.#staffEmploymentTypes.set(data);
  }

  setIsLoading(value: boolean) {
    this.#isLoading.set(value);
  }

  setAppliedAssetFilters(data: AppliedStaffMemberFilter) {
    this.#appliedAssetFilters.set(data);
  }

  addStaffEmploymentType(body: AddStaffEmploymentTypeRequest): Observable<GetStaffEmploymentTypesResponse> {
    return this.#http
      .post<GetStaffEmploymentTypesResponse>(`${this.#apiUrl}/add`, body)
      .pipe(catchError(this.handleError<GetStaffEmploymentTypesResponse>('addStaffEmploymentType')));
  }

  updateStaffEmploymentType(body: UpdateStaffEmploymentTypeRequest): Observable<GetStaffEmploymentTypesResponse> {
    return this.#http
      .put<GetStaffEmploymentTypesResponse>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<GetStaffEmploymentTypesResponse>('updateStaffEmploymentType')));
  }

  deleteStaffEmploymentType(req: DeleteStaffEmploymentTypeRequest): Observable<GetStaffEmploymentTypesResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<GetStaffEmploymentTypesResponse>(`${this.#apiUrl}/delete`, { params })
      .pipe(catchError(this.handleError<GetStaffEmploymentTypesResponse>('deleteStaffEmploymentType')));
  }

  getStaffEmploymentTypes(req: GetStaffEmploymentTypesRequest): Observable<GetStaffEmploymentTypesResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffEmploymentTypesResponse>(`${this.#apiUrl}/get`, { params })
      .pipe(catchError(this.handleError<GetStaffEmploymentTypesResponse>('getStaffEmploymentTypes')));
  }

  getStaffEmploymentTypeOptions(req: GetStaffEmploymentTypeOptionReq): Observable<GetStaffEmploymentTypesResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffEmploymentTypesResponse>(`${this.#apiUrl}/option`, { params })
      .pipe(catchError(this.handleError<GetStaffEmploymentTypesResponse>('getStaffEmploymentTypeOptions')));
  }

  // StaffMember type bulk import. `ModuleId` / `OperationId` are stamped by
  // `moduleOperationInterceptor` — `Add` on the writes, `View` on the reads (see
  // `MODULE_OPERATION_ROUTES`).
  previewBulkImport(body: FormData): Observable<BulkImportPreviewResponse> {
    return this.#http
      .post<BulkImportPreviewResponse>(`${this.#apiUrl}/bulk/preview`, body)
      .pipe(catchError(this.handleError<BulkImportPreviewResponse>('previewBulkImport')));
  }

  confirmBulkImport(body: BulkImportJobRequest): Observable<BulkImportJobResponse> {
    return this.#http
      .post<BulkImportJobResponse>(`${this.#apiUrl}/bulk/confirm`, body)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('confirmBulkImport')));
  }

  getBulkImportJob(jobId: string): Observable<BulkImportJobResponse> {
    return this.#http
      .get<BulkImportJobResponse>(`${this.#apiUrl}/bulk/jobs/${jobId}`)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('getBulkImportJob')));
  }

  /**
   * The caller's own imports of this master, newest first. Jobs are scoped to the institution *and* the
   * user who created them, so one admin never sees another's. `PageSize` is capped at 100.
   */
  listBulkImportJobs(req: BulkImportJobsRequest = {}): Observable<BulkImportJobsResponse> {
    const params = this.makeHttpParams({ PageNumber: req.pageNumber, PageSize: req.pageSize });
    return this.#http
      .get<BulkImportJobsResponse>(`${this.#apiUrl}/bulk/jobs`, { params })
      .pipe(catchError(this.handleError<BulkImportJobsResponse>('listBulkImportJobs')));
  }

  /** Requeues a saved job's failed and incomplete rows; committed rows are never inserted again. */
  retryBulkImport(body: BulkImportJobRequest): Observable<BulkImportJobResponse> {
    return this.#http
      .post<BulkImportJobResponse>(`${this.#apiUrl}/bulk/retry`, body)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('retryBulkImport')));
  }

  /**
   * Advisory: `Draft`/`Queued` stop outright, `Running` stops at the next batch boundary, and a
   * terminal job is left alone. Read the returned status - a 200 is not proof of a cancellation.
   */
  cancelBulkImport(body: BulkImportJobRequest): Observable<BulkImportJobResponse> {
    return this.#http
      .post<BulkImportJobResponse>(`${this.#apiUrl}/bulk/cancel`, body)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('cancelBulkImport')));
  }

  downloadBulkImportTemplate(): Observable<Blob> {
    return this.#http
      .get(`${this.#apiUrl}/bulk/template`, { responseType: 'blob' })
      .pipe(catchError(this.handleError<Blob>('downloadBulkImportTemplate')));
  }

  downloadBulkImportReport(jobId: string): Observable<Blob> {
    return this.#http
      .get(`${this.#apiUrl}/bulk/jobs/${jobId}/report`, { responseType: 'blob' })
      .pipe(catchError(this.handleError<Blob>('downloadBulkImportReport')));
  }
}


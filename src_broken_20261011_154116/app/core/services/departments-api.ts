import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AddDepartmentRequest,
  BulkImportJobRequest,
  BulkImportJobResponse,
  BulkImportJobsRequest,
  BulkImportJobsResponse,
  BulkImportPreviewResponse,
  DeleteDepartmentRequest,
  GetDepartmentsOptionResponse,
  GetDepartmentsOptionsReq,
  GetDepartmentsRequest,
  GetDepartmentsResponse,
  UpdateDepartmentRequest,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class DepartmentsApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Department`;
  readonly #http = inject(HttpClient);

  addDepartment(body: AddDepartmentRequest): Observable<GetDepartmentsResponse> {
    return this.#http
      .post<GetDepartmentsResponse>(`${this.#apiUrl}/add`, body)
      .pipe(catchError(this.handleError<GetDepartmentsResponse>('addDepartment')));
  }

  getDepartments(req: GetDepartmentsRequest): Observable<GetDepartmentsResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetDepartmentsResponse>(`${this.#apiUrl}/get`, { params })
      .pipe(catchError(this.handleError<GetDepartmentsResponse>('getDepartments')));
  }

  getDepartmentsOptions(req: GetDepartmentsOptionsReq): Observable<GetDepartmentsOptionResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetDepartmentsOptionResponse>(`${this.#apiUrl}/option`, { params })
      .pipe(catchError(this.handleError<GetDepartmentsOptionResponse>('getDepartmentsOptions')));
  }

  updateDepartment(body: UpdateDepartmentRequest): Observable<GetDepartmentsResponse> {
    return this.#http
      .put<GetDepartmentsResponse>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<GetDepartmentsResponse>('updateDepartment')));
  }

  deleteDepartment(req: DeleteDepartmentRequest): Observable<GetDepartmentsResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<GetDepartmentsResponse>(`${this.#apiUrl}/delete`, { params })
      .pipe(catchError(this.handleError<GetDepartmentsResponse>('deleteDepartment')));
  }

  // Department bulk import. `ModuleId` / `OperationId` are stamped by `moduleOperationInterceptor` —
  // `Add` on the writes, `View` on the reads (see `MODULE_OPERATION_ROUTES`).
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

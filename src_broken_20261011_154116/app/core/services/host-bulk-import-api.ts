import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  BulkImportJobRequest,
  BulkImportJobResponse,
  BulkImportJobsRequest,
  BulkImportJobsResponse,
  BulkImportPreviewResponse,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/**
 * The Host catalogues that publish the flat `import/*` family. The value is the controller segment,
 * so the target doubles as the URL it builds.
 */
export type HostBulkImportTarget =
  | 'Module'
  | 'ChildModule'
  | 'Operation'
  | 'ModuleOperation'
  | 'DeviceMaster'
  | 'InstitutionCardMaster';

/**
 * The Host bulk-import family (`/api/{target}/import/*`), one service for all six catalogues.
 *
 * Unlike the institution `{master}/bulk/*` family, every route here is flat: `jobId` and paging travel
 * as query params (`JobId`, `PageNumber`, `PageSize`) rather than as a path segment, and the
 * confirm/retry/cancel body is `HostBulkImportJobRequestDTO`, which adds an optional `institutionId` the
 * institution-scoped masters' DTO does not have - a Host session is not implicitly scoped to one institution
 * the way a logged-in institution admin's JWT is. The global catalogues leave it unset;
 * `InstitutionCardMaster` is the one target that imports on a institution's behalf and sets it.
 *
 * `ModuleId` / `OperationId` are stamped by `moduleOperationInterceptor` - `Add` on the writes and
 * `View` on the reads, see `MODULE_OPERATION_ROUTES`.
 */
@Injectable({
  providedIn: 'root',
})
export class HostBulkImportApi extends BaseService {
  readonly #http = inject(HttpClient);

  #url(target: HostBulkImportTarget): string {
    const controller = target === 'InstitutionCardMaster' ? 'InstitutionCardMaster' : target;
    return `${environment.apiUrl}/${controller}/import`;
  }

  previewBulkImport(
    target: HostBulkImportTarget,
    body: FormData,
  ): Observable<BulkImportPreviewResponse> {
    return this.#http
      .post<BulkImportPreviewResponse>(`${this.#url(target)}/preview`, body)
      .pipe(catchError(this.handleError<BulkImportPreviewResponse>('previewBulkImport')));
  }

  confirmBulkImport(
    target: HostBulkImportTarget,
    body: BulkImportJobRequest,
  ): Observable<BulkImportJobResponse> {
    return this.#http
      .post<BulkImportJobResponse>(`${this.#url(target)}/confirm`, body)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('confirmBulkImport')));
  }

  getBulkImportJob(
    target: HostBulkImportTarget,
    jobId: string,
    institutionId?: string | null,
  ): Observable<BulkImportJobResponse> {
    const params = this.makeHttpParams({ JobId: jobId, InstitutionId: institutionId });
    return this.#http
      .get<BulkImportJobResponse>(`${this.#url(target)}/job`, { params })
      .pipe(catchError(this.handleError<BulkImportJobResponse>('getBulkImportJob')));
  }

  /** Lists only the authenticated Host user's own jobs for this target and institution. */
  listBulkImportJobs(
    target: HostBulkImportTarget,
    req: BulkImportJobsRequest = {},
  ): Observable<BulkImportJobsResponse> {
    const params = this.makeHttpParams({
      PageNumber: req.pageNumber,
      PageSize: req.pageSize,
      InstitutionId: req.institutionId,
    });
    return this.#http
      .get<BulkImportJobsResponse>(`${this.#url(target)}/jobs`, { params })
      .pipe(catchError(this.handleError<BulkImportJobsResponse>('listBulkImportJobs')));
  }

  /** Retries a job's failed rows; committed rows are never inserted again. */
  retryBulkImport(
    target: HostBulkImportTarget,
    body: BulkImportJobRequest,
  ): Observable<BulkImportJobResponse> {
    return this.#http
      .post<BulkImportJobResponse>(`${this.#url(target)}/retry`, body)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('retryBulkImport')));
  }

  /** Cancels Draft/Queued/Running jobs at batch boundaries; committed rows remain. */
  cancelBulkImport(
    target: HostBulkImportTarget,
    body: BulkImportJobRequest,
  ): Observable<BulkImportJobResponse> {
    return this.#http
      .post<BulkImportJobResponse>(`${this.#url(target)}/cancel`, body)
      .pipe(catchError(this.handleError<BulkImportJobResponse>('cancelBulkImport')));
  }

  downloadBulkImportTemplate(
    target: HostBulkImportTarget,
    institutionId?: string | null,
  ): Observable<Blob> {
    const params = this.makeHttpParams({ InstitutionId: institutionId });
    return this.#http
      .get(`${this.#url(target)}/template`, { params, responseType: 'blob' })
      .pipe(catchError(this.handleError<Blob>('downloadBulkImportTemplate')));
  }

  /** Card numbers are masked in the downloaded report. */
  downloadBulkImportReport(
    target: HostBulkImportTarget,
    jobId: string,
    institutionId?: string | null,
  ): Observable<Blob> {
    const params = this.makeHttpParams({ JobId: jobId, InstitutionId: institutionId });
    return this.#http
      .get(`${this.#url(target)}/report`, { params, responseType: 'blob' })
      .pipe(catchError(this.handleError<Blob>('downloadBulkImportReport')));
  }
}

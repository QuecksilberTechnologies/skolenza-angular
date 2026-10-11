import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, delay, map, Observable, of } from 'rxjs';

import {
  AddOkrRequest,
  ArchiveOkrRequest,
  DeleteOkrRequest,
  DuplicateOkrRequest,
  GetOkrDetailExtrasResponse,
  GetOkrResponse,
  GetOkrsRequest,
  GetOkrsResponse,
  GetOkrStatsResponse,
  IOkr,
  IOkrAttachment,
  OkrApiResponse,
  UpdateOkrRequest,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/**
 * OKR API service.
 *
 * No OKR endpoints exist on the backend yet, so reads are served from static mock
 * JSON (Holiday-page pattern) and mutations return a synthetic success envelope —
 * the store applies the optimistic update. Swap each `http.get('data/…')` /
 * `of(...)` for the commented real-HTTP line once the backend ships; components and
 * the store stay untouched.
 */
@Injectable({
  providedIn: 'root',
})
export class OkrApi extends BaseService {
  // readonly #apiUrl = `${environment.apiUrl}/Okr`;
  readonly #http = inject(HttpClient);
  readonly #mockLatency = 400;

  getOkrs(req: GetOkrsRequest): Observable<GetOkrsResponse> {
    // return this.#http.get<GetOkrsResponse>(`${this.#apiUrl}/get`, { params: this.makeHttpParams(req) })
    return this.#http.get<GetOkrsResponse>('data/okr.json').pipe(
      delay(this.#mockLatency),
      map((res) => this.#applyQuery(res, req)),
      catchError(this.handleError<GetOkrsResponse>('getOkrs')),
    );
  }

  getOkr(id: string): Observable<GetOkrResponse> {
    // return this.#http.get<GetOkrResponse>(`${this.#apiUrl}/${id}`)
    return this.#http.get<GetOkrsResponse>('data/okr.json').pipe(
      delay(this.#mockLatency),
      map((res) => {
        const okr = res.data.find((o) => o.id === id) ?? null;
        return {
          isSucceeded: !!okr,
          message: okr ? 'OK' : 'OKR not found',
          errors: [],
          data: okr as IOkr,
        } satisfies GetOkrResponse;
      }),
      catchError(this.handleError<GetOkrResponse>('getOkr')),
    );
  }

  getOkrStats(): Observable<GetOkrStatsResponse> {
    // return this.#http.get<GetOkrStatsResponse>(`${this.#apiUrl}/stats`)
    return this.#http
      .get<GetOkrStatsResponse>('data/okr-stats.json')
      .pipe(
        delay(this.#mockLatency),
        catchError(this.handleError<GetOkrStatsResponse>('getOkrStats')),
      );
  }

  getOkrDetailExtras(id: string): Observable<GetOkrDetailExtrasResponse> {
    // return this.#http.get<GetOkrDetailExtrasResponse>(`${this.#apiUrl}/${id}/extras`)
    void id;
    return this.#http
      .get<GetOkrDetailExtrasResponse>('data/okr-detail-extras.json')
      .pipe(
        delay(this.#mockLatency),
        catchError(this.handleError<GetOkrDetailExtrasResponse>('getOkrDetailExtras')),
      );
  }

  addOkr(body: AddOkrRequest): Observable<GetOkrResponse> {
    // return this.#http.post<GetOkrResponse>(`${this.#apiUrl}/add`, body)
    const created: IOkr = {
      ...body.okr,
      id: this.#newId(),
      createdDate: new Date().toISOString(),
      isActive: true,
    };
    return this.#ok(created, 'OKR created successfully');
  }

  updateOkr(body: UpdateOkrRequest): Observable<GetOkrResponse> {
    // return this.#http.put<GetOkrResponse>(`${this.#apiUrl}/update`, body)
    return this.#ok(body.okr, 'OKR updated successfully');
  }

  deleteOkr(body: DeleteOkrRequest): Observable<GetOkrResponse> {
    // return this.#http.delete<GetOkrResponse>(`${this.#apiUrl}/${body.id}`)
    void body;
    return this.#ok(null as unknown as IOkr, 'OKR deleted successfully');
  }

  archiveOkr(body: ArchiveOkrRequest): Observable<GetOkrResponse> {
    // return this.#http.post<GetOkrResponse>(`${this.#apiUrl}/archive`, body)
    void body;
    return this.#ok(null as unknown as IOkr, 'OKR archived successfully');
  }

  duplicateOkr(body: DuplicateOkrRequest): Observable<GetOkrResponse> {
    // return this.#http.post<GetOkrResponse>(`${this.#apiUrl}/duplicate`, body)
    void body;
    return this.#ok(null as unknown as IOkr, 'OKR duplicated successfully');
  }

  /** Mock attachment download — backend would stream the file/redirect to a signed URL. */
  downloadAttachment(attachment: IOkrAttachment): Observable<OkrApiResponse<IOkrAttachment>> {
    // return this.#http.get(`${this.#apiUrl}/attachments/${attachment.id}`, { responseType: 'blob' })
    return of<OkrApiResponse<IOkrAttachment>>({
      isSucceeded: true,
      message: `Downloading ${attachment.fileName}`,
      errors: [],
      data: attachment,
    }).pipe(delay(this.#mockLatency));
  }

  /** Mock attachment upload — backend would accept multipart form data. */
  uploadAttachment(okrId: string, file: File): Observable<OkrApiResponse<IOkrAttachment>> {
    // const form = new FormData(); form.append('file', file);
    // return this.#http.post(`${this.#apiUrl}/${okrId}/attachments`, form)
    void okrId;
    const attachment: IOkrAttachment = {
      id: this.#newId(),
      fileName: file.name,
      sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      uploadedBy: 'You',
      uploadedAt: new Date().toISOString(),
    };
    return of<OkrApiResponse<IOkrAttachment>>({
      isSucceeded: true,
      message: 'Attachment uploaded',
      errors: [],
      data: attachment,
    }).pipe(delay(this.#mockLatency));
  }

  #ok(data: IOkr, message: string): Observable<GetOkrResponse> {
    return of<GetOkrResponse>({ isSucceeded: true, message, errors: [], data }).pipe(
      delay(this.#mockLatency),
    );
  }

  #newId(): string {
    return `okr-${Math.floor(performance.now()).toString(36)}-${(crypto.randomUUID?.() ?? '').slice(0, 8)}`;
  }

  /** Client-side filter/search/sort/paginate over the mock dataset. */
  #applyQuery(res: GetOkrsResponse, req: GetOkrsRequest): GetOkrsResponse {
    if (!res.isSucceeded) {
      return res;
    }

    let rows = res.data.filter((o) => o.isActive === req.IsActive || req.IsActive === undefined);

    if (req.Scope === 'company') {
      rows = rows.filter((o) => o.level === 'Company');
    } else if (req.Scope === 'my' && req.UserStaffMemberId) {
      const MY_COUNT = 4; // mock: how many OKRs the signed-in user "owns"
      rows = rows
        .map((o, i) =>
          i < MY_COUNT ? { ...o, ownerStaffMemberId: req.UserStaffMemberId!, ownerName: 'You' } : o,
        )
        .filter((o) => o.ownerStaffMemberId === req.UserStaffMemberId);
    }
    if (req.Level) rows = rows.filter((o) => o.level === req.Level);
    if (req.DepartmentId) rows = rows.filter((o) => o.departmentId === req.DepartmentId);
    if (req.Quarter) rows = rows.filter((o) => o.quarter === req.Quarter);
    if (req.Status) rows = rows.filter((o) => o.status === req.Status);

    if (req.SearchTerm) {
      const term = req.SearchTerm.toLowerCase();
      rows = rows.filter(
        (o) =>
          o.title.toLowerCase().includes(term) ||
          o.ownerName.toLowerCase().includes(term) ||
          o.department.toLowerCase().includes(term),
      );
    }

    if (req.SortBy) {
      const dir = req.SortOrder === 'asc' ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const av = a[req.SortBy as keyof IOkr] as string | number;
        const bv = b[req.SortBy as keyof IOkr] as string | number;
        return av > bv ? dir : av < bv ? -dir : 0;
      });
    }

    const total = rows.length;
    const size = req.PageSize || 10;
    const start = ((req.PageNumber || 1) - 1) * size;
    const paged = rows.slice(start, start + size);

    return { ...res, data: paged, totalRecords: total };
  }
}

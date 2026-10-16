import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AttendanceConfigMutationRes,
  CreateCampusReq,
  GetCampusRes,
  GetCampusesReq,
  GetCampusesRes,
  UpdateCampusReq,
  UpdateCampusStatusReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/**
 * `/api/Campus` — the institution's work sites.
 *
 * Institution-scoped: a HOST session gets `401 "Inactive user."` from every endpoint here, which is why
 * the host institution-device form's location dropdown is empty (see
 * `docs/api-coverage/api-issues-for-backend.md`, Issue 1).
 */
@Injectable({
  providedIn: 'root',
})
export class CampusApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Campus`;
  readonly #http = inject(HttpClient);

  getCampuses(req: GetCampusesReq): Observable<GetCampusesRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetCampusesRes>(`${this.#apiUrl}/get-all`, { params })
      .pipe(catchError(this.handleError<GetCampusesRes>('getCampuses')));
  }

  /** `institutionId` is host-only, like the list's `InstitutionId`; a institution session leaves it off. */
  getCampus(id: number, institutionId?: string | null): Observable<GetCampusRes> {
    const params = this.makeHttpParams({ InstitutionId: institutionId });
    return this.#http
      .get<GetCampusRes>(`${this.#apiUrl}/get-by-id/${id}`, { params })
      .pipe(catchError(this.handleError<GetCampusRes>('getCampus')));
  }

  addCampus(body: CreateCampusReq): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('addCampus')));
  }

  /** `/update` replaces the record, so the body has to carry every field, not just the changed ones. */
  updateCampus(body: UpdateCampusReq): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('updateCampus')));
  }

  /** Rejected while devices, assignments, arrangements, patterns or overrides still reference it. */
  setCampusStatus(
    body: UpdateCampusStatusReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/update-status`, body)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('setCampusStatus')));
  }

  deleteCampus(id: number): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .delete<AttendanceConfigMutationRes>(`${this.#apiUrl}/delete/${id}`)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('deleteCampus')));
  }
}


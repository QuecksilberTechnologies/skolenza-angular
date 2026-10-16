import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AttendanceConfigMutationRes,
  CreateInstitutionLocationReq,
  GetInstitutionLocationRes,
  GetInstitutionLocationsReq,
  GetInstitutionLocationsRes,
  UpdateInstitutionLocationReq,
  UpdateInstitutionLocationStatusReq,
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
export class InstitutionLocationApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Campus`;
  readonly #http = inject(HttpClient);

  getInstitutionLocations(req: GetInstitutionLocationsReq): Observable<GetInstitutionLocationsRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInstitutionLocationsRes>(`${this.#apiUrl}/get-all`, { params })
      .pipe(catchError(this.handleError<GetInstitutionLocationsRes>('getInstitutionLocations')));
  }

  /** `institutionId` is host-only, like the list's `InstitutionId`; a institution session leaves it off. */
  getInstitutionLocation(id: number, institutionId?: string | null): Observable<GetInstitutionLocationRes> {
    const params = this.makeHttpParams({ InstitutionId: institutionId });
    return this.#http
      .get<GetInstitutionLocationRes>(`${this.#apiUrl}/get-by-id/${id}`, { params })
      .pipe(catchError(this.handleError<GetInstitutionLocationRes>('getInstitutionLocation')));
  }

  addInstitutionLocation(body: CreateInstitutionLocationReq): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('addInstitutionLocation')));
  }

  /** `/update` replaces the record, so the body has to carry every field, not just the changed ones. */
  updateInstitutionLocation(body: UpdateInstitutionLocationReq): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('updateInstitutionLocation')));
  }

  /** Rejected while devices, assignments, arrangements, patterns or overrides still reference it. */
  setInstitutionLocationStatus(
    body: UpdateInstitutionLocationStatusReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/update-status`, body)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('setInstitutionLocationStatus')));
  }

  deleteInstitutionLocation(id: number): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .delete<AttendanceConfigMutationRes>(`${this.#apiUrl}/delete/${id}`)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('deleteInstitutionLocation')));
  }
}


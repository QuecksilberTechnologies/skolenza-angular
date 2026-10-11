import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AttendanceConfigMutationRes,
  CreateStaffMemberWorkArrangementReq,
  GetAttendancePolicyOptionsReq,
  GetAttendancePolicyOptionsRes,
  GetStaffMemberWorkArrangementRes,
  GetStaffMemberWorkArrangementsReq,
  GetStaffMemberWorkArrangementsRes,
  UpdateStaffMemberWorkArrangementReq,
  UpdateStaffMemberWorkArrangementStatusReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/**
 * `/api/StaffWorkArrangement` — an staffMember's permanent working arrangement. Institution-scoped.
 *
 * An staffMember holds at most one current active arrangement and creating a second does not replace
 * the first; the backend rejects it.
 */
@Injectable({
  providedIn: 'root',
})
export class StaffMemberWorkArrangementApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/StaffWorkArrangement`;
  readonly #http = inject(HttpClient);

  getStaffMemberWorkArrangements(
    req: GetStaffMemberWorkArrangementsReq,
  ): Observable<GetStaffMemberWorkArrangementsRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffMemberWorkArrangementsRes>(`${this.#apiUrl}/get-all`, { params })
      .pipe(
        catchError(this.handleError<GetStaffMemberWorkArrangementsRes>('getStaffMemberWorkArrangements')),
      );
  }

  getStaffMemberWorkArrangement(id: number): Observable<GetStaffMemberWorkArrangementRes> {
    return this.#http
      .get<GetStaffMemberWorkArrangementRes>(`${this.#apiUrl}/get-by-id/${id}`)
      .pipe(
        catchError(this.handleError<GetStaffMemberWorkArrangementRes>('getStaffMemberWorkArrangement')),
      );
  }

  /** Published policy versions effective on `EffectiveOn`. An empty success means none published yet. */
  getAttendancePolicyOptions(
    req: GetAttendancePolicyOptionsReq,
  ): Observable<GetAttendancePolicyOptionsRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetAttendancePolicyOptionsRes>(`${this.#apiUrl}/attendance-policy-options`, { params })
      .pipe(
        catchError(this.handleError<GetAttendancePolicyOptionsRes>('getAttendancePolicyOptions')),
      );
  }

  addStaffMemberWorkArrangement(
    body: CreateStaffMemberWorkArrangementReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/create`, body)
      .pipe(
        catchError(this.handleError<AttendanceConfigMutationRes>('addStaffMemberWorkArrangement')),
      );
  }

  /** `/update` replaces the record, so the body has to carry every field, not just the changed ones. */
  updateStaffMemberWorkArrangement(
    body: UpdateStaffMemberWorkArrangementReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/update`, body)
      .pipe(
        catchError(this.handleError<AttendanceConfigMutationRes>('updateStaffMemberWorkArrangement')),
      );
  }

  /** Rejected while work patterns or work-mode overrides still hang off the arrangement. */
  setStaffMemberWorkArrangementStatus(
    body: UpdateStaffMemberWorkArrangementStatusReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/update-status`, body)
      .pipe(
        catchError(
          this.handleError<AttendanceConfigMutationRes>('setStaffMemberWorkArrangementStatus'),
        ),
      );
  }

  deleteStaffMemberWorkArrangement(id: number): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .delete<AttendanceConfigMutationRes>(`${this.#apiUrl}/delete/${id}`)
      .pipe(
        catchError(this.handleError<AttendanceConfigMutationRes>('deleteStaffMemberWorkArrangement')),
      );
  }
}


import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AttendanceConfigMutationRes,
  CreateAttendancePolicyReq,
  GetAttendancePoliciesReq,
  GetAttendancePoliciesRes,
  GetAttendancePolicyRes,
  UpdateAttendancePolicyReq,
  UpdateAttendancePolicyStatusReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/** `/api/AttendancePolicy` — institution attendance rules. Institution-scoped. */
@Injectable({
  providedIn: 'root',
})
export class AttendancePolicyApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/AttendancePolicy`;
  readonly #http = inject(HttpClient);

  getAttendancePolicies(req: GetAttendancePoliciesReq): Observable<GetAttendancePoliciesRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetAttendancePoliciesRes>(`${this.#apiUrl}/get-all`, { params })
      .pipe(catchError(this.handleError<GetAttendancePoliciesRes>('getAttendancePolicies')));
  }

  getAttendancePolicy(id: number): Observable<GetAttendancePolicyRes> {
    return this.#http
      .get<GetAttendancePolicyRes>(`${this.#apiUrl}/get-by-id/${id}`)
      .pipe(catchError(this.handleError<GetAttendancePolicyRes>('getAttendancePolicy')));
  }

  addAttendancePolicy(body: CreateAttendancePolicyReq): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('addAttendancePolicy')));
  }

  /** `/update` replaces the record, so the body has to carry every field, not just the changed ones. */
  updateAttendancePolicy(body: UpdateAttendancePolicyReq): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('updateAttendancePolicy')));
  }

  /** Rejected while an active `StaffMemberWorkArrangement` uses the policy. */
  setAttendancePolicyStatus(
    body: UpdateAttendancePolicyStatusReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/update-status`, body)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('setAttendancePolicyStatus')));
  }

  deleteAttendancePolicy(id: number): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .delete<AttendanceConfigMutationRes>(`${this.#apiUrl}/delete/${id}`)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('deleteAttendancePolicy')));
  }
}

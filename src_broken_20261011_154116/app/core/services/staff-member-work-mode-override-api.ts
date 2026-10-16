import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AttendanceConfigMutationRes,
  CreateStaffMemberWorkModeOverrideReq,
  StaffMemberWorkModeOverrideDecisionReq,
  GetStaffMemberWorkModeOverrideRes,
  GetStaffMemberWorkModeOverridesReq,
  GetStaffMemberWorkModeOverridesRes,
  UpdateStaffMemberWorkModeOverrideReq,
  UpdateStaffMemberWorkModeOverrideStatusReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/**
 * `/api/StaffWorkModeOverride` — temporary work-mode exceptions. Institution-scoped.
 *
 * The controller is `StaffMemberWorkModeOverride`, not `StaffMemberWorkModeOverrideRequest` as the backend
 * spec document calls it.
 *
 * `update-status` controls the record lifecycle. Approval uses the separate permission-protected
 * `approve` and `reject` routes.
 */
@Injectable({
  providedIn: 'root',
})
export class StaffMemberWorkModeOverrideApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/StaffWorkModeOverride`;
  readonly #http = inject(HttpClient);

  getStaffMemberWorkModeOverrides(
    req: GetStaffMemberWorkModeOverridesReq,
  ): Observable<GetStaffMemberWorkModeOverridesRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffMemberWorkModeOverridesRes>(`${this.#apiUrl}/get-all`, { params })
      .pipe(
        catchError(
          this.handleError<GetStaffMemberWorkModeOverridesRes>('getStaffMemberWorkModeOverrides'),
        ),
      );
  }

  getStaffMemberWorkModeOverride(id: number): Observable<GetStaffMemberWorkModeOverrideRes> {
    return this.#http
      .get<GetStaffMemberWorkModeOverrideRes>(`${this.#apiUrl}/get-by-id/${id}`)
      .pipe(
        catchError(this.handleError<GetStaffMemberWorkModeOverrideRes>('getStaffMemberWorkModeOverride')),
      );
  }

  addStaffMemberWorkModeOverride(
    body: CreateStaffMemberWorkModeOverrideReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/create`, body)
      .pipe(
        catchError(this.handleError<AttendanceConfigMutationRes>('addStaffMemberWorkModeOverride')),
      );
  }

  /** `/update` replaces the record, so the body has to carry every field, not just the changed ones. */
  updateStaffMemberWorkModeOverride(
    body: UpdateStaffMemberWorkModeOverrideReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/update`, body)
      .pipe(
        catchError(this.handleError<AttendanceConfigMutationRes>('updateStaffMemberWorkModeOverride')),
      );
  }

  setStaffMemberWorkModeOverrideStatus(
    body: UpdateStaffMemberWorkModeOverrideStatusReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/update-status`, body)
      .pipe(
        catchError(
          this.handleError<AttendanceConfigMutationRes>('setStaffMemberWorkModeOverrideStatus'),
        ),
      );
  }

  deleteStaffMemberWorkModeOverride(id: number): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .delete<AttendanceConfigMutationRes>(`${this.#apiUrl}/delete/${id}`)
      .pipe(
        catchError(this.handleError<AttendanceConfigMutationRes>('deleteStaffMemberWorkModeOverride')),
      );
  }

  approveStaffMemberWorkModeOverride(
    body: StaffMemberWorkModeOverrideDecisionReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/approve`, body)
      .pipe(
        catchError(
          this.handleError<AttendanceConfigMutationRes>('approveStaffMemberWorkModeOverride'),
        ),
      );
  }

  rejectStaffMemberWorkModeOverride(
    body: StaffMemberWorkModeOverrideDecisionReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/reject`, body)
      .pipe(
        catchError(this.handleError<AttendanceConfigMutationRes>('rejectStaffMemberWorkModeOverride')),
      );
  }
}


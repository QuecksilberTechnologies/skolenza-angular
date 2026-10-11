import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AttendanceConfigMutationRes,
  CreateStaffMemberWorkPatternReq,
  GetStaffMemberWorkPatternRes,
  GetStaffMemberWorkPatternsReq,
  GetStaffMemberWorkPatternsRes,
  UpdateStaffMemberWorkPatternReq,
  UpdateStaffMemberWorkPatternStatusReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/** `/api/StaffWorkPattern` — the weekday rows of a work arrangement. Institution-scoped. */
@Injectable({
  providedIn: 'root',
})
export class StaffMemberWorkPatternApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/StaffWorkPattern`;
  readonly #http = inject(HttpClient);

  getStaffMemberWorkPatterns(req: GetStaffMemberWorkPatternsReq): Observable<GetStaffMemberWorkPatternsRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffMemberWorkPatternsRes>(`${this.#apiUrl}/get-all`, { params })
      .pipe(catchError(this.handleError<GetStaffMemberWorkPatternsRes>('getStaffMemberWorkPatterns')));
  }

  getStaffMemberWorkPattern(id: number): Observable<GetStaffMemberWorkPatternRes> {
    return this.#http
      .get<GetStaffMemberWorkPatternRes>(`${this.#apiUrl}/get-by-id/${id}`)
      .pipe(catchError(this.handleError<GetStaffMemberWorkPatternRes>('getStaffMemberWorkPattern')));
  }

  addStaffMemberWorkPattern(
    body: CreateStaffMemberWorkPatternReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('addStaffMemberWorkPattern')));
  }

  /** `/update` replaces the record, so the body has to carry every field, not just the changed ones. */
  updateStaffMemberWorkPattern(
    body: UpdateStaffMemberWorkPatternReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('updateStaffMemberWorkPattern')));
  }

  setStaffMemberWorkPatternStatus(
    body: UpdateStaffMemberWorkPatternStatusReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/update-status`, body)
      .pipe(
        catchError(this.handleError<AttendanceConfigMutationRes>('setStaffMemberWorkPatternStatus')),
      );
  }

  deleteStaffMemberWorkPattern(id: number): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .delete<AttendanceConfigMutationRes>(`${this.#apiUrl}/delete/${id}`)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('deleteStaffMemberWorkPattern')));
  }
}


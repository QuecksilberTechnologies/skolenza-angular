import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  GetAttendanceDeviceTypesRes,
  GetAttendanceTodayRes,
  MarkAttendanceReq,
  MarkAttendanceRes,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/**
 * `/api/Attendance` — the signed-in staffMember's own punches. Every route resolves the staffMember from
 * the bearer token, so none takes an StaffMemberId, ModuleId or OperationId.
 */
@Injectable({
  providedIn: 'root',
})
export class AttendanceApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Attendance`;
  readonly #http = inject(HttpClient);

  getToday(): Observable<GetAttendanceTodayRes> {
    return this.#http
      .get<GetAttendanceTodayRes>(`${this.#apiUrl}/today`)
      .pipe(catchError(this.handleError<GetAttendanceTodayRes>('getToday')));
  }

  getDeviceTypes(): Observable<GetAttendanceDeviceTypesRes> {
    return this.#http
      .get<GetAttendanceDeviceTypesRes>(`${this.#apiUrl}/device-types`)
      .pipe(catchError(this.handleError<GetAttendanceDeviceTypesRes>('getDeviceTypes')));
  }

  markAttendance(body: MarkAttendanceReq): Observable<MarkAttendanceRes> {
    return this.#http
      .post<MarkAttendanceRes>(`${this.#apiUrl}/mark-attendance`, body)
      .pipe(catchError(this.handleError<MarkAttendanceRes>('markAttendance')));
  }
}

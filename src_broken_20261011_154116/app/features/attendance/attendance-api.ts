import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { BaseService } from '@core/services/base-service';

import { GetAttendanceResponse, GetStaffMembersShortResponse } from './attendance.model';

@Injectable({
  providedIn: 'root',
})
export class AttendanceAPI extends BaseService {
  readonly #http = inject(HttpClient);

  getAttendance(): Observable<GetAttendanceResponse> {
    return this.#http
      .get<GetAttendanceResponse>('data/attendance.json')
      .pipe(catchError(this.handleError<GetAttendanceResponse>('getAttendance')));
  }

  getStaffMembersShort(): Observable<GetStaffMembersShortResponse> {
    return this.#http
      .get<GetStaffMembersShortResponse>('data/staffMembers-short.json')
      .pipe(catchError(this.handleError<GetStaffMembersShortResponse>('getStaffMembersShort')));
  }
}

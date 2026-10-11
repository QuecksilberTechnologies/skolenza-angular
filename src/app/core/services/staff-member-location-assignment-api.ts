import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AttendanceConfigMutationRes,
  CreateStaffMemberLocationAssignmentReq,
  GetStaffMemberLocationAssignmentRes,
  GetStaffMemberLocationAssignmentsReq,
  GetStaffMemberLocationAssignmentsRes,
  UpdateStaffMemberLocationAssignmentReq,
  UpdateStaffMemberLocationAssignmentStatusReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/** `/api/StaffCampusAssignment` — which locations an staffMember may work from. Institution-scoped. */
@Injectable({
  providedIn: 'root',
})
export class StaffMemberLocationAssignmentApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/StaffCampusAssignment`;
  readonly #http = inject(HttpClient);

  getStaffMemberLocationAssignments(
    req: GetStaffMemberLocationAssignmentsReq,
  ): Observable<GetStaffMemberLocationAssignmentsRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffMemberLocationAssignmentsRes>(`${this.#apiUrl}/get-all`, { params })
      .pipe(
        catchError(
          this.handleError<GetStaffMemberLocationAssignmentsRes>('getStaffMemberLocationAssignments'),
        ),
      );
  }

  getStaffMemberLocationAssignment(id: number): Observable<GetStaffMemberLocationAssignmentRes> {
    return this.#http
      .get<GetStaffMemberLocationAssignmentRes>(`${this.#apiUrl}/get-by-id/${id}`)
      .pipe(
        catchError(
          this.handleError<GetStaffMemberLocationAssignmentRes>('getStaffMemberLocationAssignment'),
        ),
      );
  }

  addStaffMemberLocationAssignment(
    body: CreateStaffMemberLocationAssignmentReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/create`, body)
      .pipe(
        catchError(this.handleError<AttendanceConfigMutationRes>('addStaffMemberLocationAssignment')),
      );
  }

  /** `/update` replaces the record, so the body has to carry every field, not just the changed ones. */
  updateStaffMemberLocationAssignment(
    body: UpdateStaffMemberLocationAssignmentReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/update`, body)
      .pipe(
        catchError(
          this.handleError<AttendanceConfigMutationRes>('updateStaffMemberLocationAssignment'),
        ),
      );
  }

  setStaffMemberLocationAssignmentStatus(
    body: UpdateStaffMemberLocationAssignmentStatusReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/update-status`, body)
      .pipe(
        catchError(
          this.handleError<AttendanceConfigMutationRes>('setStaffMemberLocationAssignmentStatus'),
        ),
      );
  }

  deleteStaffMemberLocationAssignment(id: number): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .delete<AttendanceConfigMutationRes>(`${this.#apiUrl}/delete/${id}`)
      .pipe(
        catchError(
          this.handleError<AttendanceConfigMutationRes>('deleteStaffMemberLocationAssignment'),
        ),
      );
  }
}


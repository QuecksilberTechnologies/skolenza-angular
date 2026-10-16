import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AddLeaveTypeRequest,
  DeleteLeaveTypeRequest,
  GetAllLeaveTypesResponse,
  UpdateLeaveTypeRequest,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class LeaveTypes extends BaseService {
  readonly #leaveApiUrl = `${environment.apiUrl}/Leave`;
  readonly #http = inject(HttpClient);

  constructor() {
    super();
  }

  getAllLeaveTypes(
    staffMemberId: string,
    institutionId: number,
    roleId: number,
  ): Observable<GetAllLeaveTypesResponse> {
    const url = `${this.#leaveApiUrl}/get-all-leave-type`;
    const params = new HttpParams()
      .set('StaffMemberId', staffMemberId.toString())
      .set('InstitutionId', institutionId.toString())
      .set('RoleId', roleId.toString())
      .set('IsActive', 'true');

    return this.#http
      .get<GetAllLeaveTypesResponse>(url, { params })
      .pipe(catchError(this.handleError<GetAllLeaveTypesResponse>('getAllLeaveTypes')));
  }

  createLeaveType(body: AddLeaveTypeRequest): Observable<GetAllLeaveTypesResponse> {
    return this.#http
      .post<GetAllLeaveTypesResponse>(`${this.#leaveApiUrl}/add-leave-type`, body)
      .pipe(catchError(this.handleError<GetAllLeaveTypesResponse>('createLeaveType')));
  }

  updateLeaveType(body: UpdateLeaveTypeRequest): Observable<GetAllLeaveTypesResponse> {
    return this.#http
      .post<GetAllLeaveTypesResponse>(`${this.#leaveApiUrl}/update-leave-type`, body)
      .pipe(catchError(this.handleError<GetAllLeaveTypesResponse>('updateLeaveType')));
  }

  deleteLeaveType(body: DeleteLeaveTypeRequest): Observable<GetAllLeaveTypesResponse> {
    return this.#http
      .post<GetAllLeaveTypesResponse>(`${this.#leaveApiUrl}/delete-leave-type`, body)
      .pipe(catchError(this.handleError<GetAllLeaveTypesResponse>('deleteLeaveType')));
  }
}

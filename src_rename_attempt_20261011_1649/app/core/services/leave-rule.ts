import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateLeaveRuleRequest,
  DeleteLeaveRuleRequest,
  GetLeaveRuleResponse,
  UpdateLeaveRuleRequest,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class LeaveRule extends BaseService {
  readonly #leaveRuleApiUrl = `${environment.apiUrl}/LeaveRule`;
  readonly #http = inject(HttpClient);

  constructor() {
    super();
  }

  getAllLeaveRules(
    staffMemberId: string,
    institutionId: number,
    roleId: number,
  ): Observable<GetLeaveRuleResponse> {
    const params = new HttpParams()
      .set('StaffMemberId', staffMemberId.toString())
      .set('InstitutionId', institutionId.toString())
      .set('RoleId', roleId.toString())
      .set('IsActive', 'true');
    return this.#http
      .get<GetLeaveRuleResponse>(`${this.#leaveRuleApiUrl}/get`, { params })
      .pipe(catchError(this.handleError<GetLeaveRuleResponse>('getAllLeaveRules')));
  }

  createLeaveRule(body: CreateLeaveRuleRequest): Observable<GetLeaveRuleResponse> {
    return this.#http
      .post<GetLeaveRuleResponse>(`${this.#leaveRuleApiUrl}/create`, body)
      .pipe(catchError(this.handleError<GetLeaveRuleResponse>('createLeaveRule')));
  }

  updateLeaveRule(body: UpdateLeaveRuleRequest): Observable<GetLeaveRuleResponse> {
    return this.#http
      .post<GetLeaveRuleResponse>(`${this.#leaveRuleApiUrl}/update`, body)
      .pipe(catchError(this.handleError<GetLeaveRuleResponse>('updateLeaveRule')));
  }

  deleteLeaveRule(body: DeleteLeaveRuleRequest): Observable<GetLeaveRuleResponse> {
    return this.#http
      .post<GetLeaveRuleResponse>(`${this.#leaveRuleApiUrl}/delete`, body)
      .pipe(catchError(this.handleError<GetLeaveRuleResponse>('deleteLeaveRule')));
  }
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  GetLeaveRuleResponse,
  IPolicyMappingLeaveType,
  PolicyMappingLeaveTypeDeleteRequest,
  PolicyMappingLeaveTypeMapRequest,
  PolicyMappingLeaveTypeMapResponse,
  PolicyMappingLeaveTypeUpdateRequest,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class PolicyMappingLeaveTypeApi extends BaseService {
  readonly #policyMappingApiUrl = `${environment.apiUrl}/PolicyMappingLeaveType`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #policyMappingLeaveTypes = signal<IPolicyMappingLeaveType[]>([]);

  // Public readonly signals for components
  readonly policyMappingLeaveTypes = this.#policyMappingLeaveTypes.asReadonly();

  constructor() {
    super();
  }

  setPolicyMappingLeaveTypes(data: IPolicyMappingLeaveType[]) {
    this.#policyMappingLeaveTypes.set(data);
  }

  // Policy Mapping Leave Type Management
  getAllPolicyMappingLeaveTypes(
    staffMemberId: string,
    institutionId: number,
    roleId: number,
  ): Observable<PolicyMappingLeaveTypeMapResponse> {
    const params = new HttpParams()
      .set('InstitutionId', institutionId.toString())
      .set('UserStaffMemberId', staffMemberId)
      .set('RoleId', roleId.toString())
      .set('IsActive', 'true');
    return this.#http
      .get<PolicyMappingLeaveTypeMapResponse>(`${this.#policyMappingApiUrl}/get`, { params })
      .pipe(
        catchError(
          this.handleError<PolicyMappingLeaveTypeMapResponse>('getAllPolicyMappingLeaveTypes'),
        ),
      );
  }

  getAllPolicyMappingLeaveTypesByStaffEmploymentTypeId(
    staffMemberId: number,
    staffEmploymentTypeId: number,
    institutionId: number,
    roleId: number,
  ): Observable<GetLeaveRuleResponse> {
    const params = new HttpParams()
      .set('InstitutionId', institutionId.toString())
      .set('StaffMemberId', staffMemberId.toString())
      .set('StaffEmploymentTypeId', staffEmploymentTypeId.toString())
      .set('RoleId', roleId.toString())
      .set('IsActive', 'true');
    return this.#http
      .get<GetLeaveRuleResponse>(`${this.#policyMappingApiUrl}/get-by-staff-employment-type-Id`, { params })
      .pipe(
        catchError(
          this.handleError<GetLeaveRuleResponse>('getAllPolicyMappingLeaveTypesByStaffEmploymentTypeId'),
        ),
      );
  }

  mapPolicyMappingLeaveType(
    body: PolicyMappingLeaveTypeMapRequest,
  ): Observable<PolicyMappingLeaveTypeMapResponse> {
    return this.#http
      .post<PolicyMappingLeaveTypeMapResponse>(`${this.#policyMappingApiUrl}/map`, body)
      .pipe(
        catchError(
          this.handleError<PolicyMappingLeaveTypeMapResponse>('mapPolicyMappingLeaveType'),
        ),
      );
  }

  updatePolicyMappingLeaveType(
    body: PolicyMappingLeaveTypeUpdateRequest,
  ): Observable<PolicyMappingLeaveTypeMapResponse> {
    return this.#http
      .post<PolicyMappingLeaveTypeMapResponse>(`${this.#policyMappingApiUrl}/update`, body)
      .pipe(
        catchError(
          this.handleError<PolicyMappingLeaveTypeMapResponse>('updatePolicyMappingLeaveType'),
        ),
      );
  }

  deletePolicyMappingLeaveType(
    body: PolicyMappingLeaveTypeDeleteRequest,
  ): Observable<PolicyMappingLeaveTypeMapResponse> {
    return this.#http
      .post<PolicyMappingLeaveTypeMapResponse>(`${this.#policyMappingApiUrl}/delete`, body)
      .pipe(
        catchError(
          this.handleError<PolicyMappingLeaveTypeMapResponse>('deletePolicyMappingLeaveType'),
        ),
      );
  }
}

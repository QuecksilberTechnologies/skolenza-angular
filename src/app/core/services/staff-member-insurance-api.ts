import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateStaffMemberInsuranceReq,
  DeleteStaffMemberInsuranceReq,
  StaffMemberInsurance,
  GetStaffMemberInsuranceRes,
  GetEnrolledInsuranceReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class StaffMemberInsuranceApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Staff/Insurance`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #staffMemberInsurances = signal<StaffMemberInsurance[]>([]);
  readonly #completionPercentage = signal<number>(0);
  readonly #isSaving = signal<boolean>(false);

  // Public readonly signals for components
  readonly staffMemberInsurances = this.#staffMemberInsurances.asReadonly();
  readonly completionPercentage = this.#completionPercentage.asReadonly();
  readonly isSaving = this.#isSaving.asReadonly();

  constructor() {
    super();
  }

  setIsSaving(value: boolean) {
    this.#isSaving.set(value);
  }

  setStaffMemberInsurances(value: StaffMemberInsurance[]) {
    this.#staffMemberInsurances.set(value);
  }

  setCompletionPercentage(value: number) {
    this.#completionPercentage.set(value);
  }

  toggleVerifySignal(status: boolean, id: number) {
    const staffMemberInsurances = [...this.#staffMemberInsurances()];
    const index = staffMemberInsurances.findIndex((x) => x.id === id);
    if (index > -1) {
      staffMemberInsurances[index].isInfoVerified = status;
      this.setStaffMemberInsurances(staffMemberInsurances);
    }
  }

  toggleEditSignal(status: boolean, id: number) {
    const staffMemberInsurances = [...this.#staffMemberInsurances()];
    const index = staffMemberInsurances.findIndex((x) => x.id === id);
    if (index > -1) {
      staffMemberInsurances[index].isEditAllowed = status;
      this.setStaffMemberInsurances(staffMemberInsurances);
    }
  }

  // Insurance CRUD
  createInsurance(body: CreateStaffMemberInsuranceReq): Observable<GetStaffMemberInsuranceRes> {
    return this.#http
      .post<GetStaffMemberInsuranceRes>(`${this.#apiUrl}/staff-member-insurance-enroll`, body)
      .pipe(catchError(this.handleError<GetStaffMemberInsuranceRes>('createInsurance')));
  }

  getEnrolledInsurances(req: GetEnrolledInsuranceReq): Observable<GetStaffMemberInsuranceRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffMemberInsuranceRes>(`${this.#apiUrl}/get-all-enroll`, { params })
      .pipe(catchError(this.handleError<GetStaffMemberInsuranceRes>('getEnrolledInsurances')));
  }

  deleteInsurance(req: DeleteStaffMemberInsuranceReq): Observable<GetStaffMemberInsuranceRes> {
    return this.#http
      .delete<GetStaffMemberInsuranceRes>(`${this.#apiUrl}/delete`, { body: req })
      .pipe(catchError(this.handleError<GetStaffMemberInsuranceRes>('deleteInsurance')));
  }
}


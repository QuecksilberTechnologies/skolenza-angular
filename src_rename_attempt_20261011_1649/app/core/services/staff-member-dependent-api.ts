import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  DeleteStaffMemberDependentReq,
  StaffMemberDependent,
  GetStaffMemberDependentDetailRes,
  GetStaffMemberDependentReq,
  GetStaffMemberDependentRes,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class StaffMemberDependentApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Staff/Dependent`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #staffMemberDependents = signal<StaffMemberDependent[]>([]);
  readonly #completionPercentage = signal<number>(0);
  readonly #isSaving = signal<boolean>(false);

  // Public readonly signals for components
  readonly staffMemberDependents = this.#staffMemberDependents.asReadonly();
  readonly completionPercentage = this.#completionPercentage.asReadonly();
  readonly isSaving = this.#isSaving.asReadonly();

  constructor() {
    super();
  }

  setIsSaving(value: boolean) {
    this.#isSaving.set(value);
  }

  setStaffMemberDependents(value: StaffMemberDependent[]) {
    this.#staffMemberDependents.set(value);
  }

  setCompletionPercentage(value: number) {
    this.#completionPercentage.set(value);
  }

  removeDependentSignal(id: number) {
    const updatedDependents = this.#staffMemberDependents().filter((dependent) => dependent.id !== id);
    this.setStaffMemberDependents(updatedDependents);
  }

  toggleVerifySignal(status: boolean, id: number) {
    const staffMemberDependents = [...this.#staffMemberDependents()];
    const index = staffMemberDependents.findIndex((dependent) => dependent.id === id);
    if (index > -1) {
      staffMemberDependents[index].isInfoVerified = status;
      this.setStaffMemberDependents(staffMemberDependents);
    }
  }

  toggleEditSignal(status: boolean) {
    const staffMemberDependents = [...this.#staffMemberDependents()];
    const updatedDependents = staffMemberDependents.map((e) => ({ ...e, isEditAllowed: status }));
    this.setStaffMemberDependents(updatedDependents);
  }

  // CRUD Dependents
  createStaffMemberDependent(body: FormData): Observable<GetStaffMemberDependentRes> {
    return this.#http
      .post<GetStaffMemberDependentRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<GetStaffMemberDependentRes>('createStaffMemberDependent')));
  }

  getStaffMemberDependents(req: GetStaffMemberDependentReq): Observable<GetStaffMemberDependentRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffMemberDependentRes>(`${this.#apiUrl}/get`, { params })
      .pipe(catchError(this.handleError<GetStaffMemberDependentRes>('getStaffMemberDependents')));
  }

  getStaffMemberDependentsDetail(
    req: GetStaffMemberDependentReq,
  ): Observable<GetStaffMemberDependentDetailRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffMemberDependentDetailRes>(`${this.#apiUrl}/get-in-detail`, { params })
      .pipe(
        catchError(this.handleError<GetStaffMemberDependentDetailRes>('getStaffMemberDependentsDetail')),
      );
  }

  updateStaffMemberDependent(body: FormData): Observable<GetStaffMemberDependentRes> {
    return this.#http
      .post<GetStaffMemberDependentRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<GetStaffMemberDependentRes>('updateStaffMemberDependent')));
  }

  deleteStaffMemberDependent(req: DeleteStaffMemberDependentReq): Observable<GetStaffMemberDependentRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<GetStaffMemberDependentRes>(`${this.#apiUrl}/delete`, { params })
      .pipe(catchError(this.handleError<GetStaffMemberDependentRes>('deleteStaffMemberDependent')));
  }
}


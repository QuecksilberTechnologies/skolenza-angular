import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  DeleteStaffMemberBankReq,
  GetStaffMemberBankReq,
  GetStaffMemberBankRes,
  IStaffMemberBankInfo,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class StaffMemberBanksAPI extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Staff/Bank`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #staffMemberBanks = signal<IStaffMemberBankInfo[]>([]);
  readonly #completionPercentage = signal<number>(0);
  readonly #isSaving = signal<boolean>(false);

  // Public readonly signals for components
  readonly staffMemberBanks = this.#staffMemberBanks.asReadonly();
  readonly completionPercentage = this.#completionPercentage.asReadonly();
  readonly isSaving = this.#isSaving.asReadonly();

  constructor() {
    super();
  }

  setIsSaving(value: boolean) {
    this.#isSaving.set(value);
  }

  setStaffMemberBanks(data: IStaffMemberBankInfo[]) {
    this.#staffMemberBanks.set(data);
  }

  setCompletionPercentage(value: number) {
    this.#completionPercentage.set(value);
  }

  removeBankSignal(id: number) {
    const updatedBanks = this.#staffMemberBanks().filter((bank) => bank.id !== id);
    this.setStaffMemberBanks(updatedBanks);
  }

  setIsVerifing(status: boolean, id: number) {
    const staffMemberBanks = [...this.#staffMemberBanks()];
    const index = staffMemberBanks.findIndex((x) => x.id === id);
    if (index > -1) {
      staffMemberBanks[index].isVerifying = status;
      this.setStaffMemberBanks(staffMemberBanks);
    }
  }

  setIsEditing(status: boolean, id: number) {
    const staffMemberBanks = [...this.#staffMemberBanks()];
    const index = staffMemberBanks.findIndex((x) => x.id === id);
    if (index > -1) {
      staffMemberBanks[index].isEditing = status;
      this.setStaffMemberBanks(staffMemberBanks);
    }
  }

  toggleVerifySignal(status: boolean, id: number) {
    const staffMemberBanks = [...this.#staffMemberBanks()];
    const index = staffMemberBanks.findIndex((x) => x.id === id);
    if (index > -1) {
      staffMemberBanks[index].isInfoVerified = status;
      this.setStaffMemberBanks(staffMemberBanks);
    }
  }

  toggleEditSignal(status: boolean) {
    const staffMemberBanks = [...this.#staffMemberBanks()];
    const updatedBanks = staffMemberBanks.map((e) => ({ ...e, isEditAllowed: status }));
    this.setStaffMemberBanks(updatedBanks);
  }

  // Bank CRUD
  createStaffMemberBank(body: FormData): Observable<GetStaffMemberBankRes> {
    return this.#http
      .post<GetStaffMemberBankRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<GetStaffMemberBankRes>('createStaffMemberBank')));
  }

  getStaffMemberBanks(req: GetStaffMemberBankReq): Observable<GetStaffMemberBankRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffMemberBankRes>(`${this.#apiUrl}/get`, { params })
      .pipe(catchError(this.handleError<GetStaffMemberBankRes>('getStaffMemberBanks')));
  }

  updateStaffMemberBank(body: FormData): Observable<GetStaffMemberBankRes> {
    return this.#http
      .post<GetStaffMemberBankRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<GetStaffMemberBankRes>('updateStaffMemberBank')));
  }

  deleteStaffMemberBank(req: DeleteStaffMemberBankReq): Observable<GetStaffMemberBankRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<GetStaffMemberBankRes>(`${this.#apiUrl}/delete`, { params })
      .pipe(catchError(this.handleError<GetStaffMemberBankRes>('deleteStaffMemberBank')));
  }
}


import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateStaffMemberContactReq,
  DeleteStaffMemberContactReq,
  StaffMemberContact,
  GetStaffMemberContactReq,
  GetStaffMemberContactRes,
  GetContactRelationOptionsRes,
  UpdateStaffMemberContactReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class StaffMemberContactsAPI extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Staff/Contact`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #staffMemberContacts = signal<StaffMemberContact[]>([]);
  readonly #completionPercentage = signal<number>(0);
  readonly #isSaving = signal<boolean>(false);
  readonly #isLoading = signal(false);

  // Public readonly signals for components
  readonly staffMemberContacts = this.#staffMemberContacts.asReadonly();
  readonly completionPercentage = this.#completionPercentage.asReadonly();
  readonly isSaving = this.#isSaving.asReadonly();
  readonly isLoading = this.#isLoading.asReadonly();

  constructor() {
    super();
  }

  setIsSaving(value: boolean) {
    this.#isSaving.set(value);
  }

  setIsLoading(value: boolean) {
    this.#isLoading.set(value);
  }

  setStaffMemberContacts(value: StaffMemberContact[]) {
    this.#staffMemberContacts.set(value);
  }

  setCompletionPercentage(value: number) {
    this.#completionPercentage.set(value);
  }

  removeContactSignal(id: number) {
    const updatedContacts = this.#staffMemberContacts().filter((contact) => contact.id !== id);
    this.setStaffMemberContacts(updatedContacts);
  }

  toggleVerifySignal(status: boolean, id: number) {
    const staffMemberContacts = [...this.#staffMemberContacts()];
    const index = staffMemberContacts.findIndex((x) => x.id === id);
    if (index > -1) {
      staffMemberContacts[index].isInfoVerified = status;
      this.setStaffMemberContacts(staffMemberContacts);
    }
  }

  toggleEditSignal(status: boolean) {
    const staffMemberContacts = [...this.#staffMemberContacts()];
    const updatedContacts = staffMemberContacts.map((e) => ({ ...e, isEditAllowed: status }));
    this.setStaffMemberContacts(updatedContacts);
  }

  // CRUD
  getRelationOptions(): Observable<GetContactRelationOptionsRes> {
    return this.#http
      .get<GetContactRelationOptionsRes>(`${this.#apiUrl}/relation-options`)
      .pipe(catchError(this.handleError<GetContactRelationOptionsRes>('getRelationOptions')));
  }

  createStaffMemberContact(body: CreateStaffMemberContactReq): Observable<GetStaffMemberContactRes> {
    return this.#http
      .post<GetStaffMemberContactRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<GetStaffMemberContactRes>('createStaffMemberContact')));
  }

  getStaffMemberContacts(req: GetStaffMemberContactReq): Observable<GetStaffMemberContactRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffMemberContactRes>(`${this.#apiUrl}/get`, { params })
      .pipe(catchError(this.handleError<GetStaffMemberContactRes>('getStaffMemberContacts')));
  }

  updateStaffMemberContact(body: UpdateStaffMemberContactReq): Observable<GetStaffMemberContactRes> {
    return this.#http
      .post<GetStaffMemberContactRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<GetStaffMemberContactRes>('updateStaffMemberContact')));
  }

  deleteStaffMemberContact(req: DeleteStaffMemberContactReq): Observable<GetStaffMemberContactRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<GetStaffMemberContactRes>(`${this.#apiUrl}/delete`, { params })
      .pipe(catchError(this.handleError<GetStaffMemberContactRes>('deleteStaffMemberContact')));
  }
}


import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateStaffMemberSensitiveRes,
  DeleteStaffMemberIdentityReq,
  DeleteStaffMemberIdentityRes,
  StaffMemberSensitive,
  GetStaffMemberSensitiveReq,
  GetStaffMemberSensitiveRes,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class StaffMemberIdentityApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Staff/Sensitive`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #staffMemberIdentities = signal<StaffMemberSensitive[]>([]);
  readonly #completionPercentage = signal<number>(0);
  readonly #isSaving = signal(false);

  // Public readonly signals for components
  readonly staffMemberIdentities = this.#staffMemberIdentities.asReadonly();
  readonly completionPercentage = this.#completionPercentage.asReadonly();
  readonly isSaving = this.#isSaving.asReadonly();

  constructor() {
    super();
  }

  setStaffMemberIdentities(value: StaffMemberSensitive[]) {
    this.#staffMemberIdentities.set(value);
  }

  setCompletionPercentage(value: number) {
    this.#completionPercentage.set(value);
  }

  /** The edit flag is per staffMember and tab, so every saved row takes the new value. */
  toggleEditSignal(status: boolean) {
    this.setStaffMemberIdentities(
      this.#staffMemberIdentities().map((row) =>
        row.staffMemberIdentityId ? { ...row, isEditAllowed: status } : row,
      ),
    );
  }

  setIsSaving(value: boolean) {
    this.#isSaving.set(value);
  }

  getStaffMemberIdentities(req: GetStaffMemberSensitiveReq): Observable<GetStaffMemberSensitiveRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffMemberSensitiveRes>(`${this.#apiUrl}/get`, { params })
      .pipe(catchError(this.handleError<GetStaffMemberSensitiveRes>('getStaffMemberIdentities')));
  }

  createStaffMemberSensitive(body: FormData): Observable<CreateStaffMemberSensitiveRes> {
    return this.#http
      .post<CreateStaffMemberSensitiveRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<CreateStaffMemberSensitiveRes>('createStaffMemberSensitive')));
  }

  deleteStaffMemberIdentity(body: DeleteStaffMemberIdentityReq): Observable<DeleteStaffMemberIdentityRes> {
    return this.#http
      .delete<DeleteStaffMemberIdentityRes>(`${this.#apiUrl}/delete`, { body })
      .pipe(catchError(this.handleError<DeleteStaffMemberIdentityRes>('deleteStaffMemberIdentity')));
  }
}


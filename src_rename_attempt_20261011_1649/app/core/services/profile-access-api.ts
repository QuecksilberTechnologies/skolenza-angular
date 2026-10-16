import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  UpdateEditStatusReq,
  UpdateEditStatusRes,
  UpdateVerifyStatusReq,
  UpdateVerifyStatusRes,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class ProfileAccessApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Staff`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #isVerifying = signal(false);
  readonly #isEditing = signal(false);

  // Public readonly signals for components
  readonly isVerifying = this.#isVerifying.asReadonly();
  readonly isEditing = this.#isEditing.asReadonly();

  constructor() {
    super();
  }

  setIsVerifying(value: boolean) {
    this.#isVerifying.set(value);
  }

  setIsEditing(value: boolean) {
    this.#isEditing.set(value);
  }

  updateVerificationStatus(body: UpdateVerifyStatusReq): Observable<UpdateVerifyStatusRes> {
    return this.#http
      .post<UpdateVerifyStatusRes>(`${this.#apiUrl}/update-verification-status`, body)
      .pipe(catchError(this.handleError<UpdateVerifyStatusRes>('updateStaffMemberVerifyStatus')));
  }

  updateEditStatus(body: UpdateEditStatusReq): Observable<UpdateEditStatusRes> {
    return this.#http
      .post<UpdateEditStatusRes>(`${this.#apiUrl}/update-edit-status`, body)
      .pipe(catchError(this.handleError<UpdateEditStatusRes>('updateStaffMemberEditStatus')));
  }
}


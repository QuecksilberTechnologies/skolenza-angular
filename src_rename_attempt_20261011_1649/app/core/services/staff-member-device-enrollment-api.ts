import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AttendanceConfigMutationRes,
  BindStaffMemberDeviceCardReq,
  CreateStaffMemberDeviceEnrollmentReq,
  GetStaffMemberDeviceEnrollmentRes,
  GetStaffMemberDeviceEnrollmentsReq,
  GetStaffMemberDeviceEnrollmentsRes,
  RemoveStaffMemberDeviceCredentialReq,
  SetStaffMemberDevicePinReq,
  UpdateStaffMemberDeviceEnrollmentReq,
  UpdateStaffMemberDeviceEnrollmentStatusReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/**
 * `/api/StaffDeviceEnrollment` — staffMember credentials on a host-owned `InstitutionDevice`.
 * Institution-scoped: a institution user manages the enrollment, never the device itself.
 */
@Injectable({
  providedIn: 'root',
})
export class StaffMemberDeviceEnrollmentApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/StaffDeviceEnrollment`;
  readonly #http = inject(HttpClient);

  getStaffMemberDeviceEnrollments(
    req: GetStaffMemberDeviceEnrollmentsReq,
  ): Observable<GetStaffMemberDeviceEnrollmentsRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffMemberDeviceEnrollmentsRes>(`${this.#apiUrl}/get-all`, { params })
      .pipe(
        catchError(
          this.handleError<GetStaffMemberDeviceEnrollmentsRes>('getStaffMemberDeviceEnrollments'),
        ),
      );
  }

  getStaffMemberDeviceEnrollment(id: string): Observable<GetStaffMemberDeviceEnrollmentRes> {
    return this.#http
      .get<GetStaffMemberDeviceEnrollmentRes>(`${this.#apiUrl}/get-by-id/${id}`)
      .pipe(
        catchError(this.handleError<GetStaffMemberDeviceEnrollmentRes>('getStaffMemberDeviceEnrollment')),
      );
  }

  addStaffMemberDeviceEnrollment(
    body: CreateStaffMemberDeviceEnrollmentReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/create`, body)
      .pipe(
        catchError(this.handleError<AttendanceConfigMutationRes>('addStaffMemberDeviceEnrollment')),
      );
  }

  /** `/update` replaces the record, so the body has to carry every field, not just the changed ones. */
  updateStaffMemberDeviceEnrollment(
    body: UpdateStaffMemberDeviceEnrollmentReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/update`, body)
      .pipe(
        catchError(this.handleError<AttendanceConfigMutationRes>('updateStaffMemberDeviceEnrollment')),
      );
  }

  setStaffMemberDeviceEnrollmentStatus(
    body: UpdateStaffMemberDeviceEnrollmentStatusReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/update-status`, body)
      .pipe(
        catchError(
          this.handleError<AttendanceConfigMutationRes>('setStaffMemberDeviceEnrollmentStatus'),
        ),
      );
  }

  /**
   * Binds a host-issued card to an existing enrollment. Create the enrollment first — the create
   * DTO's `institutionCardId` is not honoured there.
   */
  bindStaffMemberDeviceCard(body: BindStaffMemberDeviceCardReq): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/card/bind`, body)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('bindStaffMemberDeviceCard')));
  }

  /** Removes one credential from the enrollment. The device mapping itself survives. */
  removeStaffMemberDeviceCredential(
    body: RemoveStaffMemberDeviceCredentialReq,
  ): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/credential/remove`, body)
      .pipe(
        catchError(this.handleError<AttendanceConfigMutationRes>('removeStaffMemberDeviceCredential')),
      );
  }

  /**
   * Queues one JPEG or PNG face image, at most 2 MB, for an enrollment that already exists. The
   * body is `multipart/form-data`: `enrollmentId` plus the file as `faceImage`. Raw biometric data
   * is never read back, so there is no matching getter.
   */
  upsertStaffMemberDeviceFace(body: FormData): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/face/upsert`, body)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('upsertStaffMemberDeviceFace')));
  }

  /** Write-only. No read returns the PIN, so nothing renders, caches or logs it. */
  upsertStaffMemberDevicePin(body: SetStaffMemberDevicePinReq): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .post<AttendanceConfigMutationRes>(`${this.#apiUrl}/pin/upsert`, body)
      .pipe(catchError(this.handleError<AttendanceConfigMutationRes>('upsertStaffMemberDevicePin')));
  }

  deleteStaffMemberDeviceEnrollment(id: string): Observable<AttendanceConfigMutationRes> {
    return this.#http
      .delete<AttendanceConfigMutationRes>(`${this.#apiUrl}/delete/${id}`)
      .pipe(
        catchError(this.handleError<AttendanceConfigMutationRes>('deleteStaffMemberDeviceEnrollment')),
      );
  }
}


import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateInstitutionDeviceReq,
  DeviceMutationRes,
  GetInstitutionDeviceRes,
  GetInstitutionDevicesReq,
  GetInstitutionDevicesRes,
  UpdateInstitutionDeviceLocationReq,
  UpdateInstitutionDeviceReq,
  UpdateInstitutionDeviceStatusReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class InstitutionDeviceApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/InstitutionDevice`;
  readonly #http = inject(HttpClient);

  getInstitutionDevices(req: GetInstitutionDevicesReq): Observable<GetInstitutionDevicesRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInstitutionDevicesRes>(`${this.#apiUrl}/get-all`, { params })
      .pipe(catchError(this.handleError<GetInstitutionDevicesRes>('getInstitutionDevices')));
  }

  /** Swagger marks `InstitutionId` optional, but the server answers 400 `A valid identifier is
   *  required.` without it. `get-all` does not share that rule — there the institution is a filter. */
  getInstitutionDevice(id: string, institutionId: string | null): Observable<GetInstitutionDeviceRes> {
    const params = this.makeHttpParams({ InstitutionId: institutionId });
    return this.#http
      .get<GetInstitutionDeviceRes>(`${this.#apiUrl}/get-by-id/${id}`, { params })
      .pipe(catchError(this.handleError<GetInstitutionDeviceRes>('getInstitutionDevice')));
  }

  addInstitutionDevice(body: CreateInstitutionDeviceReq): Observable<DeviceMutationRes> {
    return this.#http
      .post<DeviceMutationRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<DeviceMutationRes>('addInstitutionDevice')));
  }

  /** `/update` replaces the record, so the body has to carry every field, not just the changed ones. */
  updateInstitutionDevice(body: UpdateInstitutionDeviceReq): Observable<DeviceMutationRes> {
    return this.#http
      .post<DeviceMutationRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<DeviceMutationRes>('updateInstitutionDevice')));
  }

  setInstitutionDeviceStatus(body: UpdateInstitutionDeviceStatusReq): Observable<DeviceMutationRes> {
    return this.#http
      .post<DeviceMutationRes>(`${this.#apiUrl}/update-status`, body)
      .pipe(catchError(this.handleError<DeviceMutationRes>('setInstitutionDeviceStatus')));
  }

  /**
   * Moves the device to another Institution location. Enrollments are not moved with it, so the caller
   * warns about them once this succeeds. The institution travels in the body here, not as a query param.
   */
  updateInstitutionDeviceLocation(body: UpdateInstitutionDeviceLocationReq): Observable<DeviceMutationRes> {
    return this.#http
      .post<DeviceMutationRes>(`${this.#apiUrl}/update-location`, body)
      .pipe(catchError(this.handleError<DeviceMutationRes>('updateInstitutionDeviceLocation')));
  }

  deleteInstitutionDevice(id: string, institutionId: string | null): Observable<DeviceMutationRes> {
    const params = this.makeHttpParams({ InstitutionId: institutionId });
    return this.#http
      .delete<DeviceMutationRes>(`${this.#apiUrl}/delete/${id}`, { params })
      .pipe(catchError(this.handleError<DeviceMutationRes>('deleteInstitutionDevice')));
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateDeviceMasterReq,
  DeviceMutationRes,
  GetDeviceMasterRes,
  GetDeviceMastersReq,
  GetDeviceMastersRes,
  UpdateDeviceMasterReq,
  UpdateDeviceMasterStatusReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class DeviceMasterApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/DeviceMaster`;
  readonly #http = inject(HttpClient);

  getDeviceMasters(req: GetDeviceMastersReq): Observable<GetDeviceMastersRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetDeviceMastersRes>(`${this.#apiUrl}/get-all`, { params })
      .pipe(catchError(this.handleError<GetDeviceMastersRes>('getDeviceMasters')));
  }

  getDeviceMaster(id: number): Observable<GetDeviceMasterRes> {
    return this.#http
      .get<GetDeviceMasterRes>(`${this.#apiUrl}/get-by-id/${id}`)
      .pipe(catchError(this.handleError<GetDeviceMasterRes>('getDeviceMaster')));
  }

  /** Looks the catalogue up by the serial printed on the device rather than by row id. */
  getDeviceMasterBySerial(sNo: string): Observable<GetDeviceMasterRes> {
    return this.#http
      .get<GetDeviceMasterRes>(`${this.#apiUrl}/get-info-by-sno/${encodeURIComponent(sNo)}`)
      .pipe(catchError(this.handleError<GetDeviceMasterRes>('getDeviceMasterBySerial')));
  }

  addDeviceMaster(body: CreateDeviceMasterReq): Observable<DeviceMutationRes> {
    return this.#http
      .post<DeviceMutationRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<DeviceMutationRes>('addDeviceMaster')));
  }

  /** `/update` replaces the record, so the body has to carry every field, not just the changed ones. */
  updateDeviceMaster(body: UpdateDeviceMasterReq): Observable<DeviceMutationRes> {
    return this.#http
      .post<DeviceMutationRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<DeviceMutationRes>('updateDeviceMaster')));
  }

  setDeviceMasterStatus(body: UpdateDeviceMasterStatusReq): Observable<DeviceMutationRes> {
    return this.#http
      .post<DeviceMutationRes>(`${this.#apiUrl}/update-status`, body)
      .pipe(catchError(this.handleError<DeviceMutationRes>('setDeviceMasterStatus')));
  }

  deleteDeviceMaster(id: number): Observable<DeviceMutationRes> {
    return this.#http
      .delete<DeviceMutationRes>(`${this.#apiUrl}/delete/${id}`)
      .pipe(catchError(this.handleError<DeviceMutationRes>('deleteDeviceMaster')));
  }
}

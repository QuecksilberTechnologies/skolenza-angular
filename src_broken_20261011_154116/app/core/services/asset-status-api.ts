import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateAssetStatusRequest,
  CreateAssetStatusResponse,
  DeleteAssetStatusRequest,
  DeleteAssetStatusResponse,
  GetAssetStatusRequest,
  GetAssetStatusResponse,
  UpdateAssetStatusRequest,
  UpdateAssetStatusResponse,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class AssetStatusApi extends BaseService {
  readonly #apiAssetStatusUrl = `${environment.apiUrl}/Asset/Status`;
  readonly #http = inject(HttpClient);

  createAssetStatus(body: CreateAssetStatusRequest): Observable<CreateAssetStatusResponse> {
    return this.#http
      .post<CreateAssetStatusResponse>(`${this.#apiAssetStatusUrl}/add`, body)
      .pipe(catchError(this.handleError<CreateAssetStatusResponse>('createAssetStatus')));
  }

  fetchAssetsStatus(req: GetAssetStatusRequest): Observable<GetAssetStatusResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetAssetStatusResponse>(`${this.#apiAssetStatusUrl}/get`, { params })
      .pipe(catchError(this.handleError<GetAssetStatusResponse>('fetchAssetsStatus')));
  }

  updateAssetStatus(body: UpdateAssetStatusRequest): Observable<UpdateAssetStatusResponse> {
    return this.#http
      .put<UpdateAssetStatusResponse>(`${this.#apiAssetStatusUrl}/update`, body)
      .pipe(catchError(this.handleError<UpdateAssetStatusResponse>('updateAssetStatus')));
  }

  deleteAssetStatus(req: DeleteAssetStatusRequest): Observable<DeleteAssetStatusResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<DeleteAssetStatusResponse>(`${this.#apiAssetStatusUrl}/delete`, { params })
      .pipe(catchError(this.handleError<DeleteAssetStatusResponse>('deleteAssetStatus')));
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateAssetTypeRequest,
  CreateAssetTypeResponse,
  DeleteAssetTypeRequest,
  DeleteAssetTypeResponse,
  GetAssetTypesRequest,
  GetAssetTypesResponse,
  UpdateAssetTypeRequest,
  UpdateAssetTypeResponse,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class AssetTypesApi extends BaseService {
  readonly #apiAssetTypeUrl = `${environment.apiUrl}/Asset/Type`;
  readonly #http = inject(HttpClient);

  constructor() {
    super();
  }

  createAssetType(body: CreateAssetTypeRequest): Observable<CreateAssetTypeResponse> {
    return this.#http
      .post<CreateAssetTypeResponse>(`${this.#apiAssetTypeUrl}/add`, body)
      .pipe(catchError(this.handleError<CreateAssetTypeResponse>('createAssetType')));
  }

  fetchAssetsTypes(req: GetAssetTypesRequest): Observable<GetAssetTypesResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetAssetTypesResponse>(`${this.#apiAssetTypeUrl}/get`, { params })
      .pipe(catchError(this.handleError<GetAssetTypesResponse>('fetchAssetsTypes')));
  }

  updateAssetType(body: UpdateAssetTypeRequest): Observable<UpdateAssetTypeResponse> {
    return this.#http
      .put<UpdateAssetTypeResponse>(`${this.#apiAssetTypeUrl}/update`, body)
      .pipe(catchError(this.handleError<UpdateAssetTypeResponse>('updateAssetType')));
  }

  deleteAssetType(req: DeleteAssetTypeRequest): Observable<DeleteAssetTypeResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<DeleteAssetTypeResponse>(`${this.#apiAssetTypeUrl}/delete`, { params })
      .pipe(catchError(this.handleError<DeleteAssetTypeResponse>('deleteAssetType')));
  }
}

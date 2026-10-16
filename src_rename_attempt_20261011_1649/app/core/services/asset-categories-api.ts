import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  DeleteAssetCategoryReq,
  DeleteAssetCategoryRes,
  GetAssetCategoryReq,
  GetAssetCategoryRes,
  UpsertAssetCategoryReq,
  UpsertAssetCategoryRes,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class AssetCategoriesApi extends BaseService {
  readonly #apiAssetCategoryUrl = `${environment.apiUrl}/Asset/Category`;
  readonly #http = inject(HttpClient);

  constructor() {
    super();
  }

  createAssetCategory(body: UpsertAssetCategoryReq): Observable<UpsertAssetCategoryRes> {
    return this.#http
      .post<UpsertAssetCategoryRes>(`${this.#apiAssetCategoryUrl}/add`, body)
      .pipe(catchError(this.handleError<UpsertAssetCategoryRes>('createAssetCategory')));
  }

  getAllAssetCategory(req: GetAssetCategoryReq): Observable<GetAssetCategoryRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetAssetCategoryRes>(`${this.#apiAssetCategoryUrl}/get`, { params })
      .pipe(catchError(this.handleError<GetAssetCategoryRes>('getAllAssetCategory')));
  }

  updateAssetCategory(body: UpsertAssetCategoryReq): Observable<UpsertAssetCategoryRes> {
    const url = `${this.#apiAssetCategoryUrl}/update`;
    return this.#http
      .put<UpsertAssetCategoryRes>(url, body)
      .pipe(catchError(this.handleError<UpsertAssetCategoryRes>('updateAssetCategory')));
  }

  deleteAssetCategory(req: DeleteAssetCategoryReq): Observable<DeleteAssetCategoryRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<DeleteAssetCategoryRes>(`${this.#apiAssetCategoryUrl}/delete`, { params })
      .pipe(catchError(this.handleError<DeleteAssetCategoryRes>('deleteAssetCategory')));
  }
}

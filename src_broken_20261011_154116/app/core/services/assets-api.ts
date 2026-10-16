import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AssignAssetReq,
  AssignAssetRes,
  AssetDeleteReq,
  AssetRes,
  GetAssetsReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class AssetsApi extends BaseService {
  readonly #apiAssetUrl = `${environment.apiUrl}/Asset`;
  readonly #http = inject(HttpClient);

  constructor() {
    super();
  }

  createAsset(body: FormData): Observable<AssetRes> {
    return this.#http
      .post<AssetRes>(`${this.#apiAssetUrl}/add`, body)
      .pipe(catchError(this.handleError<AssetRes>('createAsset')));
  }

  getAssets(req: GetAssetsReq): Observable<AssetRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<AssetRes>(`${this.#apiAssetUrl}/get`, { params })
      .pipe(catchError(this.handleError<AssetRes>('getAssets')));
  }

  updateAsset(body: FormData): Observable<AssetRes> {
    return this.#http
      .put<AssetRes>(`${this.#apiAssetUrl}/update`, body)
      .pipe(catchError(this.handleError<AssetRes>('updateAsset')));
  }

  deleteAsset(req: AssetDeleteReq): Observable<AssetRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<AssetRes>(`${this.#apiAssetUrl}/delete`, { params })
      .pipe(catchError(this.handleError<AssetRes>('deleteAsset')));
  }

  assignAsset(body: AssignAssetReq): Observable<AssignAssetRes> {
    return this.#http
      .post<AssignAssetRes>(`${this.#apiAssetUrl}/assign-staffMember`, body)
      .pipe(catchError(this.handleError<AssignAssetRes>('assignAsset')));
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateParentModuleReq,
  GetModuleHeadersReq,
  GetModuleHeadersRes,
  GetModuleRes,
  ModuleMutationRes,
  UpdateModuleStatusReq,
  UpdateParentModuleReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class ParentModuleApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/ParentHeader`;
  readonly #http = inject(HttpClient);

  /**
   * Header modules for a scope, each with its direct non-leaf sub-headers nested underneath. Leaf
   * modules are never returned — `/ChildModule/list` is the only source for those.
   */
  getModuleHeaders(req: GetModuleHeadersReq): Observable<GetModuleHeadersRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetModuleHeadersRes>(`${this.#apiUrl}/get-module-headers`, { params })
      .pipe(catchError(this.handleError<GetModuleHeadersRes>('getModuleHeaders')));
  }

  getParentModule(id: number, moduleScope?: number | null): Observable<GetModuleRes> {
    const params = this.makeHttpParams({ moduleScope });
    return this.#http
      .get<GetModuleRes>(`${this.#apiUrl}/${id}`, { params })
      .pipe(catchError(this.handleError<GetModuleRes>('getParentModule')));
  }

  addParentModule(body: CreateParentModuleReq): Observable<ModuleMutationRes> {
    return this.#http
      .post<ModuleMutationRes>(`${this.#apiUrl}/add`, body)
      .pipe(catchError(this.handleError<ModuleMutationRes>('addParentModule')));
  }

  updateParentModule(id: number, body: UpdateParentModuleReq): Observable<ModuleMutationRes> {
    return this.#http
      .put<ModuleMutationRes>(`${this.#apiUrl}/${id}`, body)
      .pipe(catchError(this.handleError<ModuleMutationRes>('updateParentModule')));
  }

  setParentModuleStatus(id: number, body: UpdateModuleStatusReq): Observable<ModuleMutationRes> {
    return this.#http
      .patch<ModuleMutationRes>(`${this.#apiUrl}/${id}/status`, body)
      .pipe(catchError(this.handleError<ModuleMutationRes>('setParentModuleStatus')));
  }
}

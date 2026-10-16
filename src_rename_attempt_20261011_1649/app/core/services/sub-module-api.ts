import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateSubModuleReq,
  GetSubModuleRes,
  GetSubModulesReq,
  GetSubModulesRes,
  ModuleMutationRes,
  UpdateModuleStatusReq,
  UpdateSubModuleReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class SubModuleApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/ChildModule`;
  readonly #http = inject(HttpClient);

  getSubModules(req: GetSubModulesReq): Observable<GetSubModulesRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetSubModulesRes>(`${this.#apiUrl}/list`, { params })
      .pipe(catchError(this.handleError<GetSubModulesRes>('getSubModules')));
  }

  getSubModule(id: number, moduleScope?: number | null): Observable<GetSubModuleRes> {
    const params = this.makeHttpParams({ moduleScope });
    return this.#http
      .get<GetSubModuleRes>(`${this.#apiUrl}/${id}`, { params })
      .pipe(catchError(this.handleError<GetSubModuleRes>('getSubModule')));
  }

  addSubModule(body: CreateSubModuleReq): Observable<ModuleMutationRes> {
    return this.#http
      .post<ModuleMutationRes>(`${this.#apiUrl}/add`, body)
      .pipe(catchError(this.handleError<ModuleMutationRes>('addSubModule')));
  }

  updateSubModule(id: number, body: UpdateSubModuleReq): Observable<ModuleMutationRes> {
    return this.#http
      .put<ModuleMutationRes>(`${this.#apiUrl}/${id}`, body)
      .pipe(catchError(this.handleError<ModuleMutationRes>('updateSubModule')));
  }

  setSubModuleStatus(id: number, body: UpdateModuleStatusReq): Observable<ModuleMutationRes> {
    return this.#http
      .patch<ModuleMutationRes>(`${this.#apiUrl}/${id}/status`, body)
      .pipe(catchError(this.handleError<ModuleMutationRes>('setSubModuleStatus')));
  }
}

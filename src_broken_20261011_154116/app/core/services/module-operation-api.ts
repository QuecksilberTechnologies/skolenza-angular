import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateModuleOperationReq,
  GetModuleOperationRes,
  GetModuleOperationsRes,
  ModuleOperationMutationRes,
  UpdateModuleOperationReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class ModuleOperationApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/ModuleOperation`;
  readonly #http = inject(HttpClient);

  /** Returns every mapping — the endpoint takes no filter params, so the grid filters client-side. */
  getModuleOperations(): Observable<GetModuleOperationsRes> {
    return this.#http
      .get<GetModuleOperationsRes>(`${this.#apiUrl}/get-all`)
      .pipe(catchError(this.handleError<GetModuleOperationsRes>('getModuleOperations')));
  }

  getModuleOperation(id: number): Observable<GetModuleOperationRes> {
    return this.#http
      .get<GetModuleOperationRes>(`${this.#apiUrl}/get-by-id/${id}`)
      .pipe(catchError(this.handleError<GetModuleOperationRes>('getModuleOperation')));
  }

  addModuleOperation(body: CreateModuleOperationReq): Observable<ModuleOperationMutationRes> {
    return this.#http
      .post<ModuleOperationMutationRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<ModuleOperationMutationRes>('addModuleOperation')));
  }

  /** Updates go over POST, not PUT — the id travels in the body. */
  updateModuleOperation(body: UpdateModuleOperationReq): Observable<ModuleOperationMutationRes> {
    return this.#http
      .post<ModuleOperationMutationRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<ModuleOperationMutationRes>('updateModuleOperation')));
  }

  deleteModuleOperation(id: number): Observable<ModuleOperationMutationRes> {
    return this.#http
      .delete<ModuleOperationMutationRes>(`${this.#apiUrl}/delete/${id}`)
      .pipe(catchError(this.handleError<ModuleOperationMutationRes>('deleteModuleOperation')));
  }
}

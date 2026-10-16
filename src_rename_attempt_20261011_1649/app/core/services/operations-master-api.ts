import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateOperationReq,
  GetOperationRes,
  GetOperationsRes,
  OperationMutationRes,
  UpdateOperationReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class OperationsMasterApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/OperationsMaster`;
  readonly #http = inject(HttpClient);

  /** Returns every operation — the endpoint takes no filter params. */
  getOperations(): Observable<GetOperationsRes> {
    return this.#http
      .get<GetOperationsRes>(`${this.#apiUrl}/get-all-operations`)
      .pipe(catchError(this.handleError<GetOperationsRes>('getOperations')));
  }

  getOperation(operationId: number): Observable<GetOperationRes> {
    return this.#http
      .get<GetOperationRes>(`${this.#apiUrl}/get-operation/${operationId}`)
      .pipe(catchError(this.handleError<GetOperationRes>('getOperation')));
  }

  addOperation(body: CreateOperationReq): Observable<OperationMutationRes> {
    return this.#http
      .post<OperationMutationRes>(`${this.#apiUrl}/create-operation`, body)
      .pipe(catchError(this.handleError<OperationMutationRes>('addOperation')));
  }

  /** Updates go over POST, not PUT — the id travels in the body. */
  updateOperation(body: UpdateOperationReq): Observable<OperationMutationRes> {
    return this.#http
      .post<OperationMutationRes>(`${this.#apiUrl}/update-operation`, body)
      .pipe(catchError(this.handleError<OperationMutationRes>('updateOperation')));
  }

  deleteOperation(operationId: number): Observable<OperationMutationRes> {
    return this.#http
      .delete<OperationMutationRes>(`${this.#apiUrl}/delete-operation/${operationId}`)
      .pipe(catchError(this.handleError<OperationMutationRes>('deleteOperation')));
  }
}

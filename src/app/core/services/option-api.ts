import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateOperationReq,
  GetOptionsReq,
  OptionHasAccessReq,
  OptionRes,
  UpdateOperationReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/**
 * `/Option/create` and `/Option/update` take the same DTOs as `/OperationsMaster`, so this is the
 * legacy alias of that controller. Kept as a plain HTTP wrapper — the operations UI talks to
 * `OperationsMasterApi`.
 */
@Injectable({
  providedIn: 'root',
})
export class OptionApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Option`;
  readonly #http = inject(HttpClient);

  getOptions(req: GetOptionsReq): Observable<OptionRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<OptionRes>(`${this.#apiUrl}/get`, { params })
      .pipe(catchError(this.handleError<OptionRes>('getOptions')));
  }

  addOption(body: CreateOperationReq): Observable<OptionRes> {
    return this.#http
      .post<OptionRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<OptionRes>('addOption')));
  }

  updateOption(body: UpdateOperationReq): Observable<OptionRes> {
    return this.#http
      .post<OptionRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<OptionRes>('updateOption')));
  }

  hasAccess(req: OptionHasAccessReq = {}): Observable<OptionRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<OptionRes>(`${this.#apiUrl}/has-access`, { params })
      .pipe(catchError(this.handleError<OptionRes>('hasAccess')));
  }
}

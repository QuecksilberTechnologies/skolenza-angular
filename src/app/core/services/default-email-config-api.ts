import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateDefaultEmailConfigReq,
  DefaultEmailConfigMutationRes,
  GetDefaultEmailConfigRes,
  GetDefaultEmailConfigsRes,
  UpdateDefaultEmailConfigReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class DefaultEmailConfigApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/DefaultEmailConfig`;
  readonly #http = inject(HttpClient);

  /** `get-all` takes no filters or paging — the whole list comes back in one call. */
  getDefaultEmailConfigs(): Observable<GetDefaultEmailConfigsRes> {
    return this.#http
      .get<GetDefaultEmailConfigsRes>(`${this.#apiUrl}/get-all`)
      .pipe(catchError(this.handleError<GetDefaultEmailConfigsRes>('getDefaultEmailConfigs')));
  }

  getDefaultEmailConfig(id: number): Observable<GetDefaultEmailConfigRes> {
    return this.#http
      .get<GetDefaultEmailConfigRes>(`${this.#apiUrl}/get-by-id/${id}`)
      .pipe(catchError(this.handleError<GetDefaultEmailConfigRes>('getDefaultEmailConfig')));
  }

  addDefaultEmailConfig(
    body: CreateDefaultEmailConfigReq,
  ): Observable<DefaultEmailConfigMutationRes> {
    return this.#http
      .post<DefaultEmailConfigMutationRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<DefaultEmailConfigMutationRes>('addDefaultEmailConfig')));
  }

  /** `/update` replaces the record, so the body carries every field. Omitting `smtpPassword`
   *  is what preserves the stored secret. */
  updateDefaultEmailConfig(
    body: UpdateDefaultEmailConfigReq,
  ): Observable<DefaultEmailConfigMutationRes> {
    return this.#http
      .post<DefaultEmailConfigMutationRes>(`${this.#apiUrl}/update`, body)
      .pipe(
        catchError(this.handleError<DefaultEmailConfigMutationRes>('updateDefaultEmailConfig')),
      );
  }

  /** The API rejects a delete on the active configuration — replace it first. */
  deleteDefaultEmailConfig(id: number): Observable<DefaultEmailConfigMutationRes> {
    return this.#http
      .delete<DefaultEmailConfigMutationRes>(`${this.#apiUrl}/delete/${id}`)
      .pipe(
        catchError(this.handleError<DefaultEmailConfigMutationRes>('deleteDefaultEmailConfig')),
      );
  }
}

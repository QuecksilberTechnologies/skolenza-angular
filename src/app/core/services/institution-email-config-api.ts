import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateInstitutionEmailConfigReq,
  GetInstitutionEmailConfigRes,
  GetInstitutionEmailConfigsRes,
  InstitutionEmailConfigMutationRes,
  UpdateInstitutionEmailConfigReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/**
 * Institution-scoped: the server reads the institution off the session, so no method here sends a
 * `InstitutionId`. A host session supplies one, but the host edits a institution's SMTP through
 * `/Institution/*` instead.
 */
@Injectable({
  providedIn: 'root',
})
export class InstitutionEmailConfigApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/InstitutionEmailConfig`;
  readonly #http = inject(HttpClient);

  /** `get-all` takes no filters or paging — the whole list comes back in one call. */
  getInstitutionEmailConfigs(): Observable<GetInstitutionEmailConfigsRes> {
    return this.#http
      .get<GetInstitutionEmailConfigsRes>(`${this.#apiUrl}/get-all`)
      .pipe(catchError(this.handleError<GetInstitutionEmailConfigsRes>('getInstitutionEmailConfigs')));
  }

  getInstitutionEmailConfig(id: number): Observable<GetInstitutionEmailConfigRes> {
    return this.#http
      .get<GetInstitutionEmailConfigRes>(`${this.#apiUrl}/get-by-id/${id}`)
      .pipe(catchError(this.handleError<GetInstitutionEmailConfigRes>('getInstitutionEmailConfig')));
  }

  addInstitutionEmailConfig(body: CreateInstitutionEmailConfigReq): Observable<InstitutionEmailConfigMutationRes> {
    return this.#http
      .post<InstitutionEmailConfigMutationRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<InstitutionEmailConfigMutationRes>('addInstitutionEmailConfig')));
  }

  /** `/update` replaces the record, so the body carries every field. Omitting `smtpPassword`
   *  is what preserves the stored secret. */
  updateInstitutionEmailConfig(
    body: UpdateInstitutionEmailConfigReq,
  ): Observable<InstitutionEmailConfigMutationRes> {
    return this.#http
      .post<InstitutionEmailConfigMutationRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<InstitutionEmailConfigMutationRes>('updateInstitutionEmailConfig')));
  }

  deleteInstitutionEmailConfig(id: number): Observable<InstitutionEmailConfigMutationRes> {
    return this.#http
      .delete<InstitutionEmailConfigMutationRes>(`${this.#apiUrl}/delete/${id}`)
      .pipe(catchError(this.handleError<InstitutionEmailConfigMutationRes>('deleteInstitutionEmailConfig')));
  }
}

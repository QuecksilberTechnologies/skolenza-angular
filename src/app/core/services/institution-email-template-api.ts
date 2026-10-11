import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateEmailTemplateReq,
  EmailTemplateMutationRes,
  GetEmailTemplateRes,
  GetEmailTemplatesReq,
  GetEmailTemplatesRes,
  UpdateEmailTemplateReq,
  UpdateEmailTemplateStatusReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

/**
 * `/api/InstitutionEmailTemplate/*` - the authenticated Institution's own copy of the template catalog.
 *
 * Twin of `EmailTemplateApi`: the six CRUD routes take the same DTOs, so the method names and
 * types match one for one and the Host screens drive either class. `sync` is the one addition.
 */
@Injectable({
  providedIn: 'root',
})
export class InstitutionEmailTemplateApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/InstitutionEmailTemplate`;
  readonly #http = inject(HttpClient);

  getEmailTemplates(req: GetEmailTemplatesReq): Observable<GetEmailTemplatesRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetEmailTemplatesRes>(`${this.#apiUrl}/get-all`, { params })
      .pipe(catchError(this.handleError<GetEmailTemplatesRes>('getEmailTemplates')));
  }

  getEmailTemplate(id: number): Observable<GetEmailTemplateRes> {
    return this.#http
      .get<GetEmailTemplateRes>(`${this.#apiUrl}/get-by-id/${id}`)
      .pipe(catchError(this.handleError<GetEmailTemplateRes>('getEmailTemplate')));
  }

  addEmailTemplate(body: CreateEmailTemplateReq): Observable<EmailTemplateMutationRes> {
    return this.#http
      .post<EmailTemplateMutationRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<EmailTemplateMutationRes>('addEmailTemplate')));
  }

  /** `/update` replaces the record, so the body has to carry every field, not just the changed ones. */
  updateEmailTemplate(body: UpdateEmailTemplateReq): Observable<EmailTemplateMutationRes> {
    return this.#http
      .post<EmailTemplateMutationRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<EmailTemplateMutationRes>('updateEmailTemplate')));
  }

  setEmailTemplateStatus(body: UpdateEmailTemplateStatusReq): Observable<EmailTemplateMutationRes> {
    return this.#http
      .post<EmailTemplateMutationRes>(`${this.#apiUrl}/update-status`, body)
      .pipe(catchError(this.handleError<EmailTemplateMutationRes>('setEmailTemplateStatus')));
  }

  /** The API refuses to delete an active template. */
  deleteEmailTemplate(id: number): Observable<EmailTemplateMutationRes> {
    return this.#http
      .delete<EmailTemplateMutationRes>(`${this.#apiUrl}/delete/${id}`)
      .pipe(catchError(this.handleError<EmailTemplateMutationRes>('deleteEmailTemplate')));
  }

  /**
   * Copies the active Host defaults the Institution does not have yet. Templates it already holds,
   * active or not, are left alone. The body is empty on purpose - `moduleOperationInterceptor`
   * fills its `permissionRequest`.
   */
  syncEmailTemplates(): Observable<EmailTemplateMutationRes> {
    return this.#http
      .post<EmailTemplateMutationRes>(`${this.#apiUrl}/sync`, {})
      .pipe(catchError(this.handleError<EmailTemplateMutationRes>('syncEmailTemplates')));
  }
}

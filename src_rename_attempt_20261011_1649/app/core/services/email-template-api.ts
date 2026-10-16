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
 * The Host-administration half of `/api/EmailTemplate/*`.
 *
 * `get-template-by-code` and `send-template` are deliberately absent: swagger marks both as legacy
 * routes retained for existing backend integrations, and no screen calls them.
 */
@Injectable({
  providedIn: 'root',
})
export class EmailTemplateApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/EmailTemplate`;
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

  /** The API refuses to delete an active template, or one with queued or delivered mail behind it. */
  deleteEmailTemplate(id: number): Observable<EmailTemplateMutationRes> {
    return this.#http
      .delete<EmailTemplateMutationRes>(`${this.#apiUrl}/delete/${id}`)
      .pipe(catchError(this.handleError<EmailTemplateMutationRes>('deleteEmailTemplate')));
  }
}

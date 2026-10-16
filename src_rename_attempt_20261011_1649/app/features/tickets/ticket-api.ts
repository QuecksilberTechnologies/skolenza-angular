import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { BaseService } from '@core/services';
import { environment } from '@env/environment';
import {
  DeleteTicketClassificationRequest,
  DeleteTicketHeaderRequest,
  GetClassificationDdlResponse,
  GetTicketClassificationsRequest,
  GetTicketClassificationsResponse,
  GetTicketHeadersRequest,
  GetTicketHeadersResponse,
  GetTicketTypeDdlResponse,
  GetTicketTypesRequest,
  GetTicketTypesResponse,
  OpenTicketRequest,
  OpenTicketResponse,
  UpsertTicketClassificationRequest,
  UpsertTicketHeaderRequest,
  UpsertTicketTypeRequest,
} from '@tickets/models';

@Injectable({
  providedIn: 'root',
})
export class TicketApi extends BaseService {
  readonly #classificationUrl = `${environment.apiUrl}/TicketClassification`;
  readonly #ticketUrl = `${environment.apiUrl}/Ticket`;
  readonly #http = inject(HttpClient);

  // Classification DDL
  getClassificationDdl(isActive = true): Observable<GetClassificationDdlResponse> {
    return this.#http
      .get<GetClassificationDdlResponse>(`${this.#classificationUrl}/ddl-list`, {
        params: { IsActive: isActive },
      })
      .pipe(catchError(this.handleError<GetClassificationDdlResponse>('getClassificationDdl')));
  }

  // Classification
  getClassifications(
    req: GetTicketClassificationsRequest,
  ): Observable<GetTicketClassificationsResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetTicketClassificationsResponse>(`${this.#classificationUrl}/all`, { params })
      .pipe(catchError(this.handleError<GetTicketClassificationsResponse>('getClassifications')));
  }

  addClassification(
    body: UpsertTicketClassificationRequest,
  ): Observable<GetTicketClassificationsResponse> {
    return this.#http
      .post<GetTicketClassificationsResponse>(`${this.#classificationUrl}/create`, body)
      .pipe(catchError(this.handleError<GetTicketClassificationsResponse>('addClassification')));
  }

  updateClassification(
    body: UpsertTicketClassificationRequest,
  ): Observable<GetTicketClassificationsResponse> {
    return this.#http
      .put<GetTicketClassificationsResponse>(`${this.#classificationUrl}/update`, body)
      .pipe(catchError(this.handleError<GetTicketClassificationsResponse>('updateClassification')));
  }

  deleteClassification(
    body: DeleteTicketClassificationRequest,
  ): Observable<GetTicketClassificationsResponse> {
    return this.#http
      .delete<GetTicketClassificationsResponse>(`${this.#classificationUrl}/delete`, { body })
      .pipe(catchError(this.handleError<GetTicketClassificationsResponse>('deleteClassification')));
  }

  // Headers
  getHeaders(req: GetTicketHeadersRequest): Observable<GetTicketHeadersResponse> {
    const params = this.makeHttpParams(req);
    const url = req.TicketClassifyId
      ? `${this.#ticketUrl}/TicketHeader/get-by-classification-id`
      : `${this.#ticketUrl}/TicketHeader/get-all`;
    return this.#http
      .get<GetTicketHeadersResponse>(url, { params })
      .pipe(catchError(this.handleError<GetTicketHeadersResponse>('getHeaders')));
  }

  addHeader(body: UpsertTicketHeaderRequest): Observable<GetTicketHeadersResponse> {
    return this.#http
      .post<GetTicketHeadersResponse>(`${this.#ticketUrl}/TicketHeader/create`, body)
      .pipe(catchError(this.handleError<GetTicketHeadersResponse>('addHeader')));
  }

  updateHeader(body: UpsertTicketHeaderRequest): Observable<GetTicketHeadersResponse> {
    return this.#http
      .put<GetTicketHeadersResponse>(`${this.#ticketUrl}/TicketHeader/update`, body)
      .pipe(catchError(this.handleError<GetTicketHeadersResponse>('updateHeader')));
  }

  deleteHeader(body: DeleteTicketHeaderRequest): Observable<GetTicketHeadersResponse> {
    return this.#http
      .delete<GetTicketHeadersResponse>(`${this.#ticketUrl}/TicketHeader/delete`, { body })
      .pipe(catchError(this.handleError<GetTicketHeadersResponse>('deleteHeader')));
  }

  // Types
  getTypes(req: GetTicketTypesRequest): Observable<GetTicketTypesResponse> {
    const params = this.makeHttpParams(req);
    const url = req.HeaderId
      ? `${this.#ticketUrl}/TicketType/get-by-header-id`
      : `${this.#ticketUrl}/TicketType/get-all`;
    return this.#http
      .get<GetTicketTypesResponse>(url, { params })
      .pipe(catchError(this.handleError<GetTicketTypesResponse>('getTypes')));
  }

  addType(body: UpsertTicketTypeRequest): Observable<GetTicketTypesResponse> {
    return this.#http
      .post<GetTicketTypesResponse>(`${this.#ticketUrl}/TicketType/create`, body)
      .pipe(catchError(this.handleError<GetTicketTypesResponse>('addType')));
  }

  updateType(body: UpsertTicketTypeRequest): Observable<GetTicketTypesResponse> {
    return this.#http
      .put<GetTicketTypesResponse>(`${this.#ticketUrl}/TicketType/update`, body)
      .pipe(catchError(this.handleError<GetTicketTypesResponse>('updateType')));
  }

  deleteType(id: number): Observable<GetTicketTypesResponse> {
    return this.#http
      .delete<GetTicketTypesResponse>(`${this.#ticketUrl}/TicketType/delete`, { params: { id } })
      .pipe(catchError(this.handleError<GetTicketTypesResponse>('deleteType')));
  }

  // Ticket Type DDL
  getTicketTypeDdl(isActive = true): Observable<GetTicketTypeDdlResponse> {
    return this.#http
      .get<GetTicketTypeDdlResponse>(`${this.#ticketUrl}/TicketType/ddl-list`, {
        params: { IsActive: isActive },
      })
      .pipe(catchError(this.handleError<GetTicketTypeDdlResponse>('getTicketTypeDdl')));
  }

  // Ticket Creation
  openTicket(body: OpenTicketRequest): Observable<OpenTicketResponse> {
    return this.#http
      .post<OpenTicketResponse>(`${environment.apiUrl}/TicketCreation/open`, body)
      .pipe(catchError(this.handleError<OpenTicketResponse>('openTicket')));
  }
}

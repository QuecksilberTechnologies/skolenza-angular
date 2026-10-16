import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AddReportTypeRequest,
  DeleteReportTypeRequest,
  GetReportTypesRequest,
  GetReportTypesResponse,
  UpdateReportTypeRequest,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class ReportTypeApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/ReportingType`;
  readonly #http = inject(HttpClient);

  getReportTypes(req: GetReportTypesRequest): Observable<GetReportTypesResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetReportTypesResponse>(`${this.#apiUrl}/get-all`, { params })
      .pipe(catchError(this.handleError<GetReportTypesResponse>('getReportTypes')));
  }

  addReportType(body: AddReportTypeRequest): Observable<GetReportTypesResponse> {
    return this.#http
      .post<GetReportTypesResponse>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<GetReportTypesResponse>('addReportType')));
  }

  updateReportType(body: UpdateReportTypeRequest): Observable<GetReportTypesResponse> {
    return this.#http
      .put<GetReportTypesResponse>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<GetReportTypesResponse>('updateReportType')));
  }

  deleteReportType(req: DeleteReportTypeRequest): Observable<GetReportTypesResponse> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<GetReportTypesResponse>(`${this.#apiUrl}/delete`, { params })
      .pipe(catchError(this.handleError<GetReportTypesResponse>('deleteReportType')));
  }
}

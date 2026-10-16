import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateHolidayReq,
  GetHolidayCalendarDisplayConstantsRes,
  GetHolidayRes,
  GetHolidaysReq,
  GetHolidaysRes,
  HolidayMutationRes,
  ImportHolidaysRes,
  UpdateHolidayReq,
} from '@shared/interfaces';
import { SKIP_ERROR_TOAST } from '@shared/utilities/skip-error-toast.token';

import { BaseService } from './base-service';

/**
 * `/api/Holiday` — institution-scoped, location-based holidays.
 *
 * `ModuleId`/`OperationId` are stamped by `moduleOperationInterceptor` against
 * `INSTITUTION_POLICY_HOLIDAY` (`MODULE_OPERATION_ROUTES`, `CONTROLLER_MODULE_FALLBACK`), so
 * nothing here builds them by hand.
 */
@Injectable({
  providedIn: 'root',
})
export class HolidayCalandarApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Holiday`;
  readonly #http = inject(HttpClient);

  /**
   * Shared staffMember-calendar colour/status palette. Token-only: no ModuleId/OperationId needed.
   * Callers fall back to built-in styles, so a failure here must not raise the global error toast.
   */
  getCalendarDisplayConstants(): Observable<GetHolidayCalendarDisplayConstantsRes> {
    return this.#http
      .get<GetHolidayCalendarDisplayConstantsRes>(`${this.#apiUrl}/calendar-display-constants`, {
        context: new HttpContext().set(SKIP_ERROR_TOAST, true),
      })
      .pipe(
        catchError(
          this.handleError<GetHolidayCalendarDisplayConstantsRes>('getCalendarDisplayConstants'),
        ),
      );
  }

  /** Active holidays for the current institution. `InstitutionLocationId`/`HolidayYear` are optional filters. */
  getHolidays(req: GetHolidaysReq = {}): Observable<GetHolidaysRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetHolidaysRes>(`${this.#apiUrl}/get`, { params })
      .pipe(catchError(this.handleError<GetHolidaysRes>('getHolidays')));
  }

  /** One nondeleted holiday, inactive included. */
  getHoliday(id: number): Observable<GetHolidayRes> {
    return this.#http
      .get<GetHolidayRes>(`${this.#apiUrl}/${id}`)
      .pipe(catchError(this.handleError<GetHolidayRes>('getHoliday')));
  }

  addHoliday(body: CreateHolidayReq): Observable<HolidayMutationRes> {
    return this.#http
      .post<HolidayMutationRes>(this.#apiUrl, body)
      .pipe(catchError(this.handleError<HolidayMutationRes>('addHoliday')));
  }

  /** `/{id}` replaces the record — `body` carries every field, not just the changed ones. */
  updateHoliday(id: number, body: UpdateHolidayReq): Observable<HolidayMutationRes> {
    return this.#http
      .put<HolidayMutationRes>(`${this.#apiUrl}/${id}`, body)
      .pipe(catchError(this.handleError<HolidayMutationRes>('updateHoliday')));
  }

  /** Soft-delete: the row survives and stays reachable through `getHoliday`. */
  deleteHoliday(id: number): Observable<HolidayMutationRes> {
    return this.#http
      .delete<HolidayMutationRes>(`${this.#apiUrl}/${id}`)
      .pipe(catchError(this.handleError<HolidayMutationRes>('deleteHoliday')));
  }

  /**
   * Multipart: exactly one of `File`/`PastedText`, with `InstitutionLocationId`, `HolidayName`,
   * `HolidayDate`, `IsOptional`, `Description` and `Icon` columns. An existing nondeleted date
   * saves no rows; an inactive entry blocks the date too, until it is soft-deleted.
   */
  importHolidays(body: FormData): Observable<ImportHolidaysRes> {
    return this.#http
      .post<ImportHolidaysRes>(`${this.#apiUrl}/import`, body)
      .pipe(catchError(this.handleError<ImportHolidaysRes>('importHolidays')));
  }

  /** UTF-8 CSV of active institution holidays, same optional filters as {@link getHolidays}. */
  exportHolidays(req: GetHolidaysReq = {}): Observable<Blob> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get(`${this.#apiUrl}/export`, { params, responseType: 'blob' })
      .pipe(catchError(this.handleError<Blob>('exportHolidays')));
  }
}


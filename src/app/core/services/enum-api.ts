import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import { CurrencyOption } from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class EnumApi extends BaseService {
  readonly #enumApiUrl = `${environment.apiUrl}/Enum`;
  readonly #http = inject(HttpClient);

  constructor() {
    super();
  }

  /**
   * The currency master behind `Institution.defaultCurrency`. `IsActive` is a required query param.
   *
   * Alone among the endpoints this app calls, it answers with a bare array rather than the
   * `{ isSucceeded, message, data }` envelope — there is nothing to unwrap.
   */
  getAllCurrencies(isActive = true): Observable<CurrencyOption[]> {
    const params = this.makeHttpParams({ IsActive: isActive });
    return this.#http
      .get<CurrencyOption[]>(`${this.#enumApiUrl}/get-all-currencies`, { params })
      .pipe(catchError(this.handleError<CurrencyOption[]>('getAllCurrencies')));
  }
}

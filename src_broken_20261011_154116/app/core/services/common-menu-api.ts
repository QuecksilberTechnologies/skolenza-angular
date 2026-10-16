import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import { CommonMenuResponse } from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class CommonMenuApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/CommonMenu`;

  readonly #http = inject(HttpClient);

  getCommonMenu(): Observable<CommonMenuResponse> {
    return this.#http
      .get<CommonMenuResponse>(this.#apiUrl)
      .pipe(catchError(this.handleError<CommonMenuResponse>('getCommonMenu')));
  }
}

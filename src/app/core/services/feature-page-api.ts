import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import { GetMyMenuRes } from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class FeaturePageApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Navigation`;
  readonly #http = inject(HttpClient);

  /**
   * The caller's own menu tree, already scoped and permission-filtered by the backend.
   *
   * Takes no parameters: the session decides the scope, so one call serves every role.
   */
  getFeaturePages(): Observable<GetMyMenuRes> {
    return this.#http
      .get<GetMyMenuRes>(`${this.#apiUrl}/my-menu`)
      .pipe(catchError(this.handleError<GetMyMenuRes>('getFeaturePages')));
  }
}

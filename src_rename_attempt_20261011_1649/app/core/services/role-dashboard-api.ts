import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import { RoleDashboardCode, RoleDashboardRes } from '@shared/interfaces';

import { BaseService } from './base-service';

/**
 * `GET /api/Dashboard/{roleTypeCode}` - the whole dashboard for one role type in one call.
 *
 * `ModuleId` / `OperationId` come from the `dashboard` controller fallback in
 * `module-operation-routes.ts`, so callers never pass them.
 */
@Injectable({
  providedIn: 'root',
})
export class RoleDashboardApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Dashboard`;
  readonly #http = inject(HttpClient);

  getDashboard(roleTypeCode: RoleDashboardCode): Observable<RoleDashboardRes> {
    return this.#http
      .get<RoleDashboardRes>(`${this.#apiUrl}/${roleTypeCode}`)
      .pipe(catchError(this.handleError<RoleDashboardRes>('getDashboard')));
  }
}

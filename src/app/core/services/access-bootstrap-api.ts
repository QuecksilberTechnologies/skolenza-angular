import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import { HostAccessBootstrapResponse, InstitutionAccessBootstrapResponse } from '@shared/interfaces';
import { SKIP_ERROR_TOAST } from '@shared/utilities/skip-error-toast.token';

import { BaseService } from './base-service';

/** Token-scoped access bootstrap: one call returns the signed-in user's whole
 *  module/operation catalog, so no role id has to be supplied or recovered. */
@Injectable({
  providedIn: 'root',
})
export class AccessBootstrapApi extends BaseService {
  readonly #hostUrl = `${environment.apiUrl}/PlatformAccess/bootstrap`;
  readonly #institutionUrl = `${environment.apiUrl}/InstitutionUserAccess/bootstrap`;

  readonly #http = inject(HttpClient);

  /** A 403 here is not a dead end — CurrentUserPermissionsStore falls back to the legacy
   *  permission endpoints — so it must not raise the global denial toast on every load. */
  readonly #skipDenialToast = { context: new HttpContext().set(SKIP_ERROR_TOAST, true) };

  getHostBootstrap(): Observable<HostAccessBootstrapResponse> {
    return this.#http
      .get<HostAccessBootstrapResponse>(this.#hostUrl, this.#skipDenialToast)
      .pipe(catchError(this.handleError<HostAccessBootstrapResponse>('getHostBootstrap')));
  }

  getInstitutionBootstrap(): Observable<InstitutionAccessBootstrapResponse> {
    return this.#http
      .get<InstitutionAccessBootstrapResponse>(this.#institutionUrl, this.#skipDenialToast)
      .pipe(catchError(this.handleError<InstitutionAccessBootstrapResponse>('getInstitutionBootstrap')));
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  GetPlanModuleOptionsRes,
  PlanModuleMappingMutationRes,
  SavePlanModuleMappingReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class PlanModuleMappingApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/PlanModuleMapping`;
  readonly #http = inject(HttpClient);

  /** Every module offered to the plan, already scoped by the API, each flagged with `isMapped`. */
  getPlanModuleOptions(subscriptionPlanId: number): Observable<GetPlanModuleOptionsRes> {
    const url = `${this.#apiUrl}/options/${subscriptionPlanId}`;
    return this.#http
      .get<GetPlanModuleOptionsRes>(url)
      .pipe(catchError(this.handleError<GetPlanModuleOptionsRes>('getPlanModuleOptions')));
  }

  /**
   * Replaces the plan's mapping wholesale — ids left out of `moduleIds` are unmapped.
   *
   * The content type is set explicitly. Angular infers it for an object body anyway, but this
   * endpoint has answered a well-formed POST with "The input does not contain any JSON tokens",
   * so nothing about how the body is framed is left to inference here.
   */
  savePlanModuleMapping(body: SavePlanModuleMappingReq): Observable<PlanModuleMappingMutationRes> {
    const url = `${this.#apiUrl}/save`;
    return this.#http
      .post<PlanModuleMappingMutationRes>(url, body, {
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(catchError(this.handleError<PlanModuleMappingMutationRes>('savePlanModuleMapping')));
  }
}

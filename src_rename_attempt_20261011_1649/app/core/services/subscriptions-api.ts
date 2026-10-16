import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreateSubscriptionPlanReq,
  DeleteSubscriptionPlanReq,
  GetAllSubscriptionPlanReq,
  GetAllSubscriptionPlanRes,
  GetHostSubscriptionPlansReq,
  GetHostSubscriptionPlansRes,
  GetInstitutionAccessibleModulesReq,
  GetInstitutionAccessibleModulesRes,
  GetInstitutionSubscriptionPlanReq,
  GetInstitutionSubscriptionPlanRes,
  SubscriptionMutationRes,
  UpdateSubscriptionPlanReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class SubscriptionsApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Subscription`;
  readonly #http = inject(HttpClient);

  constructor() {
    super();
  }

  getAllSubscriptionPlan(req: GetAllSubscriptionPlanReq): Observable<GetAllSubscriptionPlanRes> {
    const url = `${this.#apiUrl}/get-all-subscription-plan`;
    return this.#http
      .get<GetAllSubscriptionPlanRes>(url, { params: this.makeHttpParams(req) })
      .pipe(catchError(this.handleError<GetAllSubscriptionPlanRes>('getAllSubscriptionPlan')));
  }

  getHostSubscriptionPlans(
    req: GetHostSubscriptionPlansReq,
  ): Observable<GetHostSubscriptionPlansRes> {
    const url = `${this.#apiUrl}/get-all-host-subscription-plans`;
    // "All" is the absence of the filter, not an explicit null — what `makeHttpParams` used to do
    // for us while this endpoint was a GET.
    const { isActive, ...rest } = req;
    const body = isActive === null ? rest : { ...rest, isActive };
    return this.#http
      .post<GetHostSubscriptionPlansRes>(url, body)
      .pipe(catchError(this.handleError<GetHostSubscriptionPlansRes>('getHostSubscriptionPlans')));
  }

  getInstitutionSubscriptionPlan(
    req: GetInstitutionSubscriptionPlanReq,
  ): Observable<GetInstitutionSubscriptionPlanRes> {
    const url = `${this.#apiUrl}/get-institution-subscription-plan-info`;
    return this.#http
      .get<GetInstitutionSubscriptionPlanRes>(url, { params: this.makeHttpParams(req) })
      .pipe(
        catchError(this.handleError<GetInstitutionSubscriptionPlanRes>('getInstitutionSubscriptionPlan')),
      );
  }

  /** The modules a institution's plan grants — the read side of `Institution/update-modules-and-operations`. */
  getInstitutionAccessibleModules(
    req: GetInstitutionAccessibleModulesReq,
  ): Observable<GetInstitutionAccessibleModulesRes> {
    const url = `${this.#apiUrl}/get-all-institution-accessible-modules`;
    return this.#http
      .get<GetInstitutionAccessibleModulesRes>(url, { params: this.makeHttpParams(req) })
      .pipe(
        catchError(this.handleError<GetInstitutionAccessibleModulesRes>('getInstitutionAccessibleModules')),
      );
  }

  addSubscriptionPlan(body: CreateSubscriptionPlanReq): Observable<SubscriptionMutationRes> {
    const url = `${this.#apiUrl}/add`;
    return this.#http
      .post<SubscriptionMutationRes>(url, body)
      .pipe(catchError(this.handleError<SubscriptionMutationRes>('addSubscriptionPlan')));
  }

  deleteSubscriptionPlan(body: DeleteSubscriptionPlanReq): Observable<SubscriptionMutationRes> {
    const url = `${this.#apiUrl}/delete-subscription-plan`;
    return this.#http
      .post<SubscriptionMutationRes>(url, body)
      .pipe(catchError(this.handleError<SubscriptionMutationRes>('deleteSubscriptionPlan')));
  }

  /** The API expects the id in the path as well as the body. */
  updateSubscriptionPlan(body: UpdateSubscriptionPlanReq): Observable<SubscriptionMutationRes> {
    const url = `${this.#apiUrl}/${body.id}`;
    return this.#http
      .put<SubscriptionMutationRes>(url, body)
      .pipe(catchError(this.handleError<SubscriptionMutationRes>('updateSubscriptionPlan')));
  }
}

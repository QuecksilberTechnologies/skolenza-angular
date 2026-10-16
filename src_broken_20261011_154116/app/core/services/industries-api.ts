import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  GetAllIndustryResponse,
  GetInstitutionSubscriptionPlansReq,
  GetInstitutionSubscriptionPlansRes,
  Industry,
  InstitutionProfileOptionsResponse,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class IndustriesApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/InstitutionType`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #industries = signal<Industry[]>([]);
  readonly #isLoading = signal(false);

  // Public readonly signals for components
  readonly industries = this.#industries.asReadonly();
  readonly isLoading = this.#isLoading.asReadonly();

  constructor() {
    super();
  }

  setIndustries(data: Industry[]) {
    this.#industries.set(data);
  }

  setIsLoading(value: boolean) {
    this.#isLoading.set(value);
  }

  getIndustries(planId: number): Observable<GetAllIndustryResponse> {
    const params = new HttpParams().set('planId', planId.toString());
    return this.#http
      .get<GetAllIndustryResponse>(`${this.#apiUrl}/get-institution-types`, { params })
      .pipe(catchError(this.handleError<GetAllIndustryResponse>('getInstitutionTypes')));
  }

  getInstitutionCategoryOptions(): Observable<InstitutionProfileOptionsResponse> {
    return this.#http
      .get<InstitutionProfileOptionsResponse>(`${this.#apiUrl}/category-options`)
      .pipe(
        catchError(
          this.handleError<InstitutionProfileOptionsResponse>('getInstitutionCategoryOptions'),
        ),
      );
  }

  getInstitutionCampusTypeOptions(): Observable<InstitutionProfileOptionsResponse> {
    return this.#http
      .get<InstitutionProfileOptionsResponse>(`${this.#apiUrl}/campus-type-options`)
      .pipe(
        catchError(
          this.handleError<InstitutionProfileOptionsResponse>('getInstitutionCampusTypeOptions'),
        ),
      );
  }

  /**
   * Which institutions sit on a subscription plan. It lives on this service because the endpoint is on
   * the `/InstitutionType` controller, even though the payload is subscription data.
   * `data` is null when the plan has no subscribers — that is not an error.
   */
  getInstitutionSubscriptionPlans(
    req: GetInstitutionSubscriptionPlansReq,
  ): Observable<GetInstitutionSubscriptionPlansRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInstitutionSubscriptionPlansRes>(`${this.#apiUrl}/get-institution-subscription-plan`, {
        params,
      })
      .pipe(
        catchError(this.handleError<GetInstitutionSubscriptionPlansRes>('getInstitutionSubscriptionPlans')),
      );
  }
}


import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  DeleteInsurancePolicyReq,
  GetInsuranceDetailReq,
  GetInsuranceDetailRes,
  GetInsurancePolicyNamesReq,
  GetInsurancePolicyNamesRes,
  GetInsurancePolicyReq,
  GetInsurancePolicyRes,
  InsurancePolicy,
  InsurancePolicyName,
  UpsertInsurancePolicyReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class PoliciesInsuranceApi extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Insurance`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #insurancPolicies = signal<InsurancePolicy[]>([]);
  readonly #insurancePolicyNames = signal<InsurancePolicyName[]>([]);
  readonly #totalRecords = signal<number>(0);
  readonly #isLoading = signal<boolean>(false);
  readonly #isLoadingNames = signal<boolean>(false);

  // Public readonly signals for components
  readonly insurancPolicies = this.#insurancPolicies.asReadonly();
  readonly insurancePolicyNames = this.#insurancePolicyNames.asReadonly();
  readonly totalRecords = this.#totalRecords.asReadonly();
  readonly isLoading = this.#isLoading.asReadonly();
  readonly isLoadingNames = this.#isLoadingNames.asReadonly();

  constructor() {
    super();
  }

  setIsLoading(value: boolean) {
    this.#isLoading.set(value);
  }

  setInsurancPolicies(data: InsurancePolicy[]) {
    this.#insurancPolicies.set(data);
  }

  setTotalRecords(value: number) {
    this.#totalRecords.set(value);
  }

  setIsLoadingNames(value: boolean) {
    this.#isLoadingNames.set(value);
  }

  setInsurancePolicyNames(data: InsurancePolicyName[]) {
    this.#insurancePolicyNames.set(data);
  }

  // CRUD
  createInsurancePolicies(body: UpsertInsurancePolicyReq): Observable<GetInsurancePolicyRes> {
    return this.#http
      .post<GetInsurancePolicyRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<GetInsurancePolicyRes>('createInsurancePolicies')));
  }

  getInsurancePolicies(req: GetInsurancePolicyReq): Observable<GetInsurancePolicyRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInsurancePolicyRes>(`${this.#apiUrl}/get-all`, { params })
      .pipe(catchError(this.handleError<GetInsurancePolicyRes>('getInsurancePolicies')));
  }

  getInsurancePolicyNames(req: GetInsurancePolicyNamesReq): Observable<GetInsurancePolicyNamesRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInsurancePolicyNamesRes>(`${this.#apiUrl}/get-ddl`, { params })
      .pipe(catchError(this.handleError<GetInsurancePolicyNamesRes>('getInsurancePolicyNames')));
  }

  updateInsurancePolicies(body: UpsertInsurancePolicyReq): Observable<GetInsurancePolicyRes> {
    return this.#http
      .put<GetInsurancePolicyRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<GetInsurancePolicyRes>('createInsurancePolicies')));
  }

  deleteInsurancePolicy(req: DeleteInsurancePolicyReq) {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<GetInsurancePolicyRes>(`${this.#apiUrl}/delete`, { params })
      .pipe(catchError(this.handleError<GetInsurancePolicyRes>('deleteInsurancePolicies')));
  }

  getInsuranceDetails(req: GetInsuranceDetailReq): Observable<GetInsuranceDetailRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetInsuranceDetailRes>(`${this.#apiUrl}/get-detail-ddl`, { params })
      .pipe(catchError(this.handleError<GetInsuranceDetailRes>('getInsuranceDetails')));
  }
}

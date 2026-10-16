import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  DeletePolicyTypeInsuranceMapReq,
  GetPolicyTypeInsuranceMapDetailReq,
  GetPolicyTypeInsuranceMapDetailRes,
  GetPolicyTypeInsuranceMapReq,
  IPolicyTypeInsuranceMap,
  IPolicyTypeInsuranceMapDetail,
  PolicyTypeInsuranceMapRes,
  UpsertPolicyTypeInsuranceMapReq,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class PolicyTypeInsuranceMapApi extends BaseService {
  readonly #policyTypeInsuranceMapApiUrl = `${environment.apiUrl}/PolicyTypeInsuranceMap`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #policyTypeInsuranceMaps = signal<IPolicyTypeInsuranceMap[]>([]);
  readonly #policyTypeInsuranceMapDetails = signal<IPolicyTypeInsuranceMapDetail[]>([]);
  readonly #totalRecords = signal<number>(0);
  readonly #isLoading = signal<boolean>(false);

  // Public readonly signals for components
  readonly policyTypeInsuranceMaps = this.#policyTypeInsuranceMaps.asReadonly();
  readonly policyTypeInsuranceMapDetails = this.#policyTypeInsuranceMapDetails.asReadonly();
  readonly totalRecords = this.#totalRecords.asReadonly();
  readonly isLoading = this.#isLoading.asReadonly();

  constructor() {
    super();
  }

  setIsLoading(value: boolean) {
    this.#isLoading.set(value);
  }

  setPolicyTypeInsuranceMaps(data: IPolicyTypeInsuranceMap[]) {
    this.#policyTypeInsuranceMaps.set(data);
  }

  setPolicyTypeInsuranceMapDetails(data: IPolicyTypeInsuranceMapDetail[]) {
    this.#policyTypeInsuranceMapDetails.set(data);
  }

  setTotalRecords(value: number) {
    this.#totalRecords.set(value);
  }

  getPolicyTypeInsuranceMaps(
    req: GetPolicyTypeInsuranceMapReq,
  ): Observable<PolicyTypeInsuranceMapRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<PolicyTypeInsuranceMapRes>(`${this.#policyTypeInsuranceMapApiUrl}/get-all`, { params })
      .pipe(catchError(this.handleError<PolicyTypeInsuranceMapRes>('getPolicyTypeInsuranceMaps')));
  }

  getPolicyTypeInsuranceMapDetails(
    req: GetPolicyTypeInsuranceMapDetailReq,
  ): Observable<GetPolicyTypeInsuranceMapDetailRes> {
    const params = this.makeHttpParams(req);
    const options = { params };
    return this.#http
      .get<GetPolicyTypeInsuranceMapDetailRes>(
        `${this.#policyTypeInsuranceMapApiUrl}/get-details`,
        options,
      )
      .pipe(
        catchError(
          this.handleError<GetPolicyTypeInsuranceMapDetailRes>('getPolicyTypeInsuranceMapDetails'),
        ),
      );
  }

  mapPolicyTypeInsurance(
    body: UpsertPolicyTypeInsuranceMapReq,
  ): Observable<PolicyTypeInsuranceMapRes> {
    return this.#http
      .post<PolicyTypeInsuranceMapRes>(`${this.#policyTypeInsuranceMapApiUrl}/map`, body)
      .pipe(catchError(this.handleError<PolicyTypeInsuranceMapRes>('mapPolicyTypeInsurance')));
  }

  updatePolicyTypeInsuranceMap(
    body: UpsertPolicyTypeInsuranceMapReq,
  ): Observable<PolicyTypeInsuranceMapRes> {
    return this.#http
      .put<PolicyTypeInsuranceMapRes>(`${this.#policyTypeInsuranceMapApiUrl}/update`, body)
      .pipe(
        catchError(this.handleError<PolicyTypeInsuranceMapRes>('updatePolicyTypeInsuranceMap')),
      );
  }

  deletePolicyTypeInsuranceMap(
    req: DeletePolicyTypeInsuranceMapReq,
  ): Observable<PolicyTypeInsuranceMapRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<PolicyTypeInsuranceMapRes>(`${this.#policyTypeInsuranceMapApiUrl}/delete`, { params })
      .pipe(
        catchError(this.handleError<PolicyTypeInsuranceMapRes>('deletePolicyTypeInsuranceMap')),
      );
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  DeletePolicyTypeReq,
  GetPolicyTypeNamesReq,
  GetPolicyTypeNamesRes,
  GetPolicyTypesReq,
  GetPolicyTypesRes,
  GetPolicyTypeUnstructReq,
  GetPolicyTypeUnstructRes,
  IPolicyTypeUnstructDetail,
  PolicyType,
  PolicyTypesName,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class PolicyTypeApi extends BaseService {
  readonly #policyTypeApiUrl = `${environment.apiUrl}/PolicyType`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #policyTypes = signal<PolicyType[]>([]);
  readonly #policyTypeNames = signal<PolicyTypesName[]>([]);
  readonly #policyTypeUnstructDetails = signal<IPolicyTypeUnstructDetail[]>([]);
  readonly #totalRecords = signal<number>(0);
  readonly #isLoading = signal<boolean>(false);
  readonly #isLoadingNames = signal<boolean>(false);
  readonly #isLoadingUnstruct = signal<boolean>(false);

  // Public readonly signals for components
  readonly policyTypes = this.#policyTypes.asReadonly();
  readonly policyTypeNames = this.#policyTypeNames.asReadonly();
  readonly policyTypeUnstructDetails = this.#policyTypeUnstructDetails.asReadonly();
  readonly totalRecords = this.#totalRecords.asReadonly();
  readonly isLoading = this.#isLoading.asReadonly();
  readonly isLoadingNames = this.#isLoadingNames.asReadonly();
  readonly isLoadingUnstruct = this.#isLoadingUnstruct.asReadonly();

  constructor() {
    super();
  }

  setIsLoading(value: boolean) {
    this.#isLoading.set(value);
  }

  setPolicyTypes(data: PolicyType[]) {
    this.#policyTypes.set(data);
  }

  setTotalRecords(value: number) {
    this.#totalRecords.set(value);
  }

  setIsLoadingNames(value: boolean) {
    this.#isLoadingNames.set(value);
  }

  setPolicyTypeNames(data: PolicyTypesName[]) {
    this.#policyTypeNames.set(data);
  }

  setIsLoadingUnstruct(value: boolean) {
    this.#isLoadingUnstruct.set(value);
  }

  setPolicyTypeUnstructDetails(data: IPolicyTypeUnstructDetail[]) {
    this.#policyTypeUnstructDetails.set(data);
  }

  getPolicyTypes(req: GetPolicyTypesReq): Observable<GetPolicyTypesRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetPolicyTypesRes>(`${this.#policyTypeApiUrl}/get-all`, { params })
      .pipe(catchError(this.handleError<GetPolicyTypesRes>('getPolicyTypes')));
  }

  getPolicyTypeNames(req: GetPolicyTypeNamesReq): Observable<GetPolicyTypeNamesRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetPolicyTypeNamesRes>(`${this.#policyTypeApiUrl}/get-ddl`, { params })
      .pipe(catchError(this.handleError<GetPolicyTypeNamesRes>('getPolicyTypeNames')));
  }

  createPolicyType(body: FormData): Observable<GetPolicyTypesRes> {
    return this.#http
      .post<GetPolicyTypesRes>(`${this.#policyTypeApiUrl}/create`, body)
      .pipe(catchError(this.handleError<GetPolicyTypesRes>('createPolicyType')));
  }

  updatePolicyType(body: FormData): Observable<GetPolicyTypesRes> {
    return this.#http
      .post<GetPolicyTypesRes>(`${this.#policyTypeApiUrl}/update`, body)
      .pipe(catchError(this.handleError<GetPolicyTypesRes>('updatePolicyType')));
  }

  getPolicyTypeUnstructDetails(
    req: GetPolicyTypeUnstructReq,
  ): Observable<GetPolicyTypeUnstructRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetPolicyTypeUnstructRes>(`${this.#policyTypeApiUrl}/get-all-unstruct`, { params })
      .pipe(catchError(this.handleError<GetPolicyTypeUnstructRes>('getPolicyTypeUnstructDetails')));
  }

  deletePolicyType(req: DeletePolicyTypeReq): Observable<GetPolicyTypesRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<GetPolicyTypesRes>(`${this.#policyTypeApiUrl}/delete`, { params })
      .pipe(catchError(this.handleError<GetPolicyTypesRes>('deletePolicyType')));
  }
}

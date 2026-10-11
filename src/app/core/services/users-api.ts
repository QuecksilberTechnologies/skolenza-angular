import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError } from 'rxjs';

import { environment } from '@env/environment';
import { GetGenderOptionReq, GetGendersRes, IGender } from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class UsersApi extends BaseService {
  readonly #genderApiUrl = `${environment.apiUrl}/Gender`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #genders = signal<IGender[]>([]);
  readonly #isLoading = signal(false);

  // Public readonly signals for components
  readonly genders = this.#genders.asReadonly();
  readonly isLoading = this.#isLoading.asReadonly();

  constructor() {
    super();
  }

  setIsLoading(value: boolean) {
    this.#isLoading.set(value);
  }

  setGenders(data: IGender[]) {
    this.#genders.set(data);
  }

  getGenderOptions(req: GetGenderOptionReq) {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetGendersRes>(`${this.#genderApiUrl}/option`, { params })
      .pipe(catchError(this.handleError<GetGendersRes>('getGenderOptions')));
  }
}

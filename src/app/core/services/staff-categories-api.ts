import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import { StaffCategoryOptionsResponse } from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({ providedIn: 'root' })
export class StaffCategoriesAPI extends BaseService {
  readonly #http = inject(HttpClient);

  getOptions(): Observable<StaffCategoryOptionsResponse> {
    return this.#http
      .get<StaffCategoryOptionsResponse>(`${environment.apiUrl}/Staff/Category/options`)
      .pipe(catchError(this.handleError<StaffCategoryOptionsResponse>('getStaffCategoryOptions')));
  }
}

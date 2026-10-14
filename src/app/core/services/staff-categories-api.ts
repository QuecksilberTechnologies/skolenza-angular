import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  ApiDataResponse,
  HostStaffCategory,
  SaveHostStaffCategory,
  StaffCategoryOptionsResponse,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({ providedIn: 'root' })
export class StaffCategoriesAPI extends BaseService {
  readonly #http = inject(HttpClient);

  getOptions(): Observable<StaffCategoryOptionsResponse> {
    return this.#http
      .get<StaffCategoryOptionsResponse>(`${environment.apiUrl}/Staff/Category/options`)
      .pipe(catchError(this.handleError<StaffCategoryOptionsResponse>('getStaffCategoryOptions')));
  }

  getHostCatalogue(): Observable<ApiDataResponse<HostStaffCategory[]>> {
    return this.#http
      .get<ApiDataResponse<HostStaffCategory[]>>(`${environment.apiUrl}/Staff/Category/host`)
      .pipe(
        catchError(
          this.handleError<ApiDataResponse<HostStaffCategory[]>>('getHostStaffCategories'),
        ),
      );
  }

  saveHostCategory(value: SaveHostStaffCategory): Observable<ApiDataResponse<HostStaffCategory>> {
    const request = value.id
      ? this.#http.put<ApiDataResponse<HostStaffCategory>>(
          `${environment.apiUrl}/Staff/Category/host/${value.id}`,
          value,
        )
      : this.#http.post<ApiDataResponse<HostStaffCategory>>(
          `${environment.apiUrl}/Staff/Category/host`,
          value,
        );
    return request.pipe(
      catchError(this.handleError<ApiDataResponse<HostStaffCategory>>('saveHostStaffCategory')),
    );
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  ApiDataResponse,
  InstitutionStaffCategory,
  PagedDataResponse,
  PageRequest,
  SaveInstitutionStaffCategory,
  SaveStaffPositionMaster,
  SaveStaffProfessionalMaster,
  StaffPositionMaster,
  StaffProfessionalMaster,
  StaffProfessionalMasterType,
  StaffProfessionalProfile,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({ providedIn: 'root' })
export class StaffProfessionalStructureApi extends BaseService {
  readonly #url = `${environment.apiUrl}/Staff/professional-structure`;
  readonly #http = inject(HttpClient);

  getMasters(
    type: StaffProfessionalMasterType,
    page: PageRequest,
    activeOnly = true,
  ): Observable<PagedDataResponse<StaffProfessionalMaster>> {
    return this.#getPage<StaffProfessionalMaster>(
      `masters/${type}`,
      page,
      { activeOnly },
      'getStaffProfessionalMasters',
    );
  }

  getCategories(
    page: PageRequest,
    activeOnly = true,
  ): Observable<PagedDataResponse<InstitutionStaffCategory>> {
    return this.#getPage<InstitutionStaffCategory>(
      'categories',
      page,
      { activeOnly },
      'getInstitutionStaffCategories',
    );
  }

  saveCategory(
    value: SaveInstitutionStaffCategory,
  ): Observable<ApiDataResponse<InstitutionStaffCategory>> {
    const request = value.id
      ? this.#http.put<ApiDataResponse<InstitutionStaffCategory>>(
          `${this.#url}/categories/${value.id}`,
          value,
        )
      : this.#http.post<ApiDataResponse<InstitutionStaffCategory>>(
          `${this.#url}/categories`,
          value,
        );
    return request.pipe(
      catchError(
        this.handleError<ApiDataResponse<InstitutionStaffCategory>>('saveInstitutionStaffCategory'),
      ),
    );
  }

  setCategoryJobFamilies(
    categoryId: number,
    staffJobFamilyMasterIds: number[],
  ): Observable<ApiDataResponse<boolean>> {
    return this.#http
      .put<ApiDataResponse<boolean>>(`${this.#url}/categories/${categoryId}/job-families`, {
        institutionStaffCategoryMasterId: categoryId,
        staffJobFamilyMasterIds,
      })
      .pipe(catchError(this.handleError<ApiDataResponse<boolean>>('setStaffCategoryJobFamilies')));
  }

  setCategoryActive(categoryId: number, isActive: boolean): Observable<ApiDataResponse<boolean>> {
    return this.#http
      .put<ApiDataResponse<boolean>>(`${this.#url}/categories/${categoryId}/active/${isActive}`, {})
      .pipe(
        catchError(this.handleError<ApiDataResponse<boolean>>('setInstitutionStaffCategoryActive')),
      );
  }

  getPositions(
    page: PageRequest,
    institutionStaffCategoryMasterId?: number,
    activeOnly = true,
  ): Observable<PagedDataResponse<StaffPositionMaster>> {
    return this.#getPage<StaffPositionMaster>(
      'positions',
      page,
      {
        activeOnly,
        institutionStaffCategoryMasterId: institutionStaffCategoryMasterId || undefined,
      },
      'getStaffPositions',
    );
  }

  getProfile(staffMemberId: string): Observable<ApiDataResponse<StaffProfessionalProfile | null>> {
    return this.#http
      .get<ApiDataResponse<StaffProfessionalProfile | null>>(`${this.#url}/staff/${staffMemberId}`)
      .pipe(
        catchError(
          this.handleError<ApiDataResponse<StaffProfessionalProfile | null>>(
            'getStaffProfessionalProfile',
          ),
        ),
      );
  }

  verifyCapability(
    assignmentId: number,
    isApproved: boolean,
    remark?: string,
  ): Observable<ApiDataResponse<boolean>> {
    return this.#http
      .put<ApiDataResponse<boolean>>(`${this.#url}/capability-verification/${assignmentId}`, {
        assignmentId,
        isApproved,
        remark,
      })
      .pipe(catchError(this.handleError<ApiDataResponse<boolean>>('verifyStaffCapability')));
  }

  saveMaster(
    type: StaffProfessionalMasterType,
    value: SaveStaffProfessionalMaster,
  ): Observable<ApiDataResponse<StaffProfessionalMaster>> {
    const request = value.id
      ? this.#http.put<ApiDataResponse<StaffProfessionalMaster>>(
          `${this.#url}/masters/${type}/${value.id}`,
          value,
        )
      : this.#http.post<ApiDataResponse<StaffProfessionalMaster>>(
          `${this.#url}/masters/${type}`,
          value,
        );
    return request.pipe(
      catchError(
        this.handleError<ApiDataResponse<StaffProfessionalMaster>>('saveStaffProfessionalMaster'),
      ),
    );
  }

  deleteMaster(
    type: StaffProfessionalMasterType,
    id: number,
  ): Observable<ApiDataResponse<boolean>> {
    return this.#http
      .delete<ApiDataResponse<boolean>>(`${this.#url}/masters/${type}/${id}`)
      .pipe(
        catchError(this.handleError<ApiDataResponse<boolean>>('deleteStaffProfessionalMaster')),
      );
  }

  savePosition(value: SaveStaffPositionMaster): Observable<ApiDataResponse<StaffPositionMaster>> {
    const request = value.id
      ? this.#http.put<ApiDataResponse<StaffPositionMaster>>(
          `${this.#url}/positions/${value.id}`,
          value,
        )
      : this.#http.post<ApiDataResponse<StaffPositionMaster>>(`${this.#url}/positions`, value);
    return request.pipe(
      catchError(this.handleError<ApiDataResponse<StaffPositionMaster>>('saveStaffPosition')),
    );
  }

  deletePosition(id: number): Observable<ApiDataResponse<boolean>> {
    return this.#http
      .delete<ApiDataResponse<boolean>>(`${this.#url}/positions/${id}`)
      .pipe(catchError(this.handleError<ApiDataResponse<boolean>>('deleteStaffPosition')));
  }

  #getPage<T>(
    path: string,
    page: PageRequest,
    filters: object,
    operation: string,
  ): Observable<PagedDataResponse<T>> {
    return this.#http
      .get<PagedDataResponse<T>>(`${this.#url}/${path}`, {
        params: this.makePageParams(page, filters),
      })
      .pipe(catchError(this.handleError<PagedDataResponse<T>>(operation)));
  }
}

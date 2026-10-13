import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  ApiDataResponse,
  InstitutionStaffCategory,
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
    activeOnly = true,
  ): Observable<ApiDataResponse<StaffProfessionalMaster[]>> {
    return this.#http
      .get<ApiDataResponse<StaffProfessionalMaster[]>>(`${this.#url}/masters/${type}`, {
        params: new HttpParams().set('activeOnly', activeOnly),
      })
      .pipe(
        catchError(
          this.handleError<ApiDataResponse<StaffProfessionalMaster[]>>(
            'getStaffProfessionalMasters',
          ),
        ),
      );
  }

  getCategories(activeOnly = true): Observable<ApiDataResponse<InstitutionStaffCategory[]>> {
    return this.#http
      .get<ApiDataResponse<InstitutionStaffCategory[]>>(`${this.#url}/categories`, {
        params: new HttpParams().set('activeOnly', activeOnly),
      })
      .pipe(
        catchError(
          this.handleError<ApiDataResponse<InstitutionStaffCategory[]>>(
            'getInstitutionStaffCategories',
          ),
        ),
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
    institutionStaffCategoryMasterId?: number,
    activeOnly = true,
  ): Observable<ApiDataResponse<StaffPositionMaster[]>> {
    let params = new HttpParams().set('activeOnly', activeOnly);
    if (institutionStaffCategoryMasterId)
      params = params.set('institutionStaffCategoryMasterId', institutionStaffCategoryMasterId);
    return this.#http
      .get<ApiDataResponse<StaffPositionMaster[]>>(`${this.#url}/positions`, {
        params,
      })
      .pipe(
        catchError(this.handleError<ApiDataResponse<StaffPositionMaster[]>>('getStaffPositions')),
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
}

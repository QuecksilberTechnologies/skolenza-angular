import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  AcademicMaster,
  AcademicMasterType,
  ApiDataResponse,
  ClassTeacherAssignment,
  SaveAcademicMaster,
  SaveClassTeacherAssignment,
  SaveTeachingAssignment,
  StaffAcademicProfile,
  StaffTeachingAssignment,
  TeachingAssignmentTypeOption,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({ providedIn: 'root' })
export class StaffAcademicStructureApi extends BaseService {
  readonly #url = `${environment.apiUrl}/Staff/academic-structure`;
  readonly #http = inject(HttpClient);

  getTeachingAssignmentTypes(): Observable<ApiDataResponse<TeachingAssignmentTypeOption[]>> {
    return this.#http.get<ApiDataResponse<TeachingAssignmentTypeOption[]>>(`${this.#url}/teaching-assignment-types`)
      .pipe(catchError(this.handleError<ApiDataResponse<TeachingAssignmentTypeOption[]>>('getTeachingAssignmentTypes')));
  }

  getMasters(type: AcademicMasterType, activeOnly = true): Observable<ApiDataResponse<AcademicMaster[]>> {
    return this.#http.get<ApiDataResponse<AcademicMaster[]>>(`${this.#url}/masters/${type}`, {
      params: new HttpParams().set('activeOnly', activeOnly),
    }).pipe(catchError(this.handleError<ApiDataResponse<AcademicMaster[]>>('getAcademicMasters')));
  }

  saveMaster(type: AcademicMasterType, value: SaveAcademicMaster): Observable<ApiDataResponse<AcademicMaster>> {
    const request = value.id
      ? this.#http.put<ApiDataResponse<AcademicMaster>>(`${this.#url}/masters/${type}/${value.id}`, value)
      : this.#http.post<ApiDataResponse<AcademicMaster>>(`${this.#url}/masters/${type}`, value);
    return request.pipe(catchError(this.handleError<ApiDataResponse<AcademicMaster>>('saveAcademicMaster')));
  }

  deleteMaster(type: AcademicMasterType, id: number): Observable<ApiDataResponse<boolean>> {
    return this.#http.delete<ApiDataResponse<boolean>>(`${this.#url}/masters/${type}/${id}`)
      .pipe(catchError(this.handleError<ApiDataResponse<boolean>>('deleteAcademicMaster')));
  }

  getStaffProfile(staffMemberId: string): Observable<ApiDataResponse<StaffAcademicProfile>> {
    return this.#http.get<ApiDataResponse<StaffAcademicProfile>>(`${this.#url}/staff/${staffMemberId}`)
      .pipe(catchError(this.handleError<ApiDataResponse<StaffAcademicProfile>>('getStaffAcademicProfile')));
  }

  saveTeachingAssignment(value: SaveTeachingAssignment): Observable<ApiDataResponse<StaffTeachingAssignment>> {
    const request = value.id
      ? this.#http.put<ApiDataResponse<StaffTeachingAssignment>>(`${this.#url}/teaching-assignments/${value.id}`, value)
      : this.#http.post<ApiDataResponse<StaffTeachingAssignment>>(`${this.#url}/teaching-assignments`, value);
    return request.pipe(catchError(this.handleError<ApiDataResponse<StaffTeachingAssignment>>('saveTeachingAssignment')));
  }

  saveClassTeacherAssignment(value: SaveClassTeacherAssignment): Observable<ApiDataResponse<ClassTeacherAssignment>> {
    const request = value.id
      ? this.#http.put<ApiDataResponse<ClassTeacherAssignment>>(`${this.#url}/class-teacher-assignments/${value.id}`, value)
      : this.#http.post<ApiDataResponse<ClassTeacherAssignment>>(`${this.#url}/class-teacher-assignments`, value);
    return request.pipe(catchError(this.handleError<ApiDataResponse<ClassTeacherAssignment>>('saveClassTeacherAssignment')));
  }

  deleteTeachingAssignment(id: number): Observable<ApiDataResponse<boolean>> {
    return this.#http.delete<ApiDataResponse<boolean>>(`${this.#url}/teaching-assignments/${id}`)
      .pipe(catchError(this.handleError<ApiDataResponse<boolean>>('deleteTeachingAssignment')));
  }

  deleteClassTeacherAssignment(id: number): Observable<ApiDataResponse<boolean>> {
    return this.#http.delete<ApiDataResponse<boolean>>(`${this.#url}/class-teacher-assignments/${id}`)
      .pipe(catchError(this.handleError<ApiDataResponse<boolean>>('deleteClassTeacherAssignment')));
  }
}

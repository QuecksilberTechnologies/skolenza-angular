import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  DeleteStaffMemberEducationReq,
  GetStaffMemberEducationReq,
  GetStaffMemberEducationRes,
  IStaffMemberEducationInfo,
  ScoreType,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class StaffMemberEducationAPI extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Staff/Education`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #staffMemberEducations = signal<IStaffMemberEducationInfo[]>([]);
  readonly #completionPercentage = signal<number>(0);
  readonly #scoreTypes = signal<ScoreType[]>([
    { name: 'Percentage', value: '1' },
    { name: 'CGPA', value: '2' },
  ]);
  readonly #isSaving = signal<boolean>(false);

  // Public readonly signals for components
  readonly staffMemberEducations = this.#staffMemberEducations.asReadonly();
  readonly completionPercentage = this.#completionPercentage.asReadonly();
  readonly scoreTypes = this.#scoreTypes.asReadonly();
  readonly isSaving = this.#isSaving.asReadonly();

  constructor() {
    super();
  }

  setIsSaving(value: boolean) {
    this.#isSaving.set(value);
  }

  setStaffMemberEducations(value: IStaffMemberEducationInfo[]) {
    this.#staffMemberEducations.set(value);
  }

  setCompletionPercentage(value: number) {
    this.#completionPercentage.set(value);
  }

  setScoreTypes(value: ScoreType[]) {
    this.#scoreTypes.set(value);
  }

  removeEducationSignal(id: number) {
    const updatedEducations = this.#staffMemberEducations().filter((education) => education.id !== id);
    this.setStaffMemberEducations(updatedEducations);
  }

  toggleVerifySignal(status: boolean, id: number) {
    const staffMemberEducations = [...this.#staffMemberEducations()];
    const index = staffMemberEducations.findIndex((education) => education.id === id);
    if (index > -1) {
      staffMemberEducations[index].isInfoVerified = status;
      this.setStaffMemberEducations(staffMemberEducations);
    }
  }

  toggleEditSignal(status: boolean) {
    const staffMemberEducations = [...this.#staffMemberEducations()];
    const updatedEducations = staffMemberEducations.map((e) => ({ ...e, isEditAllowed: status }));
    this.setStaffMemberEducations(updatedEducations);
  }

  // Education CRUD
  createStaffMemberEducation(body: FormData): Observable<GetStaffMemberEducationRes> {
    return this.#http
      .post<GetStaffMemberEducationRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<GetStaffMemberEducationRes>('createStaffMemberEducation')));
  }

  getStaffMemberEducations(req: GetStaffMemberEducationReq): Observable<GetStaffMemberEducationRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffMemberEducationRes>(`${this.#apiUrl}/get`, { params })
      .pipe(catchError(this.handleError<GetStaffMemberEducationRes>('getStaffMemberEducations')));
  }

  updateStaffMemberEducation(body: FormData): Observable<GetStaffMemberEducationRes> {
    return this.#http
      .post<GetStaffMemberEducationRes>(`${this.#apiUrl}/update-education`, body)
      .pipe(catchError(this.handleError<GetStaffMemberEducationRes>('updateStaffMemberEducation')));
  }

  deleteStaffMemberEducation(req: DeleteStaffMemberEducationReq): Observable<GetStaffMemberEducationRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<GetStaffMemberEducationRes>(`${this.#apiUrl}/delete`, { params })
      .pipe(catchError(this.handleError<GetStaffMemberEducationRes>('deleteStaffMemberEducation')));
  }
}


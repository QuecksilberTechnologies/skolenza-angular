import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  DeleteStaffMemberExperienceReq,
  GetStaffMemberExperienceReq,
  GetStaffMemberExperienceRes,
  IStaffMemberExperienceInfo,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class StaffMemberExperienceAPI extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Staff/Experience`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #staffMemberExperienceInfo = signal<IStaffMemberExperienceInfo[]>([]);
  readonly #isSaving = signal(false);
  readonly #isRemovingFile = signal(false);

  // Public readonly signals for components
  readonly staffMemberExperienceInfo = this.#staffMemberExperienceInfo.asReadonly();
  readonly isSaving = this.#isSaving.asReadonly();
  readonly isRemovingFile = this.#isRemovingFile.asReadonly();

  constructor() {
    super();
  }

  setIsSaving(value: boolean) {
    this.#isSaving.set(value);
  }

  setIsRemovingFile(value: boolean) {
    this.#isRemovingFile.set(value);
  }

  setStaffMemberExperienceInfo(data: IStaffMemberExperienceInfo[]) {
    this.#staffMemberExperienceInfo.set(data);
  }

  updateStaffMemberExperienceInfo(key: string, value: string) {
    this.#staffMemberExperienceInfo.update((current) => {
      if (!current) return current;
      return { ...current, [key]: value };
    });
  }

  toggleVerifySignal(status: boolean, id: number) {
    const staffMemberExperiences = [...this.#staffMemberExperienceInfo()];
    const index = staffMemberExperiences.findIndex((x) => x.id === id);
    if (index > -1) {
      staffMemberExperiences[index].isInfoVerified = status;
      this.setStaffMemberExperienceInfo(staffMemberExperiences);
    }
  }

  toggleEditSignal(status: boolean, id: number) {
    const staffMemberExperiences = [...this.#staffMemberExperienceInfo()];
    const index = staffMemberExperiences.findIndex((x) => x.id === id);
    if (index > -1) {
      staffMemberExperiences[index].isEditAllowed = status;
      this.setStaffMemberExperienceInfo(staffMemberExperiences);
    }
  }

  removeExperienceSignal(id: number) {
    const updatedExperiences = this.#staffMemberExperienceInfo().filter((exp) => exp.id !== id);
    this.setStaffMemberExperienceInfo(updatedExperiences);
  }

  removeExperienceDocSignal(id: number, docId: number) {
    const experienceIndex = this.#staffMemberExperienceInfo().findIndex((exp) => exp.id === id);
    if (experienceIndex > -1) {
      const updatedDocuments = this.#staffMemberExperienceInfo()[experienceIndex].documents.filter(
        (doc) => doc.id !== docId,
      );
      const updatedExperience = {
        ...this.#staffMemberExperienceInfo()[experienceIndex],
        documents: updatedDocuments,
      };
      const updatedExperiences = [...this.#staffMemberExperienceInfo()];
      updatedExperiences[experienceIndex] = updatedExperience;
      this.setStaffMemberExperienceInfo(updatedExperiences);
    }
  }

  // API Methods
  getStaffMemberExperience(req: GetStaffMemberExperienceReq): Observable<GetStaffMemberExperienceRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffMemberExperienceRes>(`${this.#apiUrl}/get`, { params })
      .pipe(catchError(this.handleError<GetStaffMemberExperienceRes>('getStaffMemberExperience')));
  }

  createStaffMemberExperience(body: FormData): Observable<GetStaffMemberExperienceRes> {
    return this.#http
      .post<GetStaffMemberExperienceRes>(`${this.#apiUrl}/create`, body)
      .pipe(catchError(this.handleError<GetStaffMemberExperienceRes>('createStaffMemberExperience')));
  }

  updateStaffMemberExperience(body: FormData): Observable<GetStaffMemberExperienceRes> {
    return this.#http
      .post<GetStaffMemberExperienceRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<GetStaffMemberExperienceRes>('updateStaffMemberExperience')));
  }

  deleteStaffMemberExperience(req: DeleteStaffMemberExperienceReq): Observable<GetStaffMemberExperienceRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .delete<GetStaffMemberExperienceRes>(`${this.#apiUrl}/delete`, { params })
      .pipe(catchError(this.handleError<GetStaffMemberExperienceRes>('deleteStaffMemberExperience')));
  }

  deleteStaffMemberExperienceDoc(id: number): Observable<GetStaffMemberExperienceRes> {
    return this.#http
      .delete<GetStaffMemberExperienceRes>(`${this.#apiUrl}/delete-doc`, { params: { id } })
      .pipe(catchError(this.handleError<GetStaffMemberExperienceRes>('deleteStaffMemberExperienceDoc')));
  }
}


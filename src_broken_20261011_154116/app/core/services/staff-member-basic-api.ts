import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, tap } from 'rxjs';

import { environment } from '@env/environment';
import {
  GetStaffMemberBasicReq,
  GetStaffMemberBasicRes,
  GetProfileImageReq,
  GetProfileImageRes,
  GetProfileSummaryReq,
  GetProfileSummaryRes,
  IStaffMemberBasicInfo,
  IGender,
  IProfileSummary,
  ProfileImage,
  UpdateStaffMemberBasicReq,
  UpdateStaffMemberBasicRes,
  UpdateStaffMemberOfficialReq,
  UpdateStaffMemberRes,
} from '@shared/interfaces';

import { BaseService } from './base-service';

@Injectable({
  providedIn: 'root',
})
export class StaffMemberBasicAPI extends BaseService {
  readonly #apiUrl = `${environment.apiUrl}/Staff`;
  readonly #http = inject(HttpClient);

  // Private signals
  readonly #staffMemberBasics = signal<IStaffMemberBasicInfo[]>([]);
  readonly #completionPercentage = signal<number>(0);
  readonly #profileImage = signal<ProfileImage | null>(null);
  readonly #profileSummary = signal<IProfileSummary | null>(null);
  readonly #isProfilePicLoading = signal(false);
  readonly #isProfileSummaryLoading = signal(false);

  // Public readonly signals for components
  readonly staffMemberBasics = this.#staffMemberBasics.asReadonly();
  readonly completionPercentage = this.#completionPercentage.asReadonly();
  readonly profileImage = this.#profileImage.asReadonly();
  readonly profileSummary = this.#profileSummary.asReadonly();
  readonly isProfilePicLoading = this.#isProfilePicLoading.asReadonly();
  readonly isProfileSummaryLoading = this.#isProfileSummaryLoading.asReadonly();

  constructor() {
    super();
  }

  setStaffMemberBasics(data: IStaffMemberBasicInfo[]) {
    this.#staffMemberBasics.set(data);
  }

  setCompletionPercentage(value: number) {
    this.#completionPercentage.set(value);
  }

  setProfileImage(value: ProfileImage | null) {
    this.#profileImage.set(value);
  }

  setIsProfilePicLoading(value: boolean) {
    this.#isProfilePicLoading.set(value);
  }

  setProfileSummary(value: IProfileSummary | null) {
    this.#profileSummary.set(value);
  }

  setIsProfileSummaryLoading(value: boolean) {
    this.#isProfileSummaryLoading.set(value);
  }

  updateStaffMemberBasicSignal(value: UpdateStaffMemberBasicReq, genders: IGender[]) {
    const staffMemberBasics = [...this.#staffMemberBasics()];
    const index = staffMemberBasics.findIndex((x) => x.id === value.staffMemberId);
    if (index > -1) {
      staffMemberBasics[index] = {
        ...staffMemberBasics[index],
        firstName: value.firstName,
        middleName: value.middleName,
        lastName: value.lastName,
        dateOfBirth: value.dateOfBirth,
        genderId: value.genderId,
        genderName: genders.find((g) => g.id === +value.genderId)?.genderName ?? '',
      };
      this.setStaffMemberBasics(staffMemberBasics);
    }
  }

  updateStaffMemberOfficialSignal(value: UpdateStaffMemberOfficialReq, genders: IGender[]) {
    const staffMemberBasics = [...this.#staffMemberBasics()];
    const index = staffMemberBasics.findIndex((x) => x.id === value.staffMemberId);
    if (index > -1) {
      staffMemberBasics[index] = {
        ...staffMemberBasics[index],
        dateOfBirth: value.dateOfBirth,
        dateOfOnBoarding: value.dateOfOnBoarding,
        dateOfExit: value.dateOfExit,
        staffEmploymentTypeId: value.staffEmploymentTypeId || 0,
        genderId: value.genderId,
        genderName: genders.find((g) => g.id === +value.genderId)?.genderName ?? '',
        hasPermanent: value.hasPermanent,
        isEditAllowed: value.isEditAllowed,
        isInfoVerified: value.isInfoVerified,
        isActive: value.isActive,
      };
      this.setStaffMemberBasics(staffMemberBasics);
    }
  }

  toggleVerifySignal(status: boolean, id: string) {
    const staffMemberBasics = [...this.#staffMemberBasics()];
    const index = staffMemberBasics.findIndex((x) => x.id === id);
    if (index > -1) {
      staffMemberBasics[index].isInfoVerified = status;
      this.setStaffMemberBasics(staffMemberBasics);
    }
  }

  toggleEditSignal(status: boolean, id: string) {
    const staffMemberBasics = [...this.#staffMemberBasics()];
    const index = staffMemberBasics.findIndex((x) => x.id === id);
    if (index > -1) {
      staffMemberBasics[index].isEditAllowed = status;
      this.setStaffMemberBasics(staffMemberBasics);
    }
  }

  // Basic info CRUD
  getStaffMemberBasics(req: GetStaffMemberBasicReq): Observable<GetStaffMemberBasicRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetStaffMemberBasicRes>(`${this.#apiUrl}/get`, { params })
      .pipe(catchError(this.handleError<GetStaffMemberBasicRes>('getStaffMemberBasics')));
  }

  updateStaffMemberBasics(body: UpdateStaffMemberBasicReq): Observable<UpdateStaffMemberBasicRes> {
    return this.#http
      .post<UpdateStaffMemberBasicRes>(`${this.#apiUrl}/update`, body)
      .pipe(catchError(this.handleError<UpdateStaffMemberBasicRes>('updateStaffMemberBasics')));
  }

  updateStaffMemberOfficialBasics(
    body: UpdateStaffMemberOfficialReq,
  ): Observable<UpdateStaffMemberBasicRes> {
    return this.#http
      .post<UpdateStaffMemberBasicRes>(`${this.#apiUrl}/official/update`, body)
      .pipe(catchError(this.handleError<UpdateStaffMemberBasicRes>('updateStaffMemberOfficialBasics')));
  }

  fetchProfileSummary(staffMemberId: string): Observable<GetProfileSummaryRes> {
    const params = this.makeHttpParams({ StaffMemberId: staffMemberId, IsActive: true });
    this.setIsProfileSummaryLoading(true);
    return this.#http
      .get<GetProfileSummaryRes>(`${this.#apiUrl}/get-profile-summary`, { params })
      .pipe(
        tap((res) => {
          if (res.isSucceeded) {
            this.setProfileSummary(res.data);
          }
          this.setIsProfileSummaryLoading(false);
        }),
        catchError(this.handleError<GetProfileSummaryRes>('fetchProfileSummary')),
      );
  }

  // Profile CURD
  getProfileImages(req: GetProfileImageReq): Observable<GetProfileImageRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetProfileImageRes>(`${this.#apiUrl}/Image/get`, { params })
      .pipe(catchError(this.handleError<GetProfileImageRes>('getProfileImage')));
  }

  updateProfileImages(body: FormData): Observable<UpdateStaffMemberRes> {
    return this.#http
      .post<UpdateStaffMemberRes>(`${this.#apiUrl}/profile/pic/update`, body)
      .pipe(catchError(this.handleError<UpdateStaffMemberRes>('updateProfileImages')));
  }

  getProfileSummary(req: GetProfileSummaryReq): Observable<GetProfileSummaryRes> {
    const params = this.makeHttpParams(req);
    return this.#http
      .get<GetProfileSummaryRes>(`${this.#apiUrl}/get-profile-summary`, { params })
      .pipe(catchError(this.handleError<GetProfileSummaryRes>('getProfileSummary')));
  }
}


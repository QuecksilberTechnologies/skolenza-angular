import { FormControl } from '@angular/forms';

export interface GetStaffMemberEducationReq {
  StaffMemberId: string;
  Degree?: string;
  InstituteName?: string;
  Remark?: string;
  StartDate?: string;
  EndDate?: string;
  ScoreValue?: string;
  ScoreType?: string;
  EducationGap?: boolean;
  IsInfoVerified?: boolean;
  HasEducationDocUploded?: boolean;
  IsEditAllowed?: boolean;
  IsActive?: boolean;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
  UserStaffMemberId: string;
}

export interface GetStaffMemberEducationRes {
  isSucceeded: boolean;
  message: string;
  errors: string[];
  errorCode?: string | null;
  data: IStaffMemberEducationInfo[];
  pageNumber?: number | null;
  pageSize?: number | null;
  totalRecords?: number | null;
  totalPages?: number | null;
  hasAllDocUploaded: boolean;
  isPrimaryMarked?: boolean | null;
  completionPercentage: number;
}

export interface IStaffMemberEducationInfo {
  id: number;
  staffMemberId: string;
  degree?: string;
  instituteName?: string;
  remark?: string;
  startDate?: string;
  endDate?: string;
  scoreValue?: string;
  gradeDivision?: string;
  scoreType?: string;
  filePath?: string;
  fileType: number;
  fileName?: string;
  educationGap?: boolean;
  isEditAllowed?: boolean;
  isInfoVerified?: boolean;
  gapYears: number;
  reasonOfEducationGap?: string;
  infoVerifiedById?: string;
  hasEducationDocUploded: boolean;
  isActive?: boolean;
  completionPercentage: number;
}

export interface DeleteStaffMemberEducationReq {
  Id: number;
}

export interface EducationForm {
  degree: FormControl<string>;
  instituteName: FormControl<string>;
  remark: FormControl<string>;
  startDate: FormControl<string | Date>; // ISO string
  endDate: FormControl<string | Date>; // ISO string
  scoreType: FormControl<string>; // 1:Percentage, 2:CGPA
  scoreValue: FormControl<string>;
  gradeDivision: FormControl<string>;
  isEducationGapBeforeDegree: FormControl<boolean>;
  gapYears: FormControl<number | null>;
  reasonOfEducationGap: FormControl<string>;
  educationDocument?: FormControl<string>;
}

export interface ScoreType {
  name: string;
  value: string;
}

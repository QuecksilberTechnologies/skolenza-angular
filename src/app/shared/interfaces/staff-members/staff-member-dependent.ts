import { FormControl } from '@angular/forms';

export interface GetStaffMemberDependentReq {
  StaffMemberId: string;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
  UserStaffMemberId: string;
}

export interface GetStaffMemberDependentRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: StaffMemberDependent[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  completionPercentage: number;
}

export interface StaffMemberDependent {
  id: number;
  staffMemberId: string;
  dependentName: string;
  relation: number;
  relationType: string;
  dateOfBirth: string;
  isCoveredInPolicy: boolean;
  isMarried: boolean;
  remark: string;
  description: string;
  isActive: boolean;
  hasProofUploaded: boolean;
  hasUploadedAll: boolean;
  completionPercentage: number;
  filePath: string;
  fileName: string;
  fileType: string;
  infoVerifiedById: string;
  isInfoVerified: boolean;
  isEditAllowed: boolean;
  infoVerifiedDateTime: string;
}

export interface GetStaffMemberDependentDetailRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: {
    totalDependents: number;
    totalChilds: number;
    totalSpouses: number;
    totalParents: number;
    totalInLaws: number;
    dependents: StaffMemberDependent[];
  };
}

export interface DeleteStaffMemberDependentReq {
  Id: number;
}

export interface DependentForm {
  dependentName: FormControl<string>;
  relation: FormControl<number | null>;
  dateOfBirth: FormControl<string | Date>; // ISO string
  isCoveredInPolicy: FormControl<boolean>;
  isMarried: FormControl<boolean>;
  remark: FormControl<string>;
  description: FormControl<string>;
  proofFile: FormControl<string>;
}

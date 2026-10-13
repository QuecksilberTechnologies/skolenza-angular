import { FormControl } from '@angular/forms';

// StaffMember Basic
export interface GetStaffMemberBasicReq {
  UserStaffMemberId: string;
  StaffMemberId?: string;
}

export interface GetStaffMemberBasicRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: IStaffMemberBasicInfo[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  completionPercentage: number;
}

export interface IStaffMemberBasicInfo {
  id: string;
  employementCode: string;
  lastName: string;
  middleName: string;
  firstName: string;
  genderId: number;
  designationName: string;
  departmentName: string;
  emergencyContactPerson: string;
  emergencyContactNumber: string;
  bloodGroup: string;
  mobileNumber: string;
  relation: number;
  countryId: number;
  countryCode: string;
  nationality: string;
  genderName: string;
  roleName: string;
  roleId: number;
  roleType: string;
  type: string;
  dateOfBirth: string;
  dateOfOnBoarding: string;
  dateOfExit: string;
  departmentId: number;
  designationId: number;
  staffEmploymentTypeId: number;
  institutionStaffCategoryMasterId: number;
  staffCategoryName?: string;
  professionalProfile?: import('./staff-professional-structure').StaffProfessionalProfile;
  officialEmail: string;
  hasPermanent: boolean;
  isActive: boolean;
  isEditAllowed: boolean;
  isInfoVerified: boolean;
  isMarried: boolean;
  completionPercentage: number;
  isVerifying: boolean; // NG
  isEditing: boolean; // NG
}

// Profile pic
export interface GetProfileImageReq {
  StaffMemberId?: string;
  IsActive: boolean;
}

export interface GetProfileImageRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: ProfileImage;
}

export interface ProfileImage {
  id: number;
  fileName: string;
  filePath: string;
  isActive: boolean;
  isPrimary: boolean;
  hasImageUploaded: boolean;
  completionPercentage: number;
  staffMemberId: string;
}

export interface UpdateStaffMemberBasicReq {
  userStaffMemberId: string;
  staffMemberId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  genderId: number;
  isMarried: boolean;
  mobileNumber: string;
  emergencyContactPerson: string;
  emergencyContactNumber: string;
  bloodGroup: string;
  relation: number;
  remark: string;
  description: string;
}

export interface UpdateStaffMemberBasicRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: IStaffMemberBasicInfo[];
}

export interface BasicForm {
  firstName: FormControl<string>;
  middleName: FormControl<string>;
  lastName: FormControl<string>;
  dateOfBirth: FormControl<Date>;
  dateOfOnBoarding: FormControl<Date>;
  dateOfExit: FormControl<Date>;
  genderId: FormControl<number | undefined>;
  countryId: FormControl<number | undefined>;
  departmentId: FormControl<number | undefined>;
  designationId: FormControl<number | undefined>;
  staffEmploymentTypeId: FormControl<number | undefined>;
  institutionStaffCategoryMasterId: FormControl<number | undefined>;
  staffJobFamilyMasterId: FormControl<number | undefined>;
  staffPositionMasterId: FormControl<number | undefined>;
  roleId: FormControl<number | undefined>;
  officialEmail: FormControl<string>;
  staffMemberDocumentId: FormControl<string>;
  hasPermanent: FormControl<boolean>;
  isEditAllowed: FormControl<boolean>;
  isInfoVerified: FormControl<boolean>;
  isActive: FormControl<boolean>;
  isMarried: FormControl<boolean>;
  mobileNumber: FormControl<string>;
  emergencyContactPerson: FormControl<string>;
  emergencyContactNumber: FormControl<string>;
  bloodGroup: FormControl<string>;
  relation: FormControl<number>;
}

// Admin &  HR
export interface UpdateStaffMemberOfficialReq {
  userStaffMemberId: string;
  staffMemberId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  description: string;
  designationId: number;
  isMarried: boolean;
  emergencyContactPerson: string;
  emergencyContactNumber: string;
  bloodGroup: string;
  mobileNumber: string;
  relation: number;
  countryId: number;
  departmentId: number;
  staffEmploymentTypeId: number;
  institutionStaffCategoryMasterId: number;
  staffPositionMasterId: number;
  genderId: number;
  dateOfBirth: string;
  dateOfOnBoarding: string;
  dateOfExit: string;
  hasPermanent: boolean;
  isEditAllowed: boolean;
  isInfoVerified: boolean;
  isActive: boolean;
  remark?: string;
}

export interface BloodGroup {
  id: number;
  code: string;
  label: string;
}

export interface Relation {
  id: number;
  code: string;
  label: string;
}

export interface GetProfileSummaryReq {
  StaffMemberId?: string;
  IsActive: boolean;
}

export interface GetProfileSummaryRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: IProfileSummary;
}

export interface IProfileSummary {
  staffMemberId: string;
  fullName: string;
  designation: number;
  designationType: string;
  department: number;
  departmentType: string;
  staffMemberCode: string;
  mobileNumber: string;
  offilcialEmail: string;
}

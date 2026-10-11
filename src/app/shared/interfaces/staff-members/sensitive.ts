import { FormControl } from '@angular/forms';

import { ApiEnvelope } from '../common/api-envelope';

export interface GetStaffMemberSensitiveReq {
  StaffMemberId?: string;
  CountryNationalityId: number;
}

export interface GetStaffMemberSensitiveRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: StaffMemberSensitive[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  completionPercentage: number;
  hasAllDocUploaded?: boolean | null;
}

export interface CreateStaffMemberSensitiveRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: StaffMemberSensitive[];
}

export interface DeleteStaffMemberIdentityReq {
  staffMemberIdentityId: number;
}

export type DeleteStaffMemberIdentityRes = ApiEnvelope<boolean>;

export interface IdentityForm {
  aadhaarNumber: FormControl<string>;
  panNumber: FormControl<string>;
  passportNumber: FormControl<string>;
  drivingLicenseNumber: FormControl<string>;
  hasEPFAccount: FormControl<boolean>;
  uanNumber: FormControl<string>;
  voterId: FormControl<string>;
  bloodGroup: FormControl<string>;
  maritalStatus: FormControl<string>;
  nationality: FormControl<string>;
  emergencyContactName: FormControl<string>;
  emergencyContactRelation: FormControl<string>;
  emergencyContactNumber: FormControl<string>;
}

/** One row of `GET /Staff/Sensitive/get` (`GetStaffMemberIdentityResponseDTO`). */
export interface StaffMemberSensitive {
  /** Null on catalogue rows that have nothing saved yet. */
  id: number | null;
  staffMemberId?: string | null;
  countryCode: string;
  countryName: string;
  identityCategoryName: string;
  identityCategoryDocumentId: number;
  documentCode: string;
  documentName: string;
  description: string | null;
  isMandatory: boolean;
  staffMemberIdentityId: number | null;
  identityValue?: string | null;
  isVerified?: boolean | null;
  isEditAllowed?: boolean | null;
  hasIdentityUploaded?: boolean | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive?: boolean | null;
}


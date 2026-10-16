import { FormControl } from '@angular/forms';

import { Relation } from './staffMember-basic';

export interface CreateStaffMemberContactReq {
  userStaffMemberId: string;
  staffMemberId: string;
  contactName: string;
  contactType: number;
  contactNumber: string;
  relation: number;
  alternateNumber: string;
  email: string;
  isPrimary: boolean;
  countryId: number;
  stateId: number;
  districtId: number;
  localityId: number;
  houseNo: string;
  landMark: string;
  street: string;
  address: string;
  remark: string;
  description: string;
}

export interface UpdateStaffMemberContactReq {
  userStaffMemberId: string;
  staffMemberId: string;
  id: number;
  contactName: string | null;
  relation: number | null;
  contactType: number | null;
  contactNumber: string;
  alternateNumber: string;
  email: string;
  isPrimary: boolean;
  countryId: number;
  stateId: number;
  districtId: number;
  localityId: number;
  houseNo: string;
  landMark: string;
  street: string;
  address: string;
  description: string;
}

export interface GetStaffMemberContactReq {
  StaffMemberId: string;
  UserStaffMemberId: string;
}

export interface GetStaffMemberContactRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: StaffMemberContact[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  completionPercentage: number;
}

export interface GetContactRelationOptionsRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: Relation[];
}

export interface StaffMemberContact {
  id: number;
  staffMemberId: string;
  contactName: string | null;
  relation: number | null;
  contactType: number | null;
  contactNumber: string | null;
  alternateNumber: string | null;
  email: string | null;
  isPrimary: boolean;
  countryName: string | null;
  stateName: string | null;
  districtName: string | null;
  localityName: string | null;
  countryId: number | null;
  stateId: number | null;
  districtId: number | null;
  localityId: number | null;
  houseNo: string | null;
  landMark: string | null;
  street: string | null;
  address: string | null;
  remark: string | null;
  isActive: boolean;
  isEditAllowed: boolean;
  isInfoVerified: boolean;
  infoVerifiedById: string;
  infoVerifiedDateTime: string;
  description: string | null;
  completionPercentage: number;
}

export interface DeleteStaffMemberContactReq {
  Id: number;
}

export enum ContactType {
  Rental = 1,
  Permanent = 2,
  Temporary = 3,
}

export interface ContactForm {
  contactName: FormControl<string>;
  contactType: FormControl<number | undefined>;
  relation: FormControl<number | undefined>;
  contactNumber: FormControl<string>;
  alternateNumber: FormControl<string>;
  email: FormControl<string>;
  countryId: FormControl<number | undefined>;
  stateId: FormControl<number | undefined>;
  districtId: FormControl<number | undefined>;
  localityId: FormControl<number | undefined>;
  houseNo: FormControl<string>;
  landMark: FormControl<string>;
  street: FormControl<string>;
  address: FormControl<string>;
  remark: FormControl<string>;
  description: FormControl<string>;
  isPrimary: FormControl<boolean>;
}

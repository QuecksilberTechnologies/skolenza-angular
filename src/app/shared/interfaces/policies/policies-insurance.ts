import { FormControl } from '@angular/forms';

export interface GetInsurancePolicyReq {
  UserStaffMemberId: string;
  PageNumber: number;
  PageSize: number;
  SortBy?: string | string[] | null | undefined;
  SortOrder: string;
  IsActive: boolean;
}

export interface GetInsurancePolicyRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InsurancePolicy[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface InsurancePolicy {
  insurancePolicyId: number;
  policyTypeId: number;
  policyTypeName: string;
  insurancePolicyName: string;
  insurancePolicyNumber: string;
  providerName: string;
  countryId: number;
  countryName: string;
  startDate: string;
  endDate: string;
  agentName: string;
  agentContactNumber: string;
  agentOfficeNumber: string;
  staffMemberAllowed: boolean;
  maxSpouseAllowed: number;
  maxChildAllowed: number;
  parentsAllowed: boolean;
  inLawsAllowed: boolean;
  isActive: boolean;
  isSoftDeleted: boolean;
  remark: string;
  description: string;
}

export interface UpsertInsurancePolicyReq {
  id?: number;
  policyTypeId: number;
  countryId: number;
  insurancePolicyName: string;
  insurancePolicyNumber: string;
  providerName: string;
  startDate: string;
  endDate: string;
  agentName: string;
  agentContactNumber: string;
  agentOfficeNumber: string;
  staffMemberAllowed: boolean;
  maxSpouseAllowed: number;
  maxChildAllowed: number;
  parentsAllowed: boolean;
  inLawsAllowed: boolean;
  isActive: boolean;
  remark: string;
  description: string;
}

export interface DeleteInsurancePolicyReq {
  InsuranceId: number;
}

export interface GetInsurancePolicyNamesReq {
  PolicyId: number; // Policy Type Id
  IsActive: boolean;
}

export interface GetInsurancePolicyNamesRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InsurancePolicyName[];
}

export interface InsurancePolicyName {
  insurancePolicyId: number;
  policyTypeId: number;
  insurancePolicyName: string;
}

export interface InsurancePolicyForm {
  policyTypeId: FormControl<number>;
  countryId: FormControl<number>;
  insurancePolicyName: FormControl<string>;
  insurancePolicyNumber: FormControl<string>;
  providerName: FormControl<string>;
  startDate: FormControl<string | Date>; // ISO string
  endDate: FormControl<string | Date>; // ISO string
  agentName: FormControl<string>;
  agentContactNumber: FormControl<string>;
  agentOfficeNumber: FormControl<string>;
  staffMemberAllowed: FormControl<boolean>;
  maxSpouseAllowed: FormControl<number>;
  maxChildAllowed: FormControl<number>;
  parentsAllowed: FormControl<boolean>;
  inLawsAllowed: FormControl<boolean>;
  isActive: FormControl<boolean>;
  remark: FormControl<string>;
  description: FormControl<string>;
}

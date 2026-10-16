import { FormControl } from '@angular/forms';

// GET
export interface GetPolicyTypeInsuranceMapReq {
  PolicyTypeId?: string;
  InsurancePolicyId?: string;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string | string[] | null | undefined;
  SortOrder?: string;
  UserStaffMemberId: string;
  IsActive: boolean;
}

export interface PolicyTypeInsuranceMapRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: IPolicyTypeInsuranceMap[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface IPolicyTypeInsuranceMap {
  id: number;
  policyTypeId: number;
  insurancePolicyId: number;
  insurancePolicyName: string;
  insurancePolicyNumber: string;
  providerName: string;
  policyName: string;
  isActive: boolean;
}

// CREATE & UPDATE
export interface UpsertPolicyTypeInsuranceMapReq {
  id?: number;
  insurancePolicyId: number;
  policyTypeId: number;
  isActive: boolean;
}

// DELETE
export interface DeletePolicyTypeInsuranceMapReq {
  Id: number;
}

export interface PolicyTypeInsuranceMapForm {
  policyTypeId: FormControl<number | undefined>;
  insurancePolicyId: FormControl<number | undefined>;
}

// Insurance Map Detail
export interface GetPolicyTypeInsuranceMapDetailReq {
  PolicyTypeId?: number;
  InsuranceTypeId?: number;
  IsActive: boolean;
}

export interface GetPolicyTypeInsuranceMapDetailRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: IPolicyTypeInsuranceMapDetail[];
}

export interface IPolicyTypeInsuranceMapDetail {
  id: number;
  policyTypeId: number;
  insuranceTypeId: number;
  policyName: string;
  insuranceTypeName: string;
  fileName: string;
  filePath: string;
  url: string;
  description: string;
  isActive: boolean;
}

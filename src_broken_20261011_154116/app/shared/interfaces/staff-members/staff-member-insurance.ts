import { FormControl } from '@angular/forms';

export interface GetEnrolledInsuranceReq {
  StaffMemberId: string;
}

export interface StaffMemberInsuranceData {
  staffMemberId: string;
  policies: StaffMemberInsurance[];
}

export interface GetStaffMemberInsuranceRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: StaffMemberInsuranceData;
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  completionPercentage: number;
}

export interface StaffMemberInsurance {
  id: number;
  staffMemberId: string;
  policyTypeId: number;
  policyTypeName: string;
  insurancePolicyId: number;
  insurancePolicyName: string;
  hasDependent: boolean;
  startDate: string;
  endDate: string;
  dependents: PolicyDependent[];
  isInfoVerified: boolean;
  isEditAllowed: boolean;
  completionPercentage: number;
}

export interface PolicyDependent {
  id: number;
  dependentId: number;
  relation: number; // can be enum if you have mapping
  isCovered: boolean;
}

export interface InsuranceEnrollForm {
  policyTypeId: FormControl<number | null>;
  insurancePolicyId: FormControl<number | null>;
  hasDependent: FormControl<boolean>;
  startDate: FormControl<string>;
  endDate: FormControl<string>;
}

export interface CreateStaffMemberInsuranceReq {
  staffMemberId: string;
  staffMemberInsuranceEnrollmentId?: number;
  policyTypeId: number;
  insurancePolicyId: number;
  hasDependent: boolean;
  startDate: string;
  endDate: string;
  dependents: Dependent[];
}

export interface Dependent {
  dependentId: number;
  relation: number;
  isCovered: boolean;
}

export interface DeleteStaffMemberInsuranceReq {
  staffMemberId?: string;
  staffMemberInsuranceMappingId: number;
}

export interface GetInsuranceDetailReq {
  StaffMemberId: string;
  PolicyId: number;
  IsActive: boolean;
}

export interface GetInsuranceDetailRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InsuranceDetail[];
}

export interface InsuranceDetail {
  insurancePolicyId: number;
  policyTypeId: number;
  insurancePolicyName: string;
  isStaffMemberConsumed: boolean;
  isDependentConsumed: boolean;
  consumedDependentCount: number;
}

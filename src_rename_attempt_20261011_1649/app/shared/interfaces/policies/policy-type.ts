import { FormControl } from '@angular/forms';

export interface GetPolicyTypesReq {
  PolicyName?: string;
  PolicyTypeEnumVal?: number;
  IsActive: boolean;
  HasDocumnet?: boolean;
  PageNumber: number;
  PageSize: number;
  SortBy?: string | string[] | null | undefined;
  SortOrder?: string;
  UserStaffMemberId: string;
}

export interface GetPolicyTypesRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: PolicyType[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface PolicyType {
  id: number;
  policyName: string;
  description: string;
  isActive: boolean;
  isStructured: boolean;
  policyTypeEnumVal: number;
  staffEmploymentTypeIds: number[];
  docDetails: DocDetail[];
}

export interface DocDetail {
  id: number;
  policyTypeId: number;
  documentTitle: string;
  fileName: string;
  filePath: string;
  isActive: boolean;
}

export enum PolicyTypeEnum {
  Insurance = 1,
  Leave = 2,
  Rental = 3,
  Other = 4,
}

export interface DeletePolicyTypeReq {
  PolicyId: number;
}

export interface GetPolicyTypeNamesReq {
  IsActive: boolean;
  /** Omitted when the caller wants every policy type — `makeHttpParams` drops undefined params. */
  PolicyTypeEnumVal?: number;
}

export interface GetPolicyTypeNamesRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: PolicyTypesName[];
}

export interface PolicyTypesName {
  id: number;
  policyName: string;
}

export interface GetPolicyTypeUnstructReq {
  PolicyTypeId: number;
  PolicyTypeEnumVal: number;
  IsActive: boolean;
}

export interface GetPolicyTypeUnstructRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: IPolicyTypeUnstructDetail[];
}

export interface IPolicyTypeUnstructDetail {
  id: number;
  institutionId: number;
  staffEmploymentTypeId: number;
  staffEmploymentTypeName: string;
  policyTypeId: number;
  policyTypeName: string;
  isActive: boolean;
  startDate: string;
}

export interface PolicyTypeForm {
  policyName: FormControl<string>;
  // policyTypeEnumVal: FormControl<number | null>;
  staffEmploymentTypeIds: FormControl<number[]>;
  description: FormControl<string>;
  document: FormControl<string>;
}

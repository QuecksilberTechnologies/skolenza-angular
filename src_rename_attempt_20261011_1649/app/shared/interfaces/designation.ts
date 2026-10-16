import { FormControl } from '@angular/forms';

export interface AddDesignationRequest {
  userStaffMemberId: string;
  departmentId: number;
  designationName: string;
  description: string;
  isActive: boolean;
  /** Drives the per-row spinner on the status toggle button. */
  isUpdatingStatus?: boolean;
}

export interface UpdateDesignationRequest {
  id: number;
  userStaffMemberId: string;
  departmentId: number;
  designationName: string;
  description: string;
  isActive: boolean;
}

export interface DeleteDesignationRequest {
  Id: number;
  UserStaffMemberId: string;
}

export interface GetDesignationsRequest {
  DepartmentId?: number;
  DesignationName?: string;
  IsActive?: boolean;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string | string[] | null | undefined;
  SortOrder?: string;
  UserStaffMemberId?: string;
  DesignationId?: number;
}

export interface GetDesignationOptionReq {
  UserStaffMemberId: string;
  DepartmentId?: number;
  IsActive: boolean;
}

export interface GetDesignationsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: IDesignation[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface IDesignation {
  id: number;
  departmentId: string;
  departmentName: string;
  designationName: string;
  description: string;
  isActive: boolean;
}

export interface DesignationForm {
  designationName: FormControl<string>;
  description: FormControl<string>;
  departmentId: FormControl<number | null>;
  isActive: FormControl<boolean>;
}

import { FormControl } from '@angular/forms';

export interface AddDepartmentRequest {
  userStaffMemberId: string;
  departmentName: string;
  description: string;
  isActive: boolean;
  remark?: string;
}

export interface UpdateDepartmentRequest {
  id: number;
  userStaffMemberId: string;
  departmentName: string;
  description: string;
  isActive: boolean;
  remark?: string;
}

export interface DeleteDepartmentRequest {
  Id?: number;
  UserStaffMemberId?: string;
}

export interface GetDepartmentsRequest {
  DepartmentName?: string;
  IsActive?: boolean;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string | string[] | null | undefined;
  SortOrder?: string;
  UserStaffMemberId?: string;
  Id?: string;
}

export interface GetDepartmentsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: Department[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface Department {
  id: number;
  departmentName: string;
  isActive?: boolean;
  description?: string;
  remark?: string;
  /** Drives the per-row spinner on the status toggle button. */
  isUpdatingStatus?: boolean;
}

export interface GetDepartmentsOptionsReq {
  UserStaffMemberId: string;
}

export interface GetDepartmentsOptionResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: Department[];
}

export interface DepartmentForm {
  departmentName: FormControl<string>;
  description: FormControl<string>;
  remark: FormControl<string>;
  isActive: FormControl<boolean>;
}

export interface IDepartmentFilter {
  departmentId?: number;
  status?: boolean | null;
}

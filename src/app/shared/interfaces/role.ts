import { FormControl } from '@angular/forms';

export interface AddUpdateRoleRequest {
  roleName: string;
  roleType: number;
  remark?: string;
  isActive: boolean;
  id?: number;
}

export interface AddRoleResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: Role;
}

export interface UpdateRoleResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: Role;
}

export interface GetRolesReq {
  RoleType?: string;
  IsActive?: boolean;
  RoleName?: string;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string | string[] | null | undefined;
  SortOrder?: string;
  UserStaffMemberId: string;
  Id?: number;
}

export interface GetRoleOptionReq {
  UserStaffMemberId: string;
  RoleType?: string;
  IsActive?: boolean;
}

export interface GetRolesResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: Role[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface Role {
  id: number;
  roleName: string;
  roleType: number;
  roleTypeName: string;
  remark?: string;
  isActive: boolean;
  permissions?: number; // NG
}

export interface RoleType {
  id: number;
  code: string;
  name: string;
  description: string;
}

export interface GetRoleTypeOptionsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: RoleType[];
}

export interface RoleForm {
  roleName: FormControl<string>;
  roleType: FormControl<number | null>;
  remark: FormControl<string>;
  isActive: FormControl<boolean>;
}

export interface IRoleFilter {
  status?: boolean | null;
  roleTypeId?: string;
}

export interface AssignUserRolesReq {
  staffMemberId: string;
  userRoles: UserRole[];
}

export interface AssignUserRolesRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: unknown;
}

export interface GetAllUserRolesReq {
  StaffMemberId: string;
}

export interface GetAllUserRolesRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: UserRole[];
}

/** Roles as the staffMember list payload carries them - no primary or active flags. */
export interface AssignedRole {
  id: number;
  code: string;
  name: string;
  type: string;
}

// UserRole - multi-role assignment
export interface UserRole {
  roleName: string;
  userRoleId: number;
  roleId: number;
  isActive: boolean;
  isPrimaryRole: boolean;
  roleType: number;
}

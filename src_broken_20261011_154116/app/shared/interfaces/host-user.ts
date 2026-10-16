import { FormControl } from '@angular/forms';

import { HostRole, HostUser } from './auth/login';

/** `/Host` mutation endpoints return the standard envelope without a typed payload. */
export interface HostResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: unknown;
}

/**
 * `/Host/get-all-host-users` — the host grid's paged list.
 * `isActive: null` is the "All" option; `makeHttpParams` drops the param entirely.
 */
export interface GetHostUsersRequest {
  isActive: boolean | null;
  pageNumber: number;
  pageSize: number;
}

/** The page sits alongside `data` in the envelope rather than nested inside it. */
export interface GetHostUsersResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: HostUser[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface GetHostUserResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: HostUser | null;
}

export interface GetHostRolesResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: HostRole[];
}

export interface GetHostRoleResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: HostRole | null;
}

/** Row returned by `/Host/get-host-modules`. Unlike institution modules it carries no operations. */
export interface HostModule {
  id: number;
  moduleCode: string;
  moduleName: string;
  displayName: string;
  urlpath: string;
  parentModuleId: number | null;
  isLeafNode: boolean;
  isModuleDisplayInUi: boolean;
  moduleScope: number;
  isActive: boolean;
  itemPriority: number;
}

export interface GetHostModulesResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: HostModule[];
}

/** Operation row inside `/HostRolePermission/get-role-module-permissions/{hostRoleId}`.
 *  The response carries no `operationType`. */
export interface HostRoleModuleOperation {
  moduleOperationMappingId: number;
  operationId: number;
  operationName: string;
  isAllowed: boolean;
}

export interface HostRoleModulePermissionRow {
  moduleId: number;
  moduleName: string;
  operations: HostRoleModuleOperation[];
}

export interface HostRoleModulePermissionsData {
  hostRoleId: number;
  hostRoleName: string;
  modules: HostRoleModulePermissionRow[];
}

export interface GetHostRoleModulePermissionsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: HostRoleModulePermissionsData | null;
}

export interface SaveHostRoleModulePermissionsRequest {
  hostRoleId: number;
  permissions: { moduleId: number; operationId: number }[];
}

export interface CreateHostUserRequest {
  hostRoleId: number;
  name: string;
  loginId: string;
  password: string;
  email: string;
  mobileNumber: string;
  isActive: boolean;
}

export interface UpdateHostUserRequest {
  id: number;
  hostRoleId: number;
  name: string;
  loginId: string;
  email: string;
  mobileNumber: string;
  isActive: boolean;
}

export interface DeleteHostUserRequest {
  id: number;
}

export interface ResetHostUserPasswordRequest {
  hostUserId: number;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangeHostUserPasswordRequest {
  hostUserId: number;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface HostUserForm {
  name: FormControl<string>;
  loginId: FormControl<string>;
  email: FormControl<string>;
  mobileNumber: FormControl<string>;
  hostRoleId: FormControl<number | null>;
  password: FormControl<string>;
  isActive: FormControl<boolean>;
}

export interface ResetHostUserPasswordForm {
  newPassword: FormControl<string>;
  confirmPassword: FormControl<string>;
}

export interface CreateHostRoleRequest {
  name: string;
  description: string;
}

export interface UpdateHostRoleRequest {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
}

export interface DeleteHostRoleRequest {
  id: number;
}

export interface HostRoleForm {
  name: FormControl<string>;
  description: FormControl<string>;
  isActive: FormControl<boolean>;
}

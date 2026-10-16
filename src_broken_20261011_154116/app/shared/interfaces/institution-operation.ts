export interface InstitutionOperation {
  id: number;
  operationName: string;
  operationType: number;
  isEnabled: boolean;
}

export interface InstitutionModule {
  id: number;
  parentModuleId: number;
  parentModuleName: string;
  moduleName: string;
  isEnabled: boolean;
  operations: InstitutionOperation[];
}

export interface InstitutionOperationsData {
  institutionId: string;
  modules: InstitutionModule[];
}

export interface GetInstitutionOperationsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionOperationsData;
}

/** Query params for `Subscription/get-all-institution-accessible-modules`. The institution id is an opaque
 *  token, not a number - see `IInstitution.id`. */
export interface GetInstitutionAccessibleModulesReq {
  InstitutionId: string;
  IsActive?: boolean;
}

/**
 * The endpoint publishes no response schema. It answers with the same module tree as
 * `Institution/get-all-institution-operations`, either wrapped in `{ institutionId, modules }` or as a bare array,
 * so both are accepted here and normalised at the call site.
 */
export interface GetInstitutionAccessibleModulesRes {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionOperationsData | InstitutionModule[] | null;
}

/** Body of `Institution/update-modules-and-operations`. The institution id is an opaque token, not a
 *  number - see `IInstitution.id`. */
export interface UpdateInstitutionModuleOperationsReq {
  institutionId: string;
  modules: {
    moduleId: number;
    isEnabled: boolean;
    operations: {
      operationId: number;
      isEnabled: boolean;
      isOperationUsed: boolean;
    }[];
  }[];
}

export interface RoleOperationPermission {
  operationId: number;
  operationName: string;
  operationType: number;
  hasAccess: boolean;
}

export interface RoleModulePermission {
  moduleId: number;
  moduleName: string;
  operations: RoleOperationPermission[];
}

/** Flat row returned by get-role-based-permissions / get-staffMember-based-permissions. */
export interface RolePermissionEntry {
  id: number;
  roleId?: number;
  staffMemberId?: string;
  moduleId: number;
  operationId: number;
  hasAccess: boolean;
  isActive: boolean;
}

export interface GetRolePermissionsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: RolePermissionEntry[];
}

export interface SaveRolePermissionsRequest {
  roleId: number;
  moduleOperations: {
    moduleId: number;
    moduleName: string;
    operations: {
      operationId: number;
      operationName: string;
      operationType: number;
      hasAccess: boolean;
    }[];
  }[];
}

export interface SaveRolePermissionsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: unknown;
}

export interface GetStaffMemberPermissionsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: RolePermissionEntry[];
}

export interface SaveStaffMemberPermissionsRequest {
  staffMemberId: string;
  moduleOperations: {
    moduleId: number;
    moduleName: string;
    operations: {
      operationId: number;
      operationName: string;
      operationType: number;
      hasAccess: boolean;
    }[];
  }[];
}

export interface SaveStaffMemberPermissionsResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: unknown;
}

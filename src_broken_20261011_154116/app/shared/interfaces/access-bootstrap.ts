import { HostRoleModulePermissionRow } from './host-user';

/** `GET /HostAccess/bootstrap` — the signed-in host user's own module/operation access.
 *  Same row shape as `/HostRolePermission/get-role-module-permissions/{hostRoleId}`,
 *  minus the role identity (the token already scopes it). */
export interface HostAccessBootstrapData {
  modules: HostRoleModulePermissionRow[];
}

export interface HostAccessBootstrapResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: HostAccessBootstrapData | null;
}

export interface InstitutionAccessOperation {
  operationId: number;
  operationName: string;
}

/** Leaf module. `operations` lists only what the staffMember is granted — the payload
 *  carries no `hasAccess` flag, so presence is the grant. */
export interface InstitutionAccessModule {
  moduleId: number;
  moduleName: string;
  displayName: string;
  imageIconWeb: string | null;
  imageIconMobile: string | null;
  path: string | null;
  subModuleURL: string | null;
  iconURL: string | null;
  dataViewStructureId: number | null;
  displayOn: string | null;
  operations: InstitutionAccessOperation[];
}

export interface InstitutionAccessSubModule {
  subModuleId: number;
  subModuleName: string;
  modules: InstitutionAccessModule[];
}

export interface InstitutionAccessMainModule {
  mainModuleId: number;
  mainModuleName: string;
  subModules: InstitutionAccessSubModule[];
}

/** `GET /InstitutionUserAccess/bootstrap` — the signed-in staffMember's operational navigation
 *  tree: main module -> sub module -> leaf module, each leaf carrying its granted operations. */
export interface InstitutionAccessBootstrapData {
  operationalMenus: InstitutionAccessMainModule[];
}

export interface InstitutionAccessBootstrapResponse {
  isSucceeded: boolean;
  message: string;
  errors: unknown[];
  data: InstitutionAccessBootstrapData | null;
}

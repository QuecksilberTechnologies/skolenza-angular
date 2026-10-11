/**
 * Row shape returned by `/ModuleOperation/*` reads. Swagger documents no response schema, so the
 * fields mirror `CreateModuleOperationRequestDTO`. `moduleName` / `operationName` are the projection
 * the grid prefers; it falls back to `#{id}` when the API omits them.
 */
export interface ModuleOperationRow {
  id: number;
  moduleOperationMappingId?: number | null;
  moduleId: number;
  moduleName?: string | null;
  operationId: number;
  operationName?: string | null;
  dataViewStructureId: number | null;
  pageTypeId: number | null;
  pageURL: string | null;
  iconURL: string | null;
  isCommonItem: boolean | null;
  isOperational: boolean | null;
  priority: number | null;
  remark: string | null;
  isActive: boolean;
  /** Audit columns the `get-all` payload carries but Swagger never documents — read-only. */
  addedById?: number | null;
  addedDateTime?: string | null;
  updatedById?: number | null;
  updatedDateTime?: string | null;
  isDeleting?: boolean; // NG
}

export interface GetModuleOperationsRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: ModuleOperationRow[];
}

export interface MenuStructureRow {
  id: number;
  displayOn: string;
}

export interface GetMenuStructuresReq {
  moduleId: number;
  operationId: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetMenuStructuresRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: MenuStructureRow[];
}

export interface GetModuleOperationRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: ModuleOperationRow | null;
}

/** `/ModuleOperation` mutations return the envelope without a typed payload. */
export interface ModuleOperationMutationRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: unknown;
}

export interface CreateModuleOperationReq {
  moduleId: number;
  operationId: number;
  dataViewStructureId: number | null;
  pageTypeId: number | null;
  pageURL: string | null;
  iconURL: string | null;
  isCommonItem: boolean;
  isOperational: boolean;
  priority: number | null;
  remark: string | null;
  isActive: boolean;
}

export interface UpdateModuleOperationReq extends CreateModuleOperationReq {
  id: number;
  moduleOperationMappingId?: number | null;
}

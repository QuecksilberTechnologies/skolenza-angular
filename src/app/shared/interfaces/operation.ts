export interface OperationTypeOption {
  label: string;
  value: number;
}

/** `operationType` is an untyped int32 in swagger; these are the values the API uses. */
export const OPERATION_TYPES: OperationTypeOption[] = [
  { label: 'CRUD', value: 1 },
  { label: 'Workflow', value: 2 },
  { label: 'Status', value: 3 },
  { label: 'Actions', value: 4 },
];

/**
 * Row shape returned by `/OperationsMaster/*` reads. Swagger documents no response schema for these
 * endpoints. `operationType` and `iconImage` are write-only today: both are accepted by
 * create/update but `get-all-operations` never sends them back, so reads leave them undefined.
 */
export interface OperationRow {
  id: number;
  operationName: string;
  operationType?: number | null;
  remark: string | null;
  iconImage?: string | null;
  isActive: boolean;
  productOwnerId?: number;
  productOwnerRoleId?: number;
  addedById?: number;
  addedDateTime?: string;
  updatedById?: number | null;
  updatedDateTime?: string | null;
  isDeleting?: boolean; // NG
}

export interface GetOperationsRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: OperationRow[];
}

export interface GetOperationRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: OperationRow | null;
}

/** `/OperationsMaster` mutations return the envelope without a typed payload. */
export interface OperationMutationRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: unknown;
}

export interface CreateOperationReq {
  productOwnerId: number;
  productOwnerRoleId: number;
  operationName: string;
  operationType: number;
  remark: string;
  isActive: boolean;
  iconImage: string | null;
}

export interface UpdateOperationReq extends CreateOperationReq {
  id: number;
}

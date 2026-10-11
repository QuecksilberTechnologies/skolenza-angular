/**
 * `ModuleId` / `OperationId` query params that a growing set of endpoints accept so the backend
 * knows which module and operation a call is made under.
 *
 * Both are optional in swagger and either can fail to resolve client-side, so both stay optional —
 * `BaseService.makeHttpParams()` drops an undefined value rather than sending an empty one.
 *
 * Resolved by `CurrentUserPermissionsStore.identifiersOf()`.
 */
export interface ModuleOperationIds {
  ModuleId?: number;
  OperationId?: number;
}

/**
 * The same two ids as `ModuleOperationIds`, in the casing the write endpoints use.
 *
 * Reads take them as PascalCase query params; `create`, `update` and `update-status` take them as
 * camelCase fields inside the request body. Same values, two spellings, so both shapes exist.
 */
export interface ModuleOperationIdFields {
  moduleId?: number;
  operationId?: number;
}

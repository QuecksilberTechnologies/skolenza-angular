---
name: permission-matrix
description: How the role/employee permission matrix is wired — the two APIs that feed it, the moduleId+operationId matching rule, and the save payload shape. Use when working on shared/components/permission-matrix, features/roles/role-permissions, features/employees/employees-permissions, core/stores/current-user-permissions.store.ts, or anything touching canAccess/canPerform, RolePermissionEntry, getTenantOperations, or assign-role-permissions / assign-employee-permissions.
---

# Role / Employee Permissions

- Two APIs feed the permission matrix — never one on its own:
  - `GET /Tenant/get-all-tenant-operations?IsActive=true` → full module/operation
    catalog with `id` + names. Builds the matrix structure.
  - `GET /UserModuleRolePermission/get-role-based-permissions?RoleId={id}` (or the
    employee equivalent) → **flat** array of `RolePermissionEntry` rows
    (`{ moduleId, operationId, hasAccess, isActive, ... }`). Drives pre-selection.
- The permission response has **no names** — match the two datasets by
  `moduleId` + `operationId`, never by `moduleName` / `operationName`.
- Do **not** introduce enums for operation names (Add/Update/Delete/…) or operation
  types (CRUD/WorkFlow/Status/Actions). Operations are defined by the backend and
  come in through `getTenantOperations()` at runtime. `PermissionMatrix` keeps
  string-keyed icon/label lookup tables for display, but the source of truth is the
  API.
- `tenantModules[].operations[].isEnabled` means "operation is available in the
  catalog" (filter flag), NOT "checkbox should be pre-checked". Pre-checking comes
  only from the flat `RolePermissionEntry[]` via the second API.
- `core/stores/current-user-permissions.store.ts` `forkJoin`s both APIs and calls
  `enrichPermissions()` to produce a nested `RoleModulePermission[]` so existing
  `canAccess(name)` / `canPerform(name, op)` callers keep working. It loads on login
  (`features/authentication/login/login.ts`) and on cold start from `StorageApi`, and is
  cleared on logout in `layout/app-header/app-header.ts`.
- Save payloads DO carry names — the matrix emits
  `{ moduleId, moduleName, operationId, operationName, hasAccess }` per cell for
  the `/assign-role-permissions` / `/assign-employee-permissions` POST.
- `PermissionMatrix` (`shared/components/permission-matrix/`) is shared by
  `features/roles/role-permissions/` and `features/employees/employees-permissions/`.

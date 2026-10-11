/** Discriminator for the three module scopes persisted by the API. */
export type ModuleScopeKey = 'institution' | 'host' | 'common';

export interface ModuleScopeOption {
  key: ModuleScopeKey;
  label: string;
  /** The API `moduleScope`. */
  value: number;
}

/** `moduleScope` is an untyped int32 in swagger; these are the values the API uses. */
export const INSTITUTION_MODULE_SCOPE = 1;
export const HOST_MODULE_SCOPE = 2;
export const COMMON_MODULE_SCOPE = 3;

export const MODULE_SCOPE_LABELS: Record<ModuleScopeKey, string> = {
  institution: 'Institution User',
  host: 'Host User',
  common: 'Common',
};

export const MODULE_SCOPES: ModuleScopeOption[] = [
  { key: 'institution', label: MODULE_SCOPE_LABELS.institution, value: INSTITUTION_MODULE_SCOPE },
  { key: 'host', label: MODULE_SCOPE_LABELS.host, value: HOST_MODULE_SCOPE },
  { key: 'common', label: MODULE_SCOPE_LABELS.common, value: COMMON_MODULE_SCOPE },
];

/** The scope both module grids open on — the list endpoints return nothing without one. */
export const DEFAULT_MODULE_SCOPE_KEY: ModuleScopeKey = 'institution';

/** key → the number the API accepts. */
export const moduleScopeValue = (key: ModuleScopeKey): number =>
  key === 'host'
    ? HOST_MODULE_SCOPE
    : key === 'common'
      ? COMMON_MODULE_SCOPE
      : INSTITUTION_MODULE_SCOPE;

type ScopedRow = Pick<ModuleRow, 'moduleScope' | 'isCommonMenu'>;

/** Row → key. `null` for a scope the UI does not model, so the raw number still surfaces. */
export function moduleScopeKeyOf(row: ScopedRow): ModuleScopeKey | null {
  if (row.moduleScope === HOST_MODULE_SCOPE) return 'host';
  if (row.moduleScope === COMMON_MODULE_SCOPE) return 'common';
  if (row.moduleScope === INSTITUTION_MODULE_SCOPE) return 'institution';
  return null;
}

/** Badge text for a grid row. */
export function moduleScopeLabel(row: ScopedRow): string {
  const key = moduleScopeKeyOf(row);
  return key ? MODULE_SCOPE_LABELS[key] : `${row.moduleScope}`;
}

/** Badge severity for a grid row — blue must not mean "any scope". */
export type ModuleScopeSeverity = 'info' | 'warn' | 'secondary';

export const MODULE_SCOPE_SEVERITY: Record<ModuleScopeKey, ModuleScopeSeverity> = {
  institution: 'info',
  host: 'warn',
  common: 'secondary',
};

export function moduleScopeSeverity(row: ScopedRow): ModuleScopeSeverity {
  const key = moduleScopeKeyOf(row);
  return key ? MODULE_SCOPE_SEVERITY[key] : 'secondary';
}

/** `imageIconWeb` should hold a PrimeIcons class; seeded rows carry junk like `"string"`. */
export function moduleIcon(row: Pick<ModuleRow, 'imageIconWeb' | 'isLeafNode'>): string {
  const icon = row.imageIconWeb?.trim() ?? '';
  return /^pi[\s-]/.test(icon) ? icon : row.isLeafNode ? 'pi pi-file' : 'pi pi-folder';
}

/**
 * Depth-first flatten, parents before their children, so the flat grids and selects can keep
 * rendering a tree the API now nests.
 */
export function flattenModuleHeaders(rows: ModuleHeaderRow[]): ModuleHeaderRow[] {
  return rows.flatMap((row) => [row, ...flattenModuleHeaders(row.children ?? [])]);
}

export const isModuleScopeKey = (value: string | null): value is ModuleScopeKey =>
  value === 'institution' || value === 'host' || value === 'common';

/** Row shape shared by `/ParentModule/*` and `/ChildModule/*` reads. */
export interface ModuleRow {
  id: number;
  moduleCode: string | null;
  moduleName: string;
  displayName: string;
  urlPath: string;
  /** Always null on parent rows. */
  parentModuleId: number | null;
  isLeafNode: boolean;
  isModuleDisplayInUI: boolean;
  isCommonMenu: boolean;
  moduleScope: number;
  isActive: boolean;
  imageIconWeb: string | null;
  imageIconMobile: string | null;
  /** Can be negative — `-1` pins an item to the end of its menu group. */
  itemPriority: number;
  remark: string | null;
  addedById: number;
  addedDateTime: string;
  updatedById: number | null;
  updatedDateTime: string | null;
  isUpdatingStatus?: boolean; // NG
}

/** Trimmed parent projection embedded in every `/ChildModule/*` row. */
export interface ModuleParentRef {
  id: number;
  moduleCode: string | null;
  moduleName: string;
  displayName: string;
  moduleScope: number;
  isActive: boolean;
}

export interface SubModuleRow extends ModuleRow {
  parentModule: ModuleParentRef | null;
}

/**
 * MEASURED CONTRACT — swagger documents no response schema for `/ParentModule/get-module-headers`.
 * It is a trimmed projection, not a `ModuleRow`: no `moduleCode`, `parentModuleId`, `moduleScope`,
 * `isCommonMenu`, `isModuleDisplayInUI`, `isActive`, `remark` or audit columns. Leaf modules are
 * never returned, so every row here is a header and `isLeafNode` is always false.
 */
export interface ModuleHeaderRow {
  id: number;
  moduleName: string;
  displayName: string;
  /** The child route the header points at; mirrors `urlPath` on every row seen so far. */
  subModuleUrl: string | null;
  urlPath: string | null;
  isLeafNode: boolean;
  imageIconWeb: string | null;
  imageIconMobile: string | null;
  itemPriority: number;
  children: ModuleHeaderRow[] | null;
}

export interface GetModuleHeadersRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: ModuleHeaderRow[];
}

export interface GetSubModulesRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: SubModuleRow[];
}

export interface GetModuleRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: ModuleRow | null;
}

export interface GetSubModuleRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: SubModuleRow | null;
}

/** `/ParentModule` and `/ChildModule` mutations return the envelope without a typed payload. */
export interface ModuleMutationRes {
  isSucceeded: boolean;
  message: string;
  errors?: unknown[];
  data: unknown;
}

/**
 * `GET /ParentModule/get-module-headers` binds PascalCase, unlike every `/ChildModule` route —
 * `makeHttpParams` copies keys verbatim, so the case has to be right here.
 */
export interface GetModuleHeadersReq {
  ModuleScope?: number | null;
  IsActive?: boolean | null;
}

/** Query params for the SubModule controller are camelCase. */
export interface GetSubModulesReq {
  moduleScope?: number | null;
  parentModuleId?: number | null;
  isActive?: boolean | null;
}

/** Fields flagged `deprecated` in the swagger DTO (`staffMemberId`, `institutionId`, `roleId`) are not sent. */
export interface CreateParentModuleReq {
  moduleCode: string;
  moduleName: string;
  displayName: string;
  urlPath: string;
  isModuleDisplayInUI: boolean;
  isCommonMenu: boolean;
  moduleScope: number;
  isActive: boolean;
  imageIconWeb: string | null;
  imageIconMobile: string | null;
  itemPriority: number | null;
  remark: string | null;
}

export type UpdateParentModuleReq = CreateParentModuleReq;

export interface CreateSubModuleReq extends CreateParentModuleReq {
  parentModuleId: number;
}

export type UpdateSubModuleReq = CreateSubModuleReq;

export interface UpdateModuleStatusReq {
  moduleScope: number;
  isActive: boolean;
}

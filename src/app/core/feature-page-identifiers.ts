import { FeaturePageNode, ModuleOperationIds } from '@shared/interfaces';
import { normalisePermissionName as normalise } from '@shared/utilities/permission-name';

export interface FeaturePageIndexEntry {
  /** `FeaturePageNode.id` — the `ModuleId` the API authorises against. */
  moduleId: number;
  /** The label `my-menu` gives this node — same string the sidebar renders via `n.displayName || n.moduleName`. */
  displayName: string;
  /** Normalised operation name → `FeaturePageOperation.id`. */
  operationIds: ReadonlyMap<string, number>;
}

/** Normalised `moduleCode` → its ids. */
export type FeaturePageIndex = ReadonlyMap<string, FeaturePageIndexEntry>;

/**
 * One `moduleCode`, or the codes one endpoint can be published under.
 *
 * `my-menu` is permission-filtered per session, so the same URL reaches the caller under a
 * different code depending on who they are — `INSTITUTION_DEVICES` for a host session,
 * `INSTITUTION_DEVICE_SETUP` for a institution one. Naming both lets the session's own tree decide, which is
 * the whole point of keying on `moduleCode` rather than on an id the backend may renumber.
 */
export type ModuleCodeCandidates = string | readonly string[];

/** Canonical institution access-master codes published by `GET /Navigation/my-menu`. */
export const INSTITUTION_ACCESS_MODULE_CODES = {
  department: 'INSTITUTION_DEPARTMENTS',
  role: 'INSTITUTION_ACCESS',
} as const;

/** One code or many, always as a list. The narrowing is here once so no caller repeats it. */
export function asCandidateList(candidates: ModuleCodeCandidates): readonly string[] {
  return typeof candidates === 'string' ? [candidates] : candidates;
}

/**
 * The candidate this session's tree answers with, preferring one that publishes `operationName`.
 *
 * Presence alone is not enough. A tree that carries both codes of a pair — which
 * `aside-menu-module-map.ts` records as unverified rather than impossible — would otherwise resolve
 * on whichever came first and hand back a `ModuleId` with no `OperationId`, sending the request
 * bare: the 400 this whole mechanism exists to remove, under a new cause.
 *
 * So: the first candidate publishing the operation, else the first the tree publishes at all (its
 * `ModuleId` is still the honest answer), else the first one named, so an unresolved lookup reports
 * the code the caller meant.
 */
export function resolveModuleCodeIn(
  index: FeaturePageIndex,
  candidates: ModuleCodeCandidates,
  operationName?: string,
): string {
  const codes = asCandidateList(candidates);
  if (codes.length === 1) return codes[0];

  const operation = operationName === undefined ? undefined : normalise(operationName);

  return (
    (operation === undefined
      ? undefined
      : codes.find((code) => index.get(normalise(code))?.operationIds.has(operation))) ??
    codes.find((code) => index.has(normalise(code))) ??
    codes[0]
  );
}

/**
 * Flattens `GET /Navigation/my-menu` into the only lookup the id space needs.
 *
 * Every node is indexed, not just leaves: a module node (`STAFF_MGMT`) carries a real `id` and no
 * `operations`, so naming one in a route row resolves a `ModuleId` and no `OperationId` — which
 * the interceptor can report as the row bug it is instead of silently resolving nothing.
 */
export function buildFeaturePageIndex(nodes: readonly FeaturePageNode[]): FeaturePageIndex {
  const index = new Map<
    string,
    { moduleId: number; displayName: string; operationIds: Map<string, number> }
  >();

  const visit = (node: FeaturePageNode): void => {
    const code = normalise(node.moduleCode);

    if (code) {
      // A leaf can hang off more than one header with a different slice of operations each time.
      // It is the same node either way, so the first `id` wins and the operations are unioned.
      let entry = index.get(code);
      if (!entry) {
        entry = {
          moduleId: node.id,
          displayName: node.displayName || node.moduleName,
          operationIds: new Map<string, number>(),
        };
        index.set(code, entry);
      }

      for (const operation of node.operations ?? []) {
        const name = normalise(operation.name);
        if (name && !entry.operationIds.has(name)) entry.operationIds.set(name, operation.id);
      }
    }

    for (const child of node.children ?? []) visit(child);
  };

  for (const node of nodes) visit(node);

  return index;
}

/**
 * The `ModuleId` / `OperationId` for one `moduleCode` and operation name.
 *
 * Either can come back undefined, and they are resolved independently: a page that exists but does
 * not publish the operation still sends its `ModuleId`, because the tree is permission-filtered and
 * an absent operation means either a wrong route row or an operation this session was not granted.
 * The API denies the second, which is the right answer — sending nothing would hide both.
 */
/** The module appears in this session's tree at all. */
export function isKnownModuleIn(
  index: FeaturePageIndex,
  moduleCode: ModuleCodeCandidates,
): boolean {
  return index.has(normalise(resolveModuleCodeIn(index, moduleCode)));
}

/**
 * Hard gate: the module publishes this operation for this session.
 *
 * `my-menu` lists only granted operations, so membership is the grant. A module the tree does not
 * publish resolves nothing and denies — use `canPerformOrUnknownIn` unless the module is known to
 * be published.
 */
export function canPerformIn(
  index: FeaturePageIndex,
  moduleCode: ModuleCodeCandidates,
  operationName: string,
): boolean {
  const code = resolveModuleCodeIn(index, moduleCode, operationName);
  return !!index.get(normalise(code))?.operationIds.has(normalise(operationName));
}

/**
 * Soft gate, and the default for a page.
 *
 * A module the tree does not publish stays visible, the way
 * `CurrentUserPermissionsStore.canAccessOrUnknown` treats an untracked module: a screen the backend
 * has not modelled yet must not lose its buttons, and a session that receives no tree at all must
 * not lose every screen. Failing open costs a button that 403s; failing closed costs a screen
 * nobody can use.
 */
export function canPerformOrUnknownIn(
  index: FeaturePageIndex,
  moduleCode: ModuleCodeCandidates,
  operationName: string,
): boolean {
  if (!isKnownModuleIn(index, moduleCode)) return true;
  return canPerformIn(index, moduleCode, operationName);
}

export function identifiersFrom(
  index: FeaturePageIndex,
  moduleCode: ModuleCodeCandidates,
  operationName: string,
): ModuleOperationIds {
  const entry = index.get(normalise(resolveModuleCodeIn(index, moduleCode, operationName)));

  return {
    ModuleId: entry?.moduleId,
    OperationId: entry?.operationIds.get(normalise(operationName)),
  };
}

/** The label `my-menu` gives this module, or `undefined` when the tree has no leaf for
 *  `moduleCode` yet — an unpublished module, or the tree hasn't loaded. Callers must fall back to
 *  their own hardcoded title; this never blanks a header. */
export function displayNameFrom(
  index: FeaturePageIndex,
  moduleCode: ModuleCodeCandidates,
): string | undefined {
  return index.get(normalise(resolveModuleCodeIn(index, moduleCode)))?.displayName;
}

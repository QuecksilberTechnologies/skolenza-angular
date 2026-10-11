import { DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { AccessBootstrapApi } from '@core/services/access-bootstrap-api';
import { HostApi } from '@core/services/host-api';
import { RolesApi } from '@core/services/roles-api';
import { StorageApi } from '@core/services/storage-api';
import { InstitutionsApi } from '@core/services/institutions-api';
import {
  HostRoleModulePermissionRow,
  LoginInfo,
  ModuleOperationIdFields,
  ModuleOperationIds,
  RoleModulePermission,
  RolePermissionEntry,
  InstitutionAccessMainModule,
  InstitutionModule,
} from '@shared/interfaces';
import { isHostLogin } from '@shared/utilities/login-info';

interface CurrentUserPermissionsState {
  modules: RoleModulePermission[];
  /** The institution's whole module catalog, unfiltered by grants, kept only to resolve the numeric
   *  `ModuleId` that a growing set of endpoints require. `modules` cannot serve that: it holds
   *  only what the role is granted, and it is empty outright for a super admin. */
  moduleCatalog: InstitutionModule[];
  isLoading: boolean;
  isLoaded: boolean;
  /** Super Admin has implicit access to everything — the permission matrix is
   *  empty for them, so all access checks must short-circuit to true. */
  isSuperAdmin: boolean;
  /** The permission fetch failed outright — distinct from "loaded, grants nothing",
   *  so the shell can render and the next guard can retry instead of denying forever. */
  hasLoadFailed: boolean;
  /** Host sessions get the complete host module catalog, so a module missing
   *  from it must fail closed instead of falling through as "untracked". */
  isHostSession: boolean;
  /** The catalog fetch has settled — succeeded, came back empty, or failed. It means "done
   *  asking", not "got rows": a institution with no provisioned modules answers `modules: []`, and
   *  gating requests on rows rather than on completion would idle every resource forever. */
  catalogLoaded: boolean;
}

const SUPER_ADMIN_ROLE_NAME = 'super admin';

/** Seeded platform-owner host role — keeps implicit full access to the host console. */
const SUPER_ADMIN_HOST_ROLE_ID = 1;

/** Neither bootstrap carries an operation type; the runtime checks never read it. */
const HOST_OPERATION_TYPE = 1;
const INSTITUTION_OPERATION_TYPE = 1;

/** Join a flat permission-row response with institution-operations metadata so the
 *  rest of the app can keep querying by module/operation name. */
function enrichPermissions(
  entries: RolePermissionEntry[],
  institutionModules: InstitutionModule[],
): RoleModulePermission[] {
  const grantedSet = new Set<string>();
  for (const entry of entries) {
    if (entry?.hasAccess && entry.isActive !== false) {
      grantedSet.add(`${entry.moduleId}-${entry.operationId}`);
    }
  }

  return institutionModules
    .filter((m) => m.isEnabled)
    .map((mod) => ({
      moduleId: mod.id,
      moduleName: mod.moduleName,
      operations: (mod.operations ?? []).map((op) => ({
        operationId: op.id,
        operationName: op.operationName,
        operationType: op.operationType,
        hasAccess: grantedSet.has(`${mod.id}-${op.id}`),
      })),
    }));
}

/** The host permission response is already nested by module — a direct 1:1 map. */
function toHostPermissions(rows: HostRoleModulePermissionRow[]): RoleModulePermission[] {
  return rows.map((mod) => ({
    moduleId: mod.moduleId,
    moduleName: mod.moduleName,
    operations: (mod.operations ?? []).map((op) => ({
      operationId: op.operationId,
      operationName: op.operationName,
      operationType: HOST_OPERATION_TYPE,
      hasAccess: op.isAllowed,
    })),
  }));
}

/** Flatten the institution bootstrap's mainModule -> subModule -> module tree. Only granted
 *  operations are listed, so every one of them maps to `hasAccess: true`.
 *
 *  A leaf can hang off more than one sub-module with a different slice of operations
 *  each time; grants are unioned by `moduleId` because `findModule` matches on the
 *  first entry and would otherwise drop the rest. */
function toInstitutionPermissions(menus: InstitutionAccessMainModule[]): RoleModulePermission[] {
  const byModuleId = new Map<number, RoleModulePermission>();

  const leaves = menus.flatMap((main) => main.subModules ?? []).flatMap((sub) => sub.modules ?? []);

  for (const mod of leaves) {
    let entry = byModuleId.get(mod.moduleId);
    if (!entry) {
      entry = { moduleId: mod.moduleId, moduleName: mod.moduleName, operations: [] };
      byModuleId.set(mod.moduleId, entry);
    }

    for (const op of mod.operations ?? []) {
      if (entry.operations.some((existing) => existing.operationId === op.operationId)) continue;
      entry.operations.push({
        operationId: op.operationId,
        operationName: op.operationName,
        operationType: INSTITUTION_OPERATION_TYPE,
        hasAccess: true,
      });
    }
  }

  return [...byModuleId.values()];
}

const initialState: CurrentUserPermissionsState = {
  modules: [],
  moduleCatalog: [],
  isLoading: false,
  isLoaded: false,
  isSuperAdmin: false,
  isHostSession: false,
  hasLoadFailed: false,
  catalogLoaded: false,
};

export const CurrentUserPermissionsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ modules, catalogLoaded }) => ({
    moduleNames: computed(() => modules().map((m) => m.moduleName)),
    /** Safe to resolve `ModuleId` / `OperationId` — the catalog fetch has settled either way. */
    isCatalogReady: computed(() => catalogLoaded()),
  })),
  withMethods((store) => {
    const accessApi = inject(AccessBootstrapApi);
    const rolesApi = inject(RolesApi);
    const institutionsApi = inject(InstitutionsApi);
    const hostApi = inject(HostApi);
    const storageApi = inject(StorageApi);
    const destroyRef = inject(DestroyRef);

    const findModule = (moduleName: string) =>
      store.modules().find((m) => m.moduleName?.toLowerCase() === moduleName?.toLowerCase());

    // Tracks the in-flight (or completed) permission fetch so guards can await it
    // instead of racing an unfinished load (which would otherwise fail open).
    let loadPromise: Promise<void> | null = null;

    // Separate from `loadPromise`: the catalog is fetched even for a super admin, whose
    // permission load short-circuits before any request goes out.
    let catalogPromise: Promise<void> | null = null;

    const applyCatalog = (catalog: InstitutionModule[]) => {
      if (catalog.length) patchState(store, { moduleCatalog: catalog });
    };

    /** The institution's module catalog, for `ModuleId` resolution only. Never touches grants, and a
     *  failure is silent — the endpoints that want `ModuleId` treat it as optional. */
    const loadModuleCatalog = (): Promise<void> => {
      let failed = false;
      return (catalogPromise ??= new Promise<void>((resolve) => {
        institutionsApi
          .getInstitutionOperations()
          .pipe(
            finalize(() => resolve()),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res?.isSucceeded) applyCatalog(res.data?.modules ?? []);
              // Settled even on an empty catalog — see `catalogLoaded`.
              patchState(store, { catalogLoaded: true });
            },
            // Marked settled either way — a failed catalog must not idle every gated
            // resource for the rest of the session.
            error: () => {
              failed = true;
              patchState(store, { catalogLoaded: true });
            },
          });
      }).finally(() => {
        // Dropped here rather than in the `error` handler, which runs inside the executor before
        // `??=` assigns — a synchronously-failing source would otherwise put the promise straight
        // back and the retry would never happen. Only a failure retries: a successful but empty
        // catalog is a settled answer, and refetching it on every call would hammer the endpoint.
        if (failed) catalogPromise = null;
      }));
    };

    /** A failed fetch must not read as "this role grants nothing" — drop the cached
     *  promise so the next `ensureLoaded()` retries instead of resolving instantly. */
    const failLoad = () => {
      patchState(store, { isLoaded: false, hasLoadFailed: true });
      loadPromise = null;
    };

    const applyModules = (modules: RoleModulePermission[]) => {
      patchState(store, { modules, isLoaded: true, hasLoadFailed: false });
    };

    /** Bootstrap first, legacy second. Resolving `false` means "nothing usable came
     *  back" — an empty catalog counts, because the endpoint is still being populated
     *  and an empty host catalog would otherwise deny every module. */
    const runHostBootstrap = (): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        accessApi
          .getHostBootstrap()
          // `finalize` also fires on unsubscribe, so a source that completes without
          // emitting can never leave the awaiting guard hanging.
          .pipe(
            finalize(() => resolve(false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              const modules = res?.isSucceeded ? toHostPermissions(res.data?.modules ?? []) : [];
              if (!modules.length) {
                resolve(false);
                return;
              }
              applyModules(modules);
              resolve(true);
            },
            error: () => resolve(false),
          });
      });

    const runInstitutionBootstrap = (): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        accessApi
          .getInstitutionBootstrap()
          .pipe(
            finalize(() => resolve(false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              const modules = res?.isSucceeded
                ? toInstitutionPermissions(res.data?.operationalMenus ?? [])
                : [];
              if (!modules.length) {
                resolve(false);
                return;
              }
              applyModules(modules);
              resolve(true);
            },
            error: () => resolve(false),
          });
      });

    /** Pre-bootstrap institution path: two calls joined client-side by module/operation id. */
    const runLegacyInstitutionLoad = (roleId: number): Promise<void> =>
      new Promise<void>((resolve) => {
        forkJoin({
          perms: rolesApi.getRoleBasedPermissions(roleId),
          ops: institutionsApi.getInstitutionOperations(),
        })
          .pipe(
            finalize(() => resolve()),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: ({ perms, ops }) => {
              if (!perms?.isSucceeded || !ops?.isSucceeded) {
                failLoad();
              } else {
                applyCatalog(ops.data?.modules ?? []);
                applyModules(enrichPermissions(perms.data ?? [], ops.data?.modules ?? []));
              }
              resolve();
            },
            error: () => {
              failLoad();
              resolve();
            },
          });
      });

    /** Pre-bootstrap host path — needs a role id the bootstrap does not. */
    const runLegacyHostLoad = (hostRoleId: number): Promise<void> =>
      new Promise<void>((resolve) => {
        hostApi
          .getHostRoleModulePermissions(hostRoleId)
          .pipe(
            finalize(() => resolve()),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (!res?.isSucceeded) {
                failLoad();
              } else {
                applyModules(toHostPermissions(res.data?.modules ?? []));
              }
              resolve();
            },
            error: () => {
              failLoad();
              resolve();
            },
          });
      });

    /** `hostRole` is optional on the login payload — without this recovery a response
     *  that omits it leaves the legacy fallback with no id to query. */
    const resolveHostRoleId = (hostUserId: number): Promise<number | undefined> =>
      new Promise<number | undefined>((resolve) => {
        hostApi
          .getHostUserById(hostUserId)
          .pipe(
            finalize(() => resolve(undefined)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => resolve(res?.isSucceeded ? res.data?.hostRoleId : undefined),
            error: () => resolve(undefined),
          });
      });

    const runHostLoad = async (
      hostRoleId: number | undefined,
      hostUserId: number | undefined,
    ): Promise<void> => {
      patchState(store, { isLoading: true });
      try {
        // Resolve the role first: a super admin's catalog can come back all-denied,
        // and applying it would lock them out of a console they implicitly own.
        const roleId = hostRoleId ?? (hostUserId ? await resolveHostRoleId(hostUserId) : undefined);
        if (roleId === SUPER_ADMIN_HOST_ROLE_ID) {
          patchState(store, { isSuperAdmin: true });
          return;
        }

        if (await runHostBootstrap()) return;

        if (!roleId) {
          // No catalog and no id to fall back with — a retryable state beats a
          // silent deny on every host module.
          failLoad();
          return;
        }
        await runLegacyHostLoad(roleId);
      } finally {
        patchState(store, { isLoading: false });
      }
    };

    const runInstitutionLoad = async (roleId: number | undefined): Promise<void> => {
      patchState(store, { isLoading: true });
      try {
        if (await runInstitutionBootstrap()) return;
        if (!roleId) {
          failLoad();
          return;
        }
        await runLegacyInstitutionLoad(roleId);
      } finally {
        patchState(store, { isLoading: false });
      }
    };

    return {
      load(roleId?: number): void {
        loadPromise = runInstitutionLoad(roleId);
      },

      /** Resolves once the module catalog has settled, so a caller can read `identifiersOf`
       *  without racing the fetch. Memoised — repeat calls issue no second request. */
      ensureCatalogLoaded(): Promise<void> {
        // A host has no institution, so this fetch would 403 and toast on every call. Guarded on the
        // reason rather than on `catalogLoaded`, which a *failed* fetch also sets — short-circuiting
        // on that flag would cancel `loadModuleCatalog`'s own retry and leave the catalog empty for
        // the rest of the session.
        if (store.isHostSession()) return Promise.resolve();
        return loadModuleCatalog();
      },

      /** Resolves once permissions are loaded — starting the load if needed.
       *  Lets route guards make a fail-closed decision instead of racing. */
      async ensureLoaded(): Promise<void> {
        if (store.isSuperAdmin() || store.isLoaded()) return;
        // A previous failure is retried here — otherwise the session stays locked out.
        if (!loadPromise || store.hasLoadFailed()) await this.loadFromStorage();
        if (loadPromise) await loadPromise;
      },

      clear(): void {
        // Drop the cached fetches too, or the next login resolves against stale state.
        loadPromise = null;
        catalogPromise = null;
        patchState(store, initialState);
      },

      canAccess(moduleName: string): boolean {
        if (store.isSuperAdmin()) return true;
        const mod = findModule(moduleName);
        return !!mod && mod.operations.some((op) => op.hasAccess);
      },

      isKnownModule(moduleName: string): boolean {
        return !!findModule(moduleName);
      },

      /**
       * The `ModuleId` / `OperationId` request params for endpoints that require them.
       *
       * Both come from one source on purpose, so they always share a name space. The unfiltered
       * institution catalog answers first: the grant matrix lists only granted operations, and a
       * module the role was never granted would otherwise resolve to nothing and take a 403.
       * The grant matrix is the fallback, and the only source a host session has.
       *
       * Either key can come back undefined; `makeHttpParams` drops it rather than sending it
       * empty.
       *
       * NOT the id space of `GET /Navigation/my-menu`: that tree keys on `moduleCode` and its
       * ids belong to `FeaturePageStore.moduleOperationIds()`. The two must not be crossed.
       *
       * @param moduleName the permission catalog's `moduleName` — the key `canPerform` takes
       * @param operationName `View`, `Add`, `Update`, `Delete`, and so on
       */
      identifiersOf(moduleName: string, operationName: string): ModuleOperationIds {
        const wantedModule = moduleName?.toLowerCase();
        const wantedOperation = operationName?.toLowerCase();

        const fromCatalog = store
          .moduleCatalog()
          .find((m) => m.moduleName?.toLowerCase() === wantedModule);
        const granted = findModule(moduleName);

        // Resolved independently rather than picking one source: the catalog is fetched with
        // `IsActive=true`, so an operation that is granted but inactive is missing from it while
        // the grant matrix still carries the id.
        return {
          ModuleId: fromCatalog?.id ?? granted?.moduleId,
          OperationId:
            (fromCatalog?.operations ?? []).find(
              (op) => op.operationName?.toLowerCase() === wantedOperation,
            )?.id ??
            granted?.operations.find((op) => op.operationName?.toLowerCase() === wantedOperation)
              ?.operationId,
        };
      },

      /** The same two ids, camelCased as the write endpoints take them inside the request body. */
      identifierFieldsOf(moduleName: string, operationName: string): ModuleOperationIdFields {
        const { ModuleId, OperationId } = this.identifiersOf(moduleName, operationName);
        return { moduleId: ModuleId, operationId: OperationId };
      },

      canAccessOrUnknown(moduleName: string): boolean {
        if (store.isSuperAdmin()) return true;
        // Host catalogs are closed — an unknown module is a denial, not an untracked module.
        if (store.isHostSession()) return this.canAccess(moduleName);
        if (!store.isLoaded()) return true;
        const mod = findModule(moduleName);
        if (!mod) return true;
        return mod.operations.some((op) => op.hasAccess);
      },

      canPerform(moduleName: string, operationName: string): boolean {
        if (store.isSuperAdmin()) return true;
        const mod = findModule(moduleName);
        if (!mod) return false;
        return mod.operations.some(
          (op) => op.operationName?.toLowerCase() === operationName?.toLowerCase() && op.hasAccess,
        );
      },

      async loadFromStorage(): Promise<void> {
        const loginInfo = (await storageApi.getItem('loginInfo')) as LoginInfo | null;
        // No session — nothing to load, and no token to load it with. Without this the
        // login page fires an anonymous bootstrap whose late failure wipes the real one.
        if (!loginInfo) return;

        const primaryRole = loginInfo?.user?.primaryRole;

        if (isHostLogin(loginInfo)) {
          const hostRoleId = loginInfo?.hostRole?.hostRoleId;
          // Only the seeded platform-owner role keeps implicit full access.
          const isSuperAdmin = hostRoleId === SUPER_ADMIN_HOST_ROLE_ID;
          // `catalogLoaded` without a request: the catalog is the *institution* module list, so a host
          // has no institution to fetch it for — the call would 403 and toast on every host login.
          // Host ids come from the grant matrix instead, via the fallback in `identifiersOf`.
          patchState(store, { isHostSession: true, isSuperAdmin, catalogLoaded: true });

          if (isSuperAdmin) return;

          loadPromise = runHostLoad(hostRoleId, loginInfo?.hostUser?.hostUserId);
          return;
        }

        const isSuperAdmin = [primaryRole?.roleName, primaryRole?.roleTypeName].some(
          (name) => name?.trim().toLowerCase() === SUPER_ADMIN_ROLE_NAME,
        );
        patchState(store, { isHostSession: false, isSuperAdmin });

        // Institution sessions only. Not awaited — callers use `ensureCatalogLoaded()`.
        void loadModuleCatalog();

        this.load(primaryRole?.roleId);
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadFromStorage();
    },
  }),
);

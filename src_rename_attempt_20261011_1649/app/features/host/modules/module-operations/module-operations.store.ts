import { computed, DestroyRef, inject } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { catchError, finalize, map, of, tap } from 'rxjs';

import { Common, ModuleOperationApi, ModuleTree, ModuleTreeReader } from '@core/services';
import {
  DEFAULT_MODULE_SCOPE_KEY,
  ModuleOperationRow,
  ModuleScopeKey,
  moduleScopeValue,
} from '@shared/interfaces';

export interface ModuleOperationFilterOption {
  label: string;
  value: number;
}

/** What the grid needs to know about a module the mappings point at. */
export interface ScopedModule {
  label: string;
  isLeafNode: boolean;
}

interface ModuleOperationsState {
  moduleOperations: ModuleOperationRow[];
  moduleScopeKey: ModuleScopeKey;
  moduleId: number | null;
  operationId: number | null;
  isActive: boolean | null;
  /** `catchError` swaps a failed scope read for an empty tree, which the grid cannot tell apart
   * from a scope that genuinely holds no modules. */
  scopeReadFailed: boolean;
}

const initialState: ModuleOperationsState = {
  moduleOperations: [],
  moduleScopeKey: DEFAULT_MODULE_SCOPE_KEY,
  moduleId: null,
  operationId: null,
  isActive: null,
  scopeReadFailed: false,
};

/** Distinct filter options taken from the loaded rows — `get-all` accepts no filter params. */
function toFilterOptions(
  rows: ModuleOperationRow[],
  idOf: (row: ModuleOperationRow) => number,
  nameOf: (row: ModuleOperationRow) => string | null | undefined,
): ModuleOperationFilterOption[] {
  const options = new Map<number, string>();
  for (const row of rows) {
    const id = idOf(row);
    options.set(id, nameOf(row) || `#${id}`);
  }
  return [...options]
    .map(([value, label]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export const ModuleOperationsStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const moduleOperationApi = inject(ModuleOperationApi);
    const moduleTreeReader = inject(ModuleTreeReader);
    const commonService = inject(Common);

    /** `get-all` takes no params, so filters are applied client-side and refresh is a reload. */
    const moduleOperationsResource = rxResource({
      stream: () =>
        moduleOperationApi.getModuleOperations().pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, { moduleOperations: res.isSucceeded ? (res.data ?? []) : [] });
          }),
          map((res) => res.data ?? []),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { moduleOperations: [] });
            return of([] as ModuleOperationRow[]);
          }),
        ),
    });

    /**
     * A mapping row carries no scope of its own, so the scope filter runs off the modules that
     * belong to the chosen scope. Inactive modules are kept — a mapping on one must still be
     * reachable from the grid. Only the scope reaches the network: `institution` and `common` share
     * `moduleScope: 1`, so switching between them must not refetch the same tree.
     */
    const scopedModulesResource = rxResource({
      params: () => moduleScopeValue(store.moduleScopeKey()),
      stream: ({ params: moduleScope }) =>
        moduleTreeReader.readScope(moduleScope).pipe(
          tap(() => patchState(store, { scopeReadFailed: false })),
          // `handleError` rethrows; an errored resource makes `value()` throw, which aborts change
          // detection for the whole grid — not just this dropdown.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { scopeReadFailed: true });
            return of({ headers: [], leaves: [], unreadHeaderIds: [] } as ModuleTree);
          }),
        ),
    });

    return { moduleOperationsResource, scopedModulesResource };
  }),
  withComputed(
    ({
      moduleOperations,
      moduleScopeKey,
      moduleId,
      operationId,
      isActive,
      moduleOperationsResource,
      scopedModulesResource,
    }) => {
      const scopedModules = computed(() => {
        const tree = scopedModulesResource.value() ?? {
          headers: [],
          leaves: [],
          unreadHeaderIds: [],
        };
        // `Common` shares its scope with `Institution User`, so it is narrowed here instead.
        const isCommon = moduleScopeKey() === 'common';
        const narrow = <T extends { isCommonMenu: boolean }>(rows: T[]) =>
          isCommon ? rows.filter((row) => row.isCommonMenu) : rows;

        const modules = new Map<number, ScopedModule>();
        for (const module of narrow(tree.headers)) {
          modules.set(module.id, { label: module.displayName, isLeafNode: module.isLeafNode });
        }
        for (const module of narrow(tree.leaves)) {
          modules.set(module.id, {
            label: module.parentModule
              ? `${module.parentModule.displayName} › ${module.displayName}`
              : module.displayName,
            isLeafNode: module.isLeafNode,
          });
        }
        return modules;
      });

      /** The scope is a filter of its own, so it is deliberately not counted here. */
      const hasDropdownFilters = computed(
        () => moduleId() !== null || operationId() !== null || isActive() !== null,
      );

      return {
        scopedModules,
        /** A partially read tree hides rows, but — unlike a failed read — not necessarily all of
         *  them, so the grid says so without claiming the whole scope failed. */
        hasUnreadModules: computed(
          () => (scopedModulesResource.value()?.unreadHeaderIds.length ?? 0) > 0,
        ),
        hasDropdownFilters,
        /**
         * Rows the scope gate alone removed. Reported only while the dropdowns are clear: with one
         * of them set, the empty grid is that filter's doing, and blaming the scope would send the
         * user to a control that cannot fix it.
         */
        hiddenByScopeCount: computed(() => {
          if (hasDropdownFilters()) {
            return 0;
          }
          const modules = scopedModules();
          return moduleOperations().filter((row) => !modules.has(row.moduleId)).length;
        }),
        /**
         * Every row is gated on the scoped lookup, so the grid is not ready until that has landed
         * too — without this it paints "no records" while the tree is still being reassembled.
         */
        isLoading: computed(
          () => moduleOperationsResource.isLoading() || scopedModulesResource.isLoading(),
        ),
        isLoadingScopedModules: computed(() => scopedModulesResource.isLoading()),
        /** Modules in scope, whether or not a mapping points at them yet. */
        moduleOptions: computed(() =>
          [...scopedModules()]
            .map(([value, module]) => ({ label: module.label, value }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        ),
        operationOptions: computed(() =>
          toFilterOptions(
            moduleOperations(),
            (row) => row.operationId,
            (row) => row.operationName,
          ),
        ),
        filteredModuleOperations: computed(() => {
          const modules = scopedModules();
          const module = moduleId();
          const operation = operationId();
          const active = isActive();
          return moduleOperations().filter(
            (row) =>
              modules.has(row.moduleId) &&
              (module === null || row.moduleId === module) &&
              (operation === null || row.operationId === operation) &&
              (active === null || row.isActive === active),
          );
        }),
      };
    },
  ),
  withMethods((store) => {
    const moduleOperationApi = inject(ModuleOperationApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the delete button. */
    const setDeleting = (id: number, isDeleting: boolean) =>
      patchState(store, {
        moduleOperations: store
          .moduleOperations()
          .map((row) => (row.id === id ? { ...row, isDeleting } : row)),
      });

    return {
      /** Modules are scope-specific, so the module filter cannot outlive a scope change. */
      setModuleScopeKey(moduleScopeKey: ModuleScopeKey | null): void {
        patchState(store, {
          moduleScopeKey: moduleScopeKey ?? DEFAULT_MODULE_SCOPE_KEY,
          moduleId: null,
        });
      },

      setModuleId(moduleId: number | null): void {
        patchState(store, { moduleId: moduleId ?? null });
      },

      setOperationId(operationId: number | null): void {
        patchState(store, { operationId: operationId ?? null });
      },

      setIsActive(isActive: boolean | null): void {
        patchState(store, { isActive: isActive ?? null });
      },

      reloadModuleOperations(): void {
        store.moduleOperationsResource.reload();
      },

      deleteModuleOperation(moduleOperation: ModuleOperationRow): void {
        setDeleting(moduleOperation.id, true);

        moduleOperationApi
          .deleteModuleOperation(moduleOperation.id)
          .pipe(
            finalize(() => setDeleting(moduleOperation.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, {
                  moduleOperations: store
                    .moduleOperations()
                    .filter((row) => row.id !== moduleOperation.id),
                });
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);

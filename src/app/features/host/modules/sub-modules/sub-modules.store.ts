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

import { Common, ParentModuleApi, SubModuleApi } from '@core/services';
import {
  DEFAULT_MODULE_SCOPE_KEY,
  flattenModuleHeaders,
  ModuleHeaderRow,
  ModuleScopeKey,
  moduleScopeValue,
  SubModuleRow,
} from '@shared/interfaces';

interface SubModulesState {
  modules: SubModuleRow[];
  moduleScopeKey: ModuleScopeKey;
  parentModuleId: number | null;
  isActive: boolean | null;
}

/** `/ChildModule/list` returns nothing when `moduleScope` is omitted, so the grid opens on Institution. */
const initialState: SubModulesState = {
  modules: [],
  moduleScopeKey: DEFAULT_MODULE_SCOPE_KEY,
  parentModuleId: null,
  isActive: null,
};

export const SubModulesStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const subModuleApi = inject(SubModuleApi);
    const parentModuleApi = inject(ParentModuleApi);
    const commonService = inject(Common);

    const subModulesResource = rxResource({
      params: () => ({
        moduleScope: moduleScopeValue(store.moduleScopeKey()),
        parentModuleId: store.parentModuleId(),
        isActive: store.isActive(),
      }),
      stream: ({ params }) =>
        subModuleApi.getSubModules(params).pipe(
          tap((res) => {
            if (!res.isSucceeded) {
              commonService.showMessage(res.message, 'error');
            }
            patchState(store, { modules: res.isSucceeded ? (res.data ?? []) : [] });
          }),
          map((res) => res.data ?? []),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { modules: [] });
            return of([] as SubModuleRow[]);
          }),
        ),
    });

    /** Feeds the Parent Header filter dropdown — a child module can hang off a header or a sub-header. */
    const parentOptionsResource = rxResource({
      params: () => ({ ModuleScope: moduleScopeValue(store.moduleScopeKey()) }),
      stream: ({ params }) =>
        parentModuleApi.getModuleHeaders({ ModuleScope: params.ModuleScope }).pipe(
          map((res) =>
            res.isSucceeded ? flattenModuleHeaders(res.data ?? []) : ([] as ModuleHeaderRow[]),
          ),
          // `handleError` rethrows; an errored resource makes `value()` throw, which aborts
          // change detection for the whole grid — not just this dropdown.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            return of([] as ModuleHeaderRow[]);
          }),
        ),
    });

    return { subModulesResource, parentOptionsResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.subModulesResource.isLoading()),
    parentOptions: computed(() => store.parentOptionsResource.value() ?? []),
    isLoadingParentOptions: computed(() => store.parentOptionsResource.isLoading()),
    /**
     * `Common` shares `moduleScope: 1` with `Institution User` and the list endpoint has no
     * `isCommonMenu` param, so the subset is carved out here rather than in the template.
     */
    visibleModules: computed(() =>
      store.moduleScopeKey() === 'common'
        ? store.modules().filter((module) => module.isCommonMenu)
        : store.modules(),
    ),
  })),
  withMethods((store) => {
    const subModuleApi = inject(SubModuleApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        modules: store.modules().map((m) => (m.id === id ? { ...m, isUpdatingStatus } : m)),
      });

    return {
      /** Parents are scope-specific, so the parent filter cannot outlive a scope change. */
      setModuleScopeKey(moduleScopeKey: ModuleScopeKey | null): void {
        patchState(store, {
          moduleScopeKey: moduleScopeKey ?? DEFAULT_MODULE_SCOPE_KEY,
          parentModuleId: null,
        });
      },

      setParentModuleId(parentModuleId: number | null): void {
        patchState(store, { parentModuleId: parentModuleId ?? null });
      },

      setIsActive(isActive: boolean | null): void {
        patchState(store, { isActive: isActive ?? null });
      },

      reloadSubModules(): void {
        store.subModulesResource.reload();
      },

      toggleActive(module: SubModuleRow): void {
        const isActive = !module.isActive;
        setUpdatingStatus(module.id, true);

        subModuleApi
          .setSubModuleStatus(module.id, { moduleScope: module.moduleScope, isActive })
          .pipe(
            finalize(() => setUpdatingStatus(module.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                // The row drops out when it no longer matches the active filter.
                patchState(store, {
                  modules:
                    store.isActive() === null
                      ? store.modules().map((m) => (m.id === module.id ? { ...m, isActive } : m))
                      : store.modules().filter((m) => m.id !== module.id),
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

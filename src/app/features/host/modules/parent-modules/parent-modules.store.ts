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

import { Common, ModuleTreeReader, ParentModuleApi } from '@core/services';
import {
  DEFAULT_MODULE_SCOPE_KEY,
  ModuleRow,
  ModuleScopeKey,
  moduleScopeValue,
} from '@shared/interfaces';

interface ParentModulesState {
  modules: ModuleRow[];
  moduleScopeKey: ModuleScopeKey;
  isActive: boolean | null;
}

/** The module endpoints return nothing when the scope is omitted, so the grid opens on Institution. */
const initialState: ParentModulesState = {
  modules: [],
  moduleScopeKey: DEFAULT_MODULE_SCOPE_KEY,
  isActive: null,
};

export const ParentModulesStore = signalStore(
  withState(initialState),
  withProps((store) => {
    const moduleTreeReader = inject(ModuleTreeReader);
    const commonService = inject(Common);

    // Only the scope reaches the network. The status filter is applied to the reassembled tree —
    // `get-module-headers` cannot answer for inactive rows — so flipping it must not refetch.
    const parentModulesResource = rxResource({
      params: () => moduleScopeValue(store.moduleScopeKey()),
      stream: ({ params: moduleScope }) =>
        moduleTreeReader.readScope(moduleScope).pipe(
          // A header the read-back missed is simply absent — say so rather than let it read as
          // "this module does not exist".
          tap(({ unreadHeaderIds }) => {
            const missing = unreadHeaderIds.length;
            if (missing > 0) {
              commonService.showMessage(
                `${missing} module${missing > 1 ? 's' : ''} could not be loaded and ${missing > 1 ? 'are' : 'is'} missing from the list.`,
                'warn',
              );
            }
          }),
          map(({ headers }) => headers),
          tap((modules) => patchState(store, { modules })),
          // `handleError` rethrows, so without this the grid keeps stale rows and says nothing.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            patchState(store, { modules: [] });
            return of([] as ModuleRow[]);
          }),
        ),
    });

    return { parentModulesResource };
  }),
  withComputed((store) => {
    /** The API scopes Institution, Host and Common independently; only status is local. */
    const visibleModules = computed(() => {
      const isActive = store.isActive();
      return store.modules().filter((module) => isActive === null || module.isActive === isActive);
    });

    return {
      isLoading: computed(() => store.parentModulesResource.isLoading()),
      visibleModules,
      /** A sub-header the filters left without its parent must not sit indented under nothing. */
      indentedModuleIds: computed(() => {
        const visible = visibleModules();
        const shown = new Set(visible.map((module) => module.id));
        return new Set(
          visible
            .filter((module) => module.parentModuleId !== null && shown.has(module.parentModuleId))
            .map((module) => module.id),
        );
      }),
    };
  }),
  withMethods((store) => {
    const parentModuleApi = inject(ParentModuleApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    /** Drives the per-row spinner on the status toggle button. */
    const setUpdatingStatus = (id: number, isUpdatingStatus: boolean) =>
      patchState(store, {
        modules: store.modules().map((m) => (m.id === id ? { ...m, isUpdatingStatus } : m)),
      });

    return {
      setModuleScopeKey(moduleScopeKey: ModuleScopeKey | null): void {
        patchState(store, { moduleScopeKey: moduleScopeKey ?? DEFAULT_MODULE_SCOPE_KEY });
      },

      setIsActive(isActive: boolean | null): void {
        patchState(store, { isActive: isActive ?? null });
      },

      reloadParentModules(): void {
        store.parentModulesResource.reload();
      },

      /** Nested sub-headers are ParentModule rows too — `/ChildModule/{id}` has no answer for them. */
      toggleActive(module: ModuleRow): void {
        const isActive = !module.isActive;
        setUpdatingStatus(module.id, true);

        parentModuleApi
          .setParentModuleStatus(module.id, { moduleScope: module.moduleScope, isActive })
          .pipe(
            finalize(() => setUpdatingStatus(module.id, false)),
            takeUntilDestroyed(destroyRef),
          )
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                // `visibleModules` drops the row if it no longer matches the status filter.
                patchState(store, {
                  modules: store
                    .modules()
                    .map((m) => (m.id === module.id ? { ...m, isActive } : m)),
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

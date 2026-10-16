import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { finalize } from 'rxjs';

import {
  buildFeaturePageIndex,
  canPerformIn,
  canPerformOrUnknownIn,
  displayNameFrom,
  identifiersFrom,
  isKnownModuleIn,
  ModuleCodeCandidates,
  resolveModuleCodeIn,
} from '@core/feature-page-identifiers';
import { FeaturePageApi } from '@core/services/feature-page-api';
import { StorageApi } from '@core/services/storage-api';
import { FeaturePageNode, ModuleOperationIds } from '@shared/interfaces';

const FEATURE_PAGES_KEY = 'feature-pages';

/**
 * Bump when `FeaturePageNode` changes shape — an older payload is discarded, not migrated. Also
 * bumped when the backend renames a `moduleCode`: the interceptor stamps ids off the hydrated tree
 * before revalidation, so a pre-rename cache would send the old module's id (4: the
 * `INSTITUTION_POLICY_HOLIDAY` rename, 2026-09-23; 5: institution Department,
 * Position and Role leaves moved to their canonical module codes, 2026-10-12).
 */
const CACHE_VERSION = 5;

interface FeaturePageCache {
  version: number;
  fetchedAt: number;
  data: FeaturePageNode[];
}

interface FeaturePageState {
  nodes: FeaturePageNode[];
  isLoading: boolean;
  /** True once nodes came from anywhere — cache or network. */
  isLoaded: boolean;
  hasLoadFailed: boolean;
  errorMessage: string | null;
  /** Epoch ms of the payload currently in `nodes`. */
  fetchedAt: number | null;
}

const initialState: FeaturePageState = {
  nodes: [],
  isLoading: false,
  isLoaded: false,
  hasLoadFailed: false,
  errorMessage: null,
  fetchedAt: null,
};

function hasStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

function readCache(storageApi: StorageApi): FeaturePageCache | null {
  if (!hasStorage()) return null;
  const raw = localStorage.getItem(storageApi.prefixKey(FEATURE_PAGES_KEY));
  if (!raw) return null;
  try {
    const cache = JSON.parse(raw) as FeaturePageCache;
    if (cache?.version !== CACHE_VERSION || !Array.isArray(cache.data)) return null;
    return cache;
  } catch {
    /* ignore malformed persisted state */
    return null;
  }
}

function persist(storageApi: StorageApi, cache: FeaturePageCache): void {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(storageApi.prefixKey(FEATURE_PAGES_KEY), JSON.stringify(cache));
  } catch (err) {
    // A full or blocked quota must not break the menu that is already rendering.
    console.error('Error caching feature pages:', err);
  }
}

/**
 * The caller's own navigation tree, cached in `localStorage` and served stale-while-revalidate.
 *
 * A cached tree always paints first, with no request wait and no skeleton, and a refresh always
 * runs behind it. A failed refresh deliberately leaves `nodes` alone, so a background failure never
 * blanks a sidebar that is already rendering — which is also why the cache carries no expiry: a
 * user offline for a week keeps their last known menu rather than an empty one.
 */
export const FeaturePageStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ nodes, isLoading, isLoaded, hasLoadFailed }) => ({
    hasMenu: computed(() => nodes().length > 0),
    /** First load only — a background revalidate keeps the existing tree on screen. */
    showSkeleton: computed(() => isLoading() && !isLoaded()),
    /** Terminal failure: nothing cached, nothing fetched. */
    hasError: computed(() => hasLoadFailed() && !isLoaded()),
    /**
     * `moduleCode` → `{ moduleId, operationIds }`, rebuilt only when `nodes` changes.
     *
     * Memoised because `moduleOperationInterceptor` reads it on every outgoing StaffMember request,
     * and derived from `nodes()` so `clear()` empties it for free — one institution's ids can never
     * leak into the next session.
     */
    moduleIndex: computed(() => buildFeaturePageIndex(nodes())),
  })),
  withMethods(
    (
      store,
      featurePageApi = inject(FeaturePageApi),
      storageApi = inject(StorageApi),
      destroyRef = inject(DestroyRef),
    ) => {
      // De-dupes concurrent callers the way `CurrentUserPermissionsStore` does.
      let loadPromise: Promise<void> | null = null;

      const fail = (message?: string): void => {
        // `nodes` and `isLoaded` stay untouched — that is the point of stale-while-revalidate.
        patchState(store, {
          hasLoadFailed: true,
          errorMessage: message || 'Could not load the menu.',
        });
      };

      const run = (): Promise<void> =>
        new Promise<void>((resolve) => {
          patchState(store, { isLoading: true });
          featurePageApi
            .getFeaturePages()
            // `finalize` also fires on unsubscribe, so a source that completes without emitting
            // can never leave an awaiting caller hanging.
            .pipe(
              finalize(() => resolve()),
              takeUntilDestroyed(destroyRef),
            )
            .subscribe({
              next: (res) => {
                if (!res?.isSucceeded) {
                  fail(res?.message);
                  return;
                }
                const nodes = res.data?.items ?? [];
                const fetchedAt = Date.now();
                patchState(store, {
                  nodes,
                  isLoaded: true,
                  hasLoadFailed: false,
                  errorMessage: null,
                  fetchedAt,
                });
                if (nodes.length) {
                  persist(storageApi, { version: CACHE_VERSION, fetchedAt, data: nodes });
                } else if (hasStorage()) {
                  // Not persisted — an empty menu is likelier a backend hiccup than a real answer,
                  // and caching one hands the next boot a hydrated tree with nothing in it. Still
                  // has to invalidate, or a user whose modules were revoked hydrates the tree they
                  // just lost and the interceptor reads its ids.
                  localStorage.removeItem(storageApi.prefixKey(FEATURE_PAGES_KEY));
                }
              },
              error: (err: unknown) => fail(err instanceof Error ? err.message : undefined),
            });
        }).finally(() => {
          patchState(store, { isLoading: false });
          // Dropped unconditionally so a failure is retried on the next call rather than
          // resolving instantly against a dead promise.
          loadPromise = null;
        });

      const load = (): Promise<void> => (loadPromise ??= run());

      return {
        /** Always fetches. Used at login so a new session never inherits the previous menu. */
        load,

        /**
         * Revalidates on every call, de-duped onto one in-flight request.
         *
         * `my-menu` is permission-filtered per session, so a cached tree is one user's
         * authorisation snapshot, not a static catalog: a grant made after it was written must
         * reach the next boot, not wait out a TTL. The cache still paints first — hydration sets
         * `isLoaded`, which keeps `showSkeleton` false while this refresh runs behind it.
         */
        ensureLoaded(): Promise<void> {
          return loadPromise ?? load();
        },

        /**
         * Resolves once a tree is in hand, without revalidating one that already is.
         *
         * For feature stores that only need ids before a request goes out. `ensureLoaded()` would
         * refetch `my-menu` alongside every list query — once per search keystroke. Same rule as
         * `moduleOperationInterceptor`: a stale tree still resolves the right ids, and the aside
         * menu owns revalidation.
         */
        whenLoaded(): Promise<void> {
          return store.isLoaded() ? Promise.resolve() : (loadPromise ?? load());
        },

        /**
         * The `ModuleId` / `OperationId` a request must carry.
         *
         * Keyed on `FeaturePageNode.moduleCode`, deliberately NOT on the institution module catalog's
         * `moduleName` that `CurrentUserPermissionsStore.identifiersOf()` takes. Those are two
         * different id spaces, and the differing method names are what keep them apart.
         *
         * Several codes may be named for one endpoint — see `ModuleCodeCandidates`.
         */
        moduleOperationIds(
          moduleCode: ModuleCodeCandidates,
          operationName: string,
        ): ModuleOperationIds {
          return identifiersFrom(store.moduleIndex(), moduleCode, operationName);
        },

        /** Which of the candidate codes this session's tree answered with. For reporting — pass the
         *  same operation `moduleOperationIds` was given, or the two can name different codes. */
        resolvedModuleCode(moduleCode: ModuleCodeCandidates, operationName?: string): string {
          return resolveModuleCodeIn(store.moduleIndex(), moduleCode, operationName);
        },

        /** The module appears in this session's tree at all. */
        isKnownModule(moduleCode: ModuleCodeCandidates): boolean {
          return isKnownModuleIn(store.moduleIndex(), moduleCode);
        },

        /** The backend's label for this page, or `undefined` if `my-menu` doesn't publish
         *  `moduleCode` yet. Callers fall back to their existing hardcoded title. */
        displayNameOf(moduleCode: ModuleCodeCandidates): string | undefined {
          return displayNameFrom(store.moduleIndex(), moduleCode);
        },

        /**
         * Hard gate on a granted operation, keyed on `moduleCode`.
         *
         * Denies when the tree does not publish the module. Prefer `canPerformOrUnknown` for UI
         * unless the module is known to be published for every session that reaches the screen.
         */
        canPerform(moduleCode: ModuleCodeCandidates, operationName: string): boolean {
          return canPerformIn(store.moduleIndex(), moduleCode, operationName);
        },

        /** Soft gate: an unpublished module stays visible. The idiom pages should reach for. */
        canPerformOrUnknown(moduleCode: ModuleCodeCandidates, operationName: string): boolean {
          return canPerformOrUnknownIn(store.moduleIndex(), moduleCode, operationName);
        },

        /** Retry after a failure. */
        refresh(): Promise<void> {
          return load();
        },

        /** Logout: drop the in-memory tree as well as the cache. */
        clear(): void {
          loadPromise = null;
          patchState(store, initialState);
          if (hasStorage()) localStorage.removeItem(storageApi.prefixKey(FEATURE_PAGES_KEY));
        },
      };
    },
  ),
  withHooks({
    onInit(store, storageApi = inject(StorageApi)) {
      const cache = readCache(storageApi);
      if (!cache) return;
      // Hydrate only. Fetching is left to the explicit `load` / `ensureLoaded` call sites, so the
      // login page never fires an anonymous request.
      patchState(store, {
        nodes: cache.data,
        isLoaded: true,
        fetchedAt: cache.fetchedAt ?? null,
      });
    },
  }),
);

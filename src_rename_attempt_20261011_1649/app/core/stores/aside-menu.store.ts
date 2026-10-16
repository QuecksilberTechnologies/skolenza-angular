import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';

import { StorageApi } from '@core/services/storage-api';

const EXPANDED_STATE_KEY = 'sidebar-expanded';

interface AsideMenuState {
  searchTerm: string;
  expandedIds: string[];
}

const initialState: AsideMenuState = {
  searchTerm: '',
  expandedIds: [],
};

function hasStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

function persist(storageApi: StorageApi, ids: string[]): void {
  if (!hasStorage()) return;
  localStorage.setItem(storageApi.prefixKey(EXPANDED_STATE_KEY), JSON.stringify(ids));
}

export const AsideMenuStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ searchTerm }) => ({
    normalizedSearch: computed(() => searchTerm().trim().toLowerCase()),
    hasSearch: computed(() => searchTerm().trim().length > 0),
  })),
  withMethods((store, storageApi = inject(StorageApi)) => ({
    setSearch(term: string): void {
      patchState(store, { searchTerm: term });
    },

    isExpanded(id: string | undefined): boolean {
      return !!id && store.expandedIds().includes(id);
    },

    /** Accordion: collapse siblings at this level, toggle the clicked item. */
    toggleExpand(id: string | undefined, siblingIds: string[] = []): void {
      if (!id) return;
      const current = store.expandedIds();
      const isOpen = current.includes(id);
      const withoutSiblings = current.filter((x) => !siblingIds.includes(x));
      const next = isOpen ? withoutSiblings : [...withoutSiblings, id];
      patchState(store, { expandedIds: next });
      persist(storageApi, next);
    },

    /** Ensure the given ancestor ids are expanded (active-child auto-expand). */
    expandPath(ids: string[]): void {
      if (!ids.length) return;
      const current = store.expandedIds();
      const missing = ids.filter((id) => !current.includes(id));
      if (!missing.length) return;
      const next = [...current, ...missing];
      patchState(store, { expandedIds: next });
      persist(storageApi, next);
    },
  })),
  withHooks({
    onInit(store, storageApi = inject(StorageApi)) {
      if (!hasStorage()) return;
      const raw = localStorage.getItem(storageApi.prefixKey(EXPANDED_STATE_KEY));
      if (!raw) return;
      try {
        const ids = JSON.parse(raw);
        if (Array.isArray(ids)) patchState(store, { expandedIds: ids });
      } catch {
        /* ignore malformed persisted state */
      }
    },
  }),
);

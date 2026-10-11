import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';

import { StorageApi } from '@core/services/storage-api';

const SIDEBAR_STATE_KEY = 'sidebar-collapsed';

interface LayoutState {
  sidebarCollapsed: boolean;
}

const initialState: LayoutState = {
  sidebarCollapsed: false,
};

export const LayoutStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, storageApi = inject(StorageApi)) => ({
    toggleSidebar(): void {
      const collapsed = !store.sidebarCollapsed();
      patchState(store, { sidebarCollapsed: collapsed });
      localStorage.setItem(storageApi.prefixKey(SIDEBAR_STATE_KEY), String(collapsed));
    },

    collapseSidebar(): void {
      patchState(store, { sidebarCollapsed: true });
      localStorage.setItem(storageApi.prefixKey(SIDEBAR_STATE_KEY), 'true');
    },

    hideSidebar(): void {
      patchState(store, { sidebarCollapsed: false });
      localStorage.setItem(storageApi.prefixKey(SIDEBAR_STATE_KEY), 'false');
    },
  })),
  withHooks({
    onInit(store, storageApi = inject(StorageApi)) {
      const collapsed = localStorage.getItem(storageApi.prefixKey(SIDEBAR_STATE_KEY)) === 'true';
      patchState(store, { sidebarCollapsed: collapsed });
    },
  }),
);

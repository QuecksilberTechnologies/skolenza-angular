import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';

import { SuperAdminDashboardApi } from '@core/services';

import { widgetResource } from '../../widget-resource';

/** How many rows the card lists under the counts. */
const PREVIEW_ROW_COUNT = 5;

export const LocationsCardStore = signalStore(
  withProps(() => {
    const dashboardApi = inject(SuperAdminDashboardApi);

    // The server counts total, active and head-office rows and caps the list, so one small read
    // covers the whole card.
    const locationsResource = widgetResource(() =>
      dashboardApi.getLocations({ limit: PREVIEW_ROW_COUNT }),
    );

    return { locationsResource };
  }),
  withComputed((store) => ({
    isLoading: computed(() => store.locationsResource.isLoading()),
    totalCount: computed(() => store.locationsResource.value()?.total ?? 0),
    activeCount: computed(() => store.locationsResource.value()?.active ?? 0),
    headOfficeCount: computed(() => store.locationsResource.value()?.headOffice ?? 0),
    topLocations: computed(() => store.locationsResource.value()?.locations ?? []),
  })),
  withMethods((store) => ({
    reloadLocations(): void {
      store.locationsResource.reload();
    },
  })),
);

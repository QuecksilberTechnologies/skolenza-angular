import { computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStoreFeature,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { catchError, finalize, map, of } from 'rxjs';

import { RoleDashboardApi } from '@core/services';
import { RoleDashboardCode, RoleDashboardData } from '@shared/interfaces';

interface RoleDashboardResult {
  data: RoleDashboardData | null;
  failed: boolean;
}

/**
 * One `GET /Dashboard/{code}` read for a role type's whole dashboard. A failure resolves to
 * `null` data plus `hasError`, so the page can tell an outage apart from a genuinely empty
 * dashboard instead of every card claiming "no data".
 *
 * `Section` names the page's refreshable cards, so a mistyped key fails to compile instead of
 * silently never showing that card's spinner.
 */
export function withRoleDashboard<Section extends string = string>(code: RoleDashboardCode) {
  return signalStoreFeature(
    // The card whose refresh started the current reload; null means the whole page.
    withState({ refreshingSection: null as Section | null }),
    withProps((store) => {
      const api = inject(RoleDashboardApi);

      return {
        dashboardResource: rxResource<RoleDashboardResult, void>({
          defaultValue: { data: null, failed: false },
          stream: () =>
            api.getDashboard(code).pipe(
              map((res) =>
                res.isSucceeded
                  ? { data: res.data ?? null, failed: false }
                  : { data: null, failed: true },
              ),
              catchError(() => of({ data: null, failed: true })),
              // back to page-wide, so a later load not started by a card spins every card
              finalize(() => patchState(store, { refreshingSection: null })),
            ),
        }),
      };
    }),
    withComputed((store) => ({
      dashboard: computed(() => store.dashboardResource.value().data),
      hasError: computed(() => store.dashboardResource.value().failed),
      isLoading: computed(() => store.dashboardResource.isLoading()),
    })),
    withMethods((store) => ({
      /**
       * One call serves every card, so any refresh reloads them all; passing the card's section
       * keeps the spinner on that card instead of spinning every card on the page.
       */
      reload: (section: Section | null = null) => {
        patchState(store, { refreshingSection: section });
        store.dashboardResource.reload();
      },
      /** Loading as one card sees it: the first load, a page reload, or its own refresh. */
      isSectionLoading: (section: Section) =>
        store.isLoading() &&
        (store.refreshingSection() === null || store.refreshingSection() === section),
    })),
  );
}

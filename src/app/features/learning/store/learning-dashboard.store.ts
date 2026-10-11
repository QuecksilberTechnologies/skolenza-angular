import { computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { catchError, map, of, tap } from 'rxjs';

import { Common, LearningDashboardApi } from '@core/services';
import { LearningDashboard } from '@shared/interfaces';

export const LearningDashboardStore = signalStore(
  withProps(() => {
    const dashboardApi = inject(LearningDashboardApi);
    const commonService = inject(Common);

    const dashboardResource = rxResource({
      stream: () =>
        dashboardApi.getDashboard().pipe(
          tap((res) => {
            if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
          }),
          map((res) => (res.isSucceeded ? res.data : null)),
          // `handleError` rethrows; an errored resource makes `value()` throw, which aborts
          // change detection for the whole view — not just this control.
          catchError((err) => {
            commonService.showMessage(err.message, 'error');
            return of(null);
          }),
        ),
    });

    return { dashboardResource };
  }),
  withComputed(({ dashboardResource }) => {
    const dashboard = computed<LearningDashboard | null>(() => dashboardResource.value() ?? null);
    return {
      isLoading: computed(() => dashboardResource.isLoading()),
      dashboard,
      kpis: computed(() => dashboard()?.kpis ?? null),
      continueLearning: computed(() => dashboard()?.continueLearning ?? []),
      recommended: computed(() => dashboard()?.recommended ?? []),
      recentCertificates: computed(() => dashboard()?.recentCertificates ?? []),
      upcomingDeadlines: computed(() => dashboard()?.upcomingDeadlines ?? []),
    };
  }),
  withMethods((store) => ({
    reload: (): void => {
      store.dashboardResource.reload();
    },
  })),
);

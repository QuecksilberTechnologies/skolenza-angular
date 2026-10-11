import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { finalize, forkJoin } from 'rxjs';

import { Common, PerformanceManagementApi } from '@core/services';
import { ChartSeries, Feedback, Goal, GOAL_CATEGORIES, Review } from '@shared/interfaces';

interface DashboardState {
  goals: Goal[];
  reviews: Review[];
  feedback: Feedback[];
  /** Historical rating trend — not derivable, kept from mock JSON. */
  ratingTrend: ChartSeries | null;
  isLoading: boolean;
}

const initialState: DashboardState = {
  goals: [],
  reviews: [],
  feedback: [],
  ratingTrend: null,
  isLoading: false,
};

const round1 = (n: number): number => Math.round(n * 10) / 10;

export const PmsDashboardStore = signalStore(
  withState(initialState),
  withComputed(({ goals, reviews, feedback, ratingTrend }) => {
    /** KPIs derived live from goals/reviews/feedback. */
    const kpis = computed(() => {
      const rated = reviews().filter((r) => r.overallRating > 0);
      const avg = rated.length
        ? round1(rated.reduce((s, r) => s + r.overallRating, 0) / rated.length)
        : 0;
      return {
        activeGoals: goals().filter((g) => g.status !== 'Completed' && g.status !== 'Cancelled')
          .length,
        pendingReviews: reviews().filter((r) => r.status === 'Pending' || r.status === 'InReview')
          .length,
        completedReviews: reviews().filter((r) => r.status === 'Completed').length,
        feedbackReceived: feedback().length,
        averageRating: avg,
      };
    });

    /** Average goal progress grouped by category. */
    const goalProgress = computed<ChartSeries>(() => {
      const list = goals();
      const labels = [...GOAL_CATEGORIES];
      const values = labels.map((cat) => {
        const inCat = list.filter((g) => g.category === cat);
        if (!inCat.length) return 0;
        return Math.round(inCat.reduce((s, g) => s + g.progress, 0) / inCat.length);
      });
      return { labels, values };
    });

    return { kpis, goalProgress, ratingTrendSeries: computed(() => ratingTrend()) };
  }),
  withMethods((store) => {
    const api = inject(PerformanceManagementApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      loadDashboard(): void {
        patchState(store, { isLoading: true });
        forkJoin({
          goals: api.getGoals(),
          reviews: api.getReviews(),
          feedback: api.getFeedback(),
          dashboard: api.getDashboard(),
        })
          .pipe(
            takeUntilDestroyed(destroyRef),
            finalize(() => patchState(store, { isLoading: false })),
          )
          .subscribe({
            next: ({ goals, reviews, feedback, dashboard }) => {
              patchState(store, {
                goals: goals.isSucceeded ? goals.data : [],
                reviews: reviews.isSucceeded ? reviews.data : [],
                feedback: feedback.isSucceeded ? feedback.data : [],
                ratingTrend: dashboard.isSucceeded ? dashboard.data.ratingTrend : null,
              });
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);

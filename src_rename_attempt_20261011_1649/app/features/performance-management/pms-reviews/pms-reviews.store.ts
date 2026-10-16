import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { finalize } from 'rxjs';

import { Common, PerformanceManagementApi } from '@core/services';
import { PmsStatus, Review } from '@shared/interfaces';

interface ReviewsState {
  reviews: Review[];
  totalRecords: number;
  isLoading: boolean;
  statusFilter: PmsStatus | null;
}

const initialState: ReviewsState = {
  reviews: [],
  totalRecords: 0,
  isLoading: false,
  statusFilter: null,
};

export const PmsReviewsStore = signalStore(
  withState(initialState),
  withComputed(({ reviews, statusFilter }) => ({
    filteredReviews: computed(() => {
      const status = statusFilter();
      return status ? reviews().filter((r) => r.status === status) : reviews();
    }),
    pendingReviews: computed(
      () => reviews().filter((r) => r.status === 'Pending' || r.status === 'InReview').length,
    ),
    completedReviews: computed(() => reviews().filter((r) => r.status === 'Completed').length),
  })),
  withMethods((store) => {
    const api = inject(PerformanceManagementApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      loadReviews(): void {
        patchState(store, { isLoading: true, reviews: [] });
        api
          .getReviews()
          .pipe(
            takeUntilDestroyed(destroyRef),
            finalize(() => patchState(store, { isLoading: false })),
          )
          .subscribe({
            next: (res) => {
              patchState(store, {
                reviews: res.isSucceeded ? res.data : [],
                totalRecords: res.isSucceeded ? (res.totalRecords ?? res.data.length) : 0,
              });
              if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      setStatusFilter(status: PmsStatus | null): void {
        patchState(store, { statusFilter: status });
      },

      saveReview(review: Review): void {
        const exists = store.reviews().some((r) => r.id === review.id);
        api
          .saveReview(review)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, {
                  reviews: exists
                    ? store.reviews().map((r) => (r.id === review.id ? res.data : r))
                    : [res.data, ...store.reviews()],
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

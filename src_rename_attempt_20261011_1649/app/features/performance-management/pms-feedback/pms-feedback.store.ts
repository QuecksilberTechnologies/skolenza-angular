import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { finalize } from 'rxjs';

import { Common, PerformanceManagementApi } from '@core/services';
import { Feedback } from '@shared/interfaces';

interface FeedbackState {
  feedback: Feedback[];
  isLoading: boolean;
  /** Current user id — drives the give/receive split (mock). */
  currentUserId: string;
}

const initialState: FeedbackState = {
  feedback: [],
  isLoading: false,
  currentUserId: 'e-101',
};

export const PmsFeedbackStore = signalStore(
  withState(initialState),
  withComputed(({ feedback, currentUserId }) => ({
    received: computed(() => feedback().filter((f) => f.toId === currentUserId())),
    given: computed(() => feedback().filter((f) => f.fromId === currentUserId())),
    appreciationCount: computed(() => feedback().filter((f) => f.type === 'Appreciation').length),
  })),
  withMethods((store) => {
    const api = inject(PerformanceManagementApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      loadFeedback(): void {
        patchState(store, { isLoading: true, feedback: [] });
        api
          .getFeedback()
          .pipe(
            takeUntilDestroyed(destroyRef),
            finalize(() => patchState(store, { isLoading: false })),
          )
          .subscribe({
            next: (res) => {
              patchState(store, { feedback: res.isSucceeded ? res.data : [] });
              if (!res.isSucceeded) commonService.showMessage(res.message, 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      addFeedback(feedback: Feedback): void {
        api
          .saveFeedback(feedback)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, { feedback: [res.data, ...store.feedback()] });
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);

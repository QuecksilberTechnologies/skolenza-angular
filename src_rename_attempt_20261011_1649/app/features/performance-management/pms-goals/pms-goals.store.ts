import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { finalize } from 'rxjs';

import { Common, PerformanceManagementApi } from '@core/services';
import { Goal, PmsStatus } from '@shared/interfaces';

interface GoalsState {
  goals: Goal[];
  totalRecords: number;
  isLoading: boolean;
  statusFilter: PmsStatus | null;
}

const initialState: GoalsState = {
  goals: [],
  totalRecords: 0,
  isLoading: false,
  statusFilter: null,
};

export const PmsGoalsStore = signalStore(
  withState(initialState),
  withComputed(({ goals, statusFilter }) => ({
    filteredGoals: computed(() => {
      const status = statusFilter();
      return status ? goals().filter((g) => g.status === status) : goals();
    }),
    activeGoals: computed(
      () => goals().filter((g) => g.status !== 'Completed' && g.status !== 'Cancelled').length,
    ),
    /** Sum of weights — used for the ≤100% validation hint. */
    weightTotal: computed(() => goals().reduce((sum, g) => sum + (g.weight || 0), 0)),
  })),
  withMethods((store) => {
    const api = inject(PerformanceManagementApi);
    const commonService = inject(Common);
    const destroyRef = inject(DestroyRef);

    return {
      loadGoals(): void {
        patchState(store, { isLoading: true, goals: [] });
        api
          .getGoals()
          .pipe(
            takeUntilDestroyed(destroyRef),
            finalize(() => patchState(store, { isLoading: false })),
          )
          .subscribe({
            next: (res) => {
              patchState(store, {
                goals: res.isSucceeded ? res.data : [],
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

      /** Optimistic upsert (mock — no persistence). */
      saveGoal(goal: Goal): void {
        const exists = store.goals().some((g) => g.id === goal.id);
        // Warn (don't block) when total weight would exceed 100%.
        const projectedTotal = exists
          ? store.goals().reduce((s, g) => s + (g.id === goal.id ? goal.weight : g.weight), 0)
          : store.weightTotal() + goal.weight;
        if (projectedTotal > 100) {
          commonService.showMessage('Total goal weight exceeds 100%', 'warn');
        }
        api
          .saveGoal(goal)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, {
                  goals: exists
                    ? store.goals().map((g) => (g.id === goal.id ? res.data : g))
                    : [res.data, ...store.goals()],
                });
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },

      updateProgress(id: string, progress: number): void {
        const goal = store.goals().find((g) => g.id === id);
        if (!goal) return;
        const status: PmsStatus = progress >= 100 ? 'Completed' : goal.status;
        patchState(store, {
          goals: store.goals().map((g) => (g.id === id ? { ...g, progress, status } : g)),
        });
      },

      deleteGoal(id: string): void {
        api
          .deleteById(id)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (res) => {
              if (res.isSucceeded) {
                patchState(store, { goals: store.goals().filter((g) => g.id !== id) });
              }
              commonService.showMessage(res.message, res.isSucceeded ? 'success' : 'error');
            },
            error: (err) => commonService.showMessage(err.message, 'error'),
          });
      },
    };
  }),
);
